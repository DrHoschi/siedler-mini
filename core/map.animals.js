/* 
  core/map.animals.js
  v4.6-animals-reboot-2026-01-04

  Ziel (Stabilität):
  - Tiere (Reh/Fuchs + vorbereitet: Hase/Wildschwein) zuverlässig spawnen + bewegen.
  - Niemals Wasser betreten.
  - Dir/Frame-Mapping konsistent zum SpriteTest:
      Reihenfolge im Atlas: N → NE → E → SE → S → SW → W → NW
      Regel: Frame 0 = Idle (pro Richtung).
  - Spawn bevorzugt in „waldigen“ Bereichen (nähe Bäumen), aber mit Fallback,
    damit nie „keine Tiere“ passiert.

  Wichtig:
  - Wir nutzen die bestehenden globalen Systeme (CustomEvents cb:*).
  - KEINE harten Abhängigkeiten an Game/Renderer-Interna beim Script-Load,
    damit der Tab nicht wieder verschwindet, falls etwas nicht bereit ist.

  Debug:
  - Konsole: [animals] ... (nur info/warn; keine Crashes)
*/

(() => {
  'use strict';

  /* ---------------------------------------------
   * Logging (CBLog fallback)
   * ------------------------------------------- */
  const LOG = (window.CBLog && window.CBLog.info) ? window.CBLog.info.bind(window.CBLog) : console.info.bind(console);
  const WARN = (window.CBLog && window.CBLog.warn) ? window.CBLog.warn.bind(window.CBLog) : console.warn.bind(console);

  /* ---------------------------------------------
   * Tile / Terrain IDs (aus core/map.decorations.js)
   * ------------------------------------------- */
  const TILE = {
    WATER: 8, // wichtig: Wasser-TileId (siehe MapDecorations)
  };

  /* ---------------------------------------------
   * Species-Konfiguration
   * - scale wird pro Tier eingestellt (User: Reh 0.35, Fuchs 0.30)
   * - flipEW: falls Atlas "gefühlt" gespiegelt ist, kann man das je Tier aktivieren
   *   (swap E<->W, NE<->NW, SE<->SW).
   * ------------------------------------------- */
  const SPECIES = {
    deer: {
      id: 'deer',
      atlasKey: 'deer_sprite_atlas',
      prefix: 'deer_',      // frameName: deer_<DIR>_<FRAME> (deine Master-Atlanten)
      scale: 0.35,
      flipEW: false,        // bei Bedarf true
      maxCount: 10,
    },
    fox: {
      id: 'fox',
      atlasKey: 'fox_atlas',
      prefix: 'fox_',       // frameName: fox_<DIR>_<FRAME>
      scale: 0.30,
      flipEW: false,
      maxCount: 8,
    },
    // vorbereitet – sobald PNG+JSON vorhanden + in core/asset.js geladen:
    rabbit: {
      id: 'rabbit',
      atlasKey: 'rabbit_sprite_atlas',
      prefix: 'rabbit_',
      scale: 0.32,
      flipEW: false,
      maxCount: 8,
      disabled: true, // <- erst aktivieren, wenn du die Frames final hast
    },
    boar: {
      id: 'boar',
      atlasKey: 'boar_sprite_atlas',
      prefix: 'boar_',
      scale: 0.38,
      flipEW: false,
      maxCount: 6,
      disabled: true, // <- erst aktivieren, wenn du die Frames final hast
    },
  };

  /* ---------------------------------------------
   * Interner State
   * ------------------------------------------- */
  const State = {
    ready: false,
    started: false,
    // Map
    cols: 0,
    rows: 0,
    tileSize: 64,
    grid: null, // GameMap._state.grid (tileIds)
    // Animals
    animals: [],
    // Update loop
    lastT: 0,
    rafId: 0,
    // Tuning
    spawnAttempts: 250,
    wanderRadius: 10,  // tiles
    stepCooldownMin: 900, // ms, wie oft neues Ziel (random-walk)
    stepCooldownMax: 2200,
  };

  /* ---------------------------------------------
   * Direction mapping (Atlas-Reihenfolge)
   * ------------------------------------------- */
  const DIRS = [
    { name: 'N',  dx:  0, dy: -1 },
    { name: 'NE', dx:  1, dy: -1 },
    { name: 'E',  dx:  1, dy:  0 },
    { name: 'SE', dx:  1, dy:  1 },
    { name: 'S',  dx:  0, dy:  1 },
    { name: 'SW', dx: -1, dy:  1 },
    { name: 'W',  dx: -1, dy:  0 },
    { name: 'NW', dx: -1, dy: -1 },
  ];

  function dirIndexFromDelta(dx, dy) {
    // Normiere auf -1/0/1 (tile-step Richtung)
    const sx = dx === 0 ? 0 : (dx > 0 ? 1 : -1);
    const sy = dy === 0 ? 0 : (dy > 0 ? 1 : -1);

    // Reihenfolge: N, NE, E, SE, S, SW, W, NW
    if (sx === 0 && sy === -1) return 0;
    if (sx === 1 && sy === -1) return 1;
    if (sx === 1 && sy === 0)  return 2;
    if (sx === 1 && sy === 1)  return 3;
    if (sx === 0 && sy === 1)  return 4;
    if (sx === -1 && sy === 1) return 5;
    if (sx === -1 && sy === 0) return 6;
    if (sx === -1 && sy === -1)return 7;
    return 4; // fallback: S
  }

  function applyFlipEW(dirIdx) {
    // swap E<->W, NE<->NW, SE<->SW
    // indices: 0 N, 1 NE, 2 E, 3 SE, 4 S, 5 SW, 6 W, 7 NW
    switch (dirIdx) {
      case 1: return 7; // NE -> NW
      case 2: return 6; // E  -> W
      case 3: return 5; // SE -> SW
      case 5: return 3; // SW -> SE
      case 6: return 2; // W  -> E
      case 7: return 1; // NW -> NE
      default: return dirIdx;
    }
  }

  /* ---------------------------------------------
   * Terrain helpers
   * ------------------------------------------- */
  function inBounds(tx, ty) {
    return tx >= 0 && ty >= 0 && tx < State.cols && ty < State.rows;
  }

  function tileIdAt(tx, ty) {
    if (!State.grid || !inBounds(tx, ty)) return -1;
    return State.grid[ty * State.cols + tx] ?? -1;
  }

  function isWater(tx, ty) {
    return tileIdAt(tx, ty) === TILE.WATER;
  }

  function isLand(tx, ty) {
    const id = tileIdAt(tx, ty);
    return id >= 0 && id !== TILE.WATER;
  }

  /* ---------------------------------------------
   * Forest sampling: bevorzugt Nähe von Bäumen
   * - nutzt MapDecorations.state().nodes (falls vorhanden)
   * - fallback: random Land tile
   * ------------------------------------------- */
  function getTreeNodes() {
    const md = window.MapDecorations;
    if (!md || typeof md.state !== 'function') return [];
    const st = md.state();
    const nodes = (st && Array.isArray(st.nodes)) ? st.nodes : [];
    // kind enthält i. d. R. "tree" / "trees" / "tree.*"
    return nodes.filter(n => (n && typeof n.kind === 'string' && n.kind.toLowerCase().includes('tree')));
  }

  function pickSpawnNearTrees() {
    const trees = getTreeNodes();
    if (!trees.length) return null;

    // 1) zufälligen Baum wählen
    const base = trees[(Math.random() * trees.length) | 0];
    const bx = base.tx | 0;
    const by = base.ty | 0;

    // 2) in Radius um Baum versuchen (Land + nicht Wasser)
    const R = 8;
    for (let i = 0; i < 80; i++) {
      const ox = ((Math.random() * (2 * R + 1)) | 0) - R;
      const oy = ((Math.random() * (2 * R + 1)) | 0) - R;
      const tx = bx + ox;
      const ty = by + oy;
      if (!inBounds(tx, ty)) continue;
      if (!isLand(tx, ty)) continue;
      return { tx, ty };
    }
    return null;
  }

  function pickRandomLand() {
    for (let i = 0; i < State.spawnAttempts; i++) {
      const tx = (Math.random() * State.cols) | 0;
      const ty = (Math.random() * State.rows) | 0;
      if (isLand(tx, ty)) return { tx, ty };
    }
    return null;
  }

  function pickSpawnTile() {
    // bevorzugt Wald-Nähe, aber immer fallback
    return pickSpawnNearTrees() || pickRandomLand();
  }

  /* ---------------------------------------------
   * Movement target selection
   * ------------------------------------------- */
  function pickWanderTarget(tx, ty) {
    const R = State.wanderRadius;
    for (let i = 0; i < 120; i++) {
      const ox = ((Math.random() * (2 * R + 1)) | 0) - R;
      const oy = ((Math.random() * (2 * R + 1)) | 0) - R;
      const nx = tx + ox;
      const ny = ty + oy;
      if (!inBounds(nx, ny)) continue;
      if (!isLand(nx, ny)) continue;
      return { tx: nx, ty: ny };
    }
    // fallback: bleib
    return { tx, ty };
  }

  /* ---------------------------------------------
   * Frame name helper
   * ------------------------------------------- */
  function frameNameFor(spec, dirIdx, frameIdx) {
    // Standard: prefix + DIR + '_' + frame (deine Atlanten: z.B. deer_N_0 ...)
    const dirName = DIRS[dirIdx]?.name || 'S';
    return `${spec.prefix}${dirName}_walk_${frameIdx}`;
  }

  /* ---------------------------------------------
   * Rendering
   * Wir zeichnen bewusst über OverlayHooks (sicher & unabhängig)
   * ------------------------------------------- */
  function ensureOverlayLayer() {
    const hooks = window.OverlayHooks;
    if (!hooks || typeof hooks.register !== 'function') {
      WARN('[animals] OverlayHooks nicht gefunden – Tiere können nicht gerendert werden.');
      return false;
    }

    // Layer-Name fix
    hooks.register('animals', (ctx, meta) => {
      // meta hat canvas/cam je nach System; wir greifen auf GameCamera/MapState zu
      // Wir zeichnen in "world pixel coords" und nutzen die Camera-Offsets.
      const cam = window.GameCamera && window.GameCamera.state ? window.GameCamera.state() : null;
      const zoom = cam && cam.zoom ? cam.zoom : 1;
      const cx = cam ? cam.x : 0;
      const cy = cam ? cam.y : 0;

      ctx.save();
      // World->Screen transform
      ctx.setTransform(zoom, 0, 0, zoom, -cx * zoom, -cy * zoom);

      for (const a of State.animals) {
        drawOne(ctx, a);
      }

      ctx.restore();
    });

    return true;
  }

  function drawOne(ctx, a) {
    const spec = a.spec;
    const assets = window.Assets;

    // World position (top-down tiles): x = tx*tileSize, y = ty*tileSize
    const x = a.x;
    const y = a.y;

    const dirIdxRaw = a.dirIdx;
    const dirIdx = spec.flipEW ? applyFlipEW(dirIdxRaw) : dirIdxRaw;

    const frame = a.frame;
    const name = frameNameFor(spec, dirIdx, frame);

    if (!assets || typeof assets.drawAtlasFrame !== 'function') {
      // Assets noch nicht da
      return;
    }

    // Pivot: wir zeichnen so, dass der "Fußpunkt" eher am Tile-Boden liegt.
    // Da deine Sprites sowieso in 128x128 liegen, reicht hier: Mittelpunkt + leicht nach unten.
    const pivotX = 64;
    const pivotY = 110;

    assets.drawAtlasFrame(ctx, spec.atlasKey, name, x, y, {
      pivotX,
      pivotY,
      scale: spec.scale,
      // optional: debug bounding box etc. -> später
    });
  }

  /* ---------------------------------------------
   * Create / Spawn animals
   * ------------------------------------------- */
  function makeAnimal(spec, tx, ty) {
    const ts = State.tileSize;
    const x = tx * ts + ts / 2;
    const y = ty * ts + ts / 2;

    return {
      spec,
      tx, ty,
      x, y,
      targetTx: tx,
      targetTy: ty,
      dirIdx: 4, // S
      frame: 0,
      nextDecisionT: performance.now() + rand(State.stepCooldownMin, State.stepCooldownMax),
      nextAnimT: performance.now(),
    };
  }

  function rand(a, b) {
    return a + Math.random() * (b - a);
  }

  function spawnSpecies(spec) {
    if (spec.disabled) return 0;

    const existing = State.animals.filter(a => a.spec.id === spec.id).length;
    const want = Math.max(0, spec.maxCount - existing);
    if (!want) return 0;

    let spawned = 0;
    for (let i = 0; i < want; i++) {
      const pos = pickSpawnTile();
      if (!pos) continue;
      State.animals.push(makeAnimal(spec, pos.tx, pos.ty));
      spawned++;
    }
    if (spawned) LOG(`[animals] spawned ${spawned} ${spec.id} (max=${spec.maxCount})`);
    return spawned;
  }

  function spawnAll() {
    let total = 0;
    for (const k of Object.keys(SPECIES)) {
      total += spawnSpecies(SPECIES[k]);
    }
    if (!total) WARN('[animals] spawnAll: 0 Tiere – prüfe: grid vorhanden? Land? Bäume?');
  }

  /* ---------------------------------------------
   * Update loop (movement + animation)
   * ------------------------------------------- */
  function startLoop() {
    if (State.started) return;
    State.started = true;

    State.lastT = performance.now();
    const tick = (t) => {
      State.rafId = requestAnimationFrame(tick);
      const dt = Math.min(0.05, (t - State.lastT) / 1000);
      State.lastT = t;
      update(dt, t);
    };
    State.rafId = requestAnimationFrame(tick);
  }

  function stopLoop() {
    if (State.rafId) cancelAnimationFrame(State.rafId);
    State.rafId = 0;
    State.started = false;
  }

  function update(dt, tNow) {
    // Tiere bewegen sich tile-basiert aber mit Pixel-Interpolation:
    // - decision: alle ~1-2s neues targetTx/targetTy
    // - movement: gehe 1 tile step Richtung target (N/NE/E/...)
    // - animation: frame 0..7 zyklisch, frame 0 = idle wenn nicht moving

    const moveSpeedTilesPerSec = 1.2; // kann später pro Tier variieren
    const ts = State.tileSize;

    for (const a of State.animals) {
      // Decision: neues Ziel wählen
      if (tNow >= a.nextDecisionT) {
        const tgt = pickWanderTarget(a.tx, a.ty);
        a.targetTx = tgt.tx;
        a.targetTy = tgt.ty;
        a.nextDecisionT = tNow + rand(State.stepCooldownMin, State.stepCooldownMax);
      }

      // Delta in tiles
      const dx = a.targetTx - a.tx;
      const dy = a.targetTy - a.ty;

      const moving = (dx !== 0 || dy !== 0);

      if (moving) {
        // 1 tile step Richtung target
        const stepX = dx === 0 ? 0 : (dx > 0 ? 1 : -1);
        const stepY = dy === 0 ? 0 : (dy > 0 ? 1 : -1);

        const nx = a.tx + stepX;
        const ny = a.ty + stepY;

        // Water check (harte Kante)
        if (inBounds(nx, ny) && isLand(nx, ny)) {
          // Update dir
          a.dirIdx = dirIndexFromDelta(stepX, stepY);

          // Pixel movement toward center of next tile
          const targetX = nx * ts + ts / 2;
          const targetY = ny * ts + ts / 2;

          const vx = targetX - a.x;
          const vy = targetY - a.y;
          const dist = Math.hypot(vx, vy);

          const speedPx = moveSpeedTilesPerSec * ts;
          const step = speedPx * dt;

          if (dist <= step || dist < 0.001) {
            // arrive tile
            a.x = targetX;
            a.y = targetY;
            a.tx = nx;
            a.ty = ny;
          } else {
            a.x += (vx / dist) * step;
            a.y += (vy / dist) * step;
          }

          // Animation: laufen 1..7
          if (tNow >= a.nextAnimT) {
            a.frame = (a.frame + 1) % 8;
            if (a.frame === 0) a.frame = 1; // im Move nicht Idle zeigen
            a.nextAnimT = tNow + (1000 / 6); // ~6 fps default
          }
        } else {
          // Blocked (Wasser / out of bounds): neues Ziel erzwingen
          a.targetTx = a.tx;
          a.targetTy = a.ty;
          a.nextDecisionT = tNow + 250 + Math.random() * 250;
          a.frame = 0;
        }
      } else {
        // idle
        a.frame = 0;
      }
    }
  }

  /* ---------------------------------------------
   * Boot / Event hooks
   * ------------------------------------------- */
  function onMapReady(ev) {
    // GameMap ist spätestens jetzt da
    const gm = window.GameMap;
    if (!gm || !gm._state) {
      WARN('[animals] cb:map:ready, aber GameMap._state fehlt.');
      return;
    }

    State.cols = gm._state.cols | 0;
    State.rows = gm._state.rows | 0;
    State.tileSize = gm._state.tileSize | 0;
    State.grid = gm._state.grid || null;

    if (!State.cols || !State.rows || !State.grid) {
      WARN('[animals] Map state unvollständig (cols/rows/grid). Tiere werden nicht gestartet.');
      return;
    }

    // Overlay layer registrieren
    ensureOverlayLayer();

    // Spawn & Loop
    State.animals = [];
    spawnAll();
    startLoop();

    State.ready = true;
    LOG(`[animals] ready (cols=${State.cols}, rows=${State.rows}, tileSize=${State.tileSize})`);
  }

  // optional: bei reset neu starten
  function onMapReset() {
    try {
      stopLoop();
      State.animals = [];
      spawnAll();
      startLoop();
      LOG('[animals] map reset -> respawn');
    } catch (e) {
      WARN('[animals] reset error', e);
    }
  }

  window.addEventListener('cb:map:ready', onMapReady);
  window.addEventListener('cb:map:reset', onMapReset);

  // Fallback: falls map:ready schon vor Script-Load passiert ist,
  // versuchen wir "später" einmal zu starten.
  setTimeout(() => {
    if (State.ready) return;
    if (window.GameMap && window.GameMap._state && window.GameMap._state.grid) {
      onMapReady({});
    }
  }, 500);

})();
