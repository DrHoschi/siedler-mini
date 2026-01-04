/* ============================================================================
 *  core/map.animals.js
 *  v26.01.04-animals-final
 *  Zweck:
 *   - Wildtiere (Deer/Fox/Boar/Rabbit) auf der Map spawnen & bewegen
 *   - Wald-Priorität (Spawn dort, wo viele Bäume sind) + Fallback
 *   - Wasser wird gemieden (Spawn + Bewegung + Retarget)
 *   - Richtungs-Frame wird korrekt aus Bewegungsvektor bestimmt (mit optionalem EW-Flip)
 *
 *  Hinweis zur Richtungslogik:
 *   Eure Atlas-"Dir"-Benennung ist im Uhrzeigersinn (N→NE→E→SE→S→SW→W→NW).
 *   Wenn euer Projekt-Koordinatensystem später global vereinheitlicht wird,
 *   kann es sein, dass ihr CFG.flipEW wieder auf false stellen wollt.
 * ========================================================================== */
(() => {
  'use strict';

  /* ========================================================================
   *  KONSTANTEN / DEFAULTS
   * ====================================================================== */

  // Debug-Log Prefix
  const TAG = '[animals]';

  // Globale Konfiguration (bewusst "einfach" gehalten, damit du schnell testen kannst)
  const CFG = {
    enabled: true,

    // Maximale Anzahl pro Tierart (damit nicht "unbegrenzt" gespawnt wird)
    maxPerType: {
      deer: 8,
      fox: 6,
      boar: 4,
      rabbit: 10,
    },

    // Spawn-Verhalten
    spawn: {
      // Wie viele Kandidaten wir testen, um einen guten Wald-Spawn zu finden
      forestCandidates: 48,
      // Radius (in Pixeln) um einen Baum/Tree-Node herum, wo wir spawnen dürfen
      forestRadiusPx: 260,
      // Minimaler Abstand zum HQ (in Pixeln), damit nicht alles direkt am HQ klebt
      minDistToHQ: 220,
      // Fallback-Radius (in Pixeln) um HQ, wenn keine Tree-Daten vorhanden sind
      fallbackRadiusPx: 900,
    },

    // Bewegung
    move: {
      speedPxPerSec: 28,       // Basisspeed
      wanderMinPx: 120,        // Minimaler Ziel-Abstand
      wanderMaxPx: 520,        // Maximaler Ziel-Abstand
      retargetCooldownMs: 350, // Kurzer Cooldown gegen "Ziel-Flattern"
    },

    // Rendering / Skalierung (deine Vorgabe)
    scales: {
      deer: 0.35,
      fox: 0.30,
      // Für Boar/Rabbit hattest du noch keine finalen Werte genannt → Defaults:
      boar: 0.35,
      rabbit: 0.30,
    },

    // Atlas/Frame-Namensschema (Master-Keys)
    // Erwartete Frame-Namen: <prefix>_<DIR>_walk_<frameIndex>
    // Beispiel: deer_N_walk_0
    types: {
      deer:   { atlasKey: 'deer_sprite_atlas',   prefix: 'deer'   },
      fox:    { atlasKey: 'fox_sprite_atlas',    prefix: 'fox'    },
      boar:   { atlasKey: 'boar_sprite_atlas',   prefix: 'boar'   },
      rabbit: { atlasKey: 'rabbit_sprite_atlas', prefix: 'rabbit' },
    },

    // Wenn eure Sprites links/rechts vertauscht erscheinen: true lassen (aktuell dein Wunsch).
    // (Später, wenn ihr das gesamte Koordinatensystem vereinheitlicht, evtl. wieder false.)
    flipEW: true,

    // Optional: Spawn-Logs
    logSpawn: true,
  };

  // Richtungscode (fix, weil Atlas so benannt ist)
  const DIRS = ['N','NE','E','SE','S','SW','W','NW'];

  /* ========================================================================
   *  STATE
   * ====================================================================== */

  const State = {
    ready: false,
    mapId: null,
    cols: 0,
    rows: 0,
    tileSize: 64, // wird bei map-ready überschrieben, falls verfügbar

    assets: null,
    diag: null,

    animals: [],

    // Für Wasser-Check
    waterIdSet: null,

    // Für "Wald-Spawn"
    treeNodes: null, // [{x,y, ...}] aus MapResources

    // HQ Position (Pixel)
    hqX: 0,
    hqY: 0,
  };

  /* ========================================================================
   *  HELPER
   * ====================================================================== */

  function nowMs() { return Date.now(); }

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  function rand(min, max) { return min + Math.random() * (max - min); }

  function randInt(min, maxIncl) { return Math.floor(min + Math.random() * (maxIncl - min + 1)); }

  function dist2(ax, ay, bx, by) {
    const dx = bx - ax;
    const dy = by - ay;
    return dx*dx + dy*dy;
  }

  function ensureInsideMapPx(x, y) {
    const maxX = (State.cols * State.tileSize) - 1;
    const maxY = (State.rows * State.tileSize) - 1;
    return {
      x: clamp(x, 0, maxX),
      y: clamp(y, 0, maxY),
    };
  }

  function worldToTile(x, y) {
    const ts = State.tileSize || 64;
    return {
      tx: Math.floor(x / ts),
      ty: Math.floor(y / ts),
    };
  }

  function tileToWorldCenter(tx, ty) {
    const ts = State.tileSize || 64;
    return {
      x: (tx * ts) + ts * 0.5,
      y: (ty * ts) + ts * 0.5,
    };
  }

  /* ------------------------------------------------------------------------
   * Wasser-Erkennung über GameMap._state.grid + legend (robust)
   * --------------------------------------------------------------------- */

  function computeWaterIdSetFromLegend(legend) {
    try {
      const out = new Set();
      if (!legend) return out;

      // 1) idByName
      if (legend.idByName && typeof legend.idByName === 'object') {
        for (const [name, id] of Object.entries(legend.idByName)) {
          if (String(name).toLowerCase().includes('water')) out.add(Number(id));
        }
      }

      // 2) terrainNameById
      if (legend.terrainNameById && typeof legend.terrainNameById === 'object') {
        for (const [id, name] of Object.entries(legend.terrainNameById)) {
          if (String(name).toLowerCase().includes('water')) out.add(Number(id));
        }
      }

      // 3) names + ids parallel
      if (Array.isArray(legend.names) && Array.isArray(legend.ids) && legend.names.length === legend.ids.length) {
        for (let i=0;i<legend.names.length;i++) {
          if (String(legend.names[i]).toLowerCase().includes('water')) {
            out.add(Number(legend.ids[i]));
          }
        }
      }

      return out;
    } catch (e) {
      return new Set();
    }
  }

  function getTerrainTileId(tx, ty) {
    const gm = window.GameMap;
    const st = gm && gm._state;
    const grid = st && st.grid;
    if (!grid) return null;

    if (Array.isArray(grid)) {
      // 2D?
      if (Array.isArray(grid[0])) {
        const row = grid[ty];
        return row ? row[tx] : null;
      }
      // flat?
      const idx = ty * State.cols + tx;
      return grid[idx];
    }
    return null;
  }

  function isWaterAtWorld(x, y) {
    const { tx, ty } = worldToTile(x, y);
    if (tx < 0 || ty < 0 || tx >= State.cols || ty >= State.rows) return true;

    // Wenn wir nicht wissen, was Wasser ist: nicht blocken (Debug-freundlich)
    if (!State.waterIdSet) return false;

    const id = getTerrainTileId(tx, ty);
    if (id == null) return false;
    return State.waterIdSet.has(Number(id));
  }

  /* ------------------------------------------------------------------------
   * Richtungs-Mapping
   * --------------------------------------------------------------------- */

  function pickDirectionFromDelta(dx, dy) {
    // Acht Richtungen anhand Winkel (0° = Osten, CCW positiv)
    const ang = (Math.atan2(dy, dx) * 180 / Math.PI + 360) % 360;

    let dir;
    if (ang >= 337.5 || ang < 22.5) dir = 'E';
    else if (ang < 67.5) dir = 'NE';
    else if (ang < 112.5) dir = 'N';
    else if (ang < 157.5) dir = 'NW';
    else if (ang < 202.5) dir = 'W';
    else if (ang < 247.5) dir = 'SW';
    else if (ang < 292.5) dir = 'S';
    else dir = 'SE';

    if (!CFG.flipEW) return dir;

    // EW flip (und diagonalen)
    if (dir === 'E') return 'W';
    if (dir === 'W') return 'E';
    if (dir === 'NE') return 'NW';
    if (dir === 'NW') return 'NE';
    if (dir === 'SE') return 'SW';
    if (dir === 'SW') return 'SE';
    return dir;
  }

  function frameKeyFor(a) {
    const typeCfg = CFG.types[a.kind];
    const prefix = (typeCfg && typeCfg.prefix) ? typeCfg.prefix : a.kind;
    const dir = a.dir || 'S';
    const animF = a.animF || 0;
    return `${prefix}_${dir}_walk_${animF}`;
  }

  /* ------------------------------------------------------------------------
   * Tree/Forest Spawn Heuristik
   * --------------------------------------------------------------------- */

  function refreshTreeNodes() {
    const mr = window.MapResources;
    const st = mr && (mr._state || mr.State || mr.state);
    const trees = (st && st.trees) || null;
    State.treeNodes = Array.isArray(trees) ? trees : null;
  }

  function chooseSpawnInForest() {
    const trees = State.treeNodes;
    if (!trees || trees.length < 10) return null;

    const tries = Math.min(CFG.spawn.forestCandidates, trees.length);
    let best = null;
    let bestScore = -1;

    for (let i=0;i<tries;i++) {
      const t = trees[randInt(0, trees.length - 1)];
      const cx = t.x;
      const cy = t.y;

      const r2 = CFG.spawn.forestRadiusPx * CFG.spawn.forestRadiusPx;
      let score = 0;

      // sampling statt full-scan
      const sample = Math.min(60, trees.length);
      for (let k=0;k<sample;k++) {
        const tt = trees[randInt(0, trees.length - 1)];
        if (dist2(cx, cy, tt.x, tt.y) <= r2) score++;
      }

      // nicht zu nah am HQ
      const d2hq = dist2(cx, cy, State.hqX, State.hqY);
      if (d2hq < CFG.spawn.minDistToHQ * CFG.spawn.minDistToHQ) score -= 999;

      if (score > bestScore) {
        bestScore = score;
        best = { x: cx, y: cy };
      }
    }

    if (!best) return null;

    const ang = rand(0, Math.PI * 2);
    const rad = rand(40, CFG.spawn.forestRadiusPx);
    let x = best.x + Math.cos(ang) * rad;
    let y = best.y + Math.sin(ang) * rad;

    const p = ensureInsideMapPx(x, y);
    x = p.x; y = p.y;

    if (isWaterAtWorld(x, y)) return null;

    return { x, y };
  }

  function chooseSpawnFallback() {
    // Fallback: random um HQ, aber nicht zu nah
    for (let i=0;i<80;i++) {
      const ang = rand(0, Math.PI * 2);
      const rad = rand(CFG.spawn.minDistToHQ, CFG.spawn.fallbackRadiusPx);
      const x = State.hqX + Math.cos(ang) * rad;
      const y = State.hqY + Math.sin(ang) * rad;
      const p = ensureInsideMapPx(x, y);
      if (!isWaterAtWorld(p.x, p.y)) return p;
    }

    // Ultra-Fallback: Map-Mitte
    const mid = tileToWorldCenter(Math.floor(State.cols/2), Math.floor(State.rows/2));
    return ensureInsideMapPx(mid.x, mid.y);
  }

  function chooseSpawnPoint() {
    const pForest = chooseSpawnInForest();
    if (pForest) return pForest;
    return chooseSpawnFallback();
  }

  /* ------------------------------------------------------------------------
   * Zielwahl (Wander)
   * --------------------------------------------------------------------- */

  function chooseNewTarget(a) {
    const baseAng = rand(0, Math.PI * 2);
    const baseDist = rand(CFG.move.wanderMinPx, CFG.move.wanderMaxPx);

    for (let i=0;i<24;i++) {
      const ang = baseAng + (i * (Math.PI/12));
      const dist = baseDist;
      const x = a.x + Math.cos(ang) * dist;
      const y = a.y + Math.sin(ang) * dist;
      const p = ensureInsideMapPx(x, y);
      if (isWaterAtWorld(p.x, p.y)) continue;
      a.tx = p.x;
      a.ty = p.y;
      a._retargetAt = nowMs();
      return;
    }

    // Wenn wir gar nichts finden: bleib stehen
    a.tx = a.x;
    a.ty = a.y;
    a._retargetAt = nowMs();
  }

  /* ========================================================================
   *  CORE LOGIC
   * ====================================================================== */

  function countByKind(kind) {
    let c = 0;
    for (const a of State.animals) if (a.kind === kind) c++;
    return c;
  }

  function ensureSpawns() {
    if (!CFG.enabled) return;

    refreshTreeNodes();

    for (const kind of Object.keys(CFG.types)) {
      const max = (CFG.maxPerType && CFG.maxPerType[kind]) || 0;
      const cur = countByKind(kind);
      if (cur >= max) continue;

      const need = max - cur;
      for (let i=0;i<need;i++) {
        const p = chooseSpawnPoint();

        const a = {
          kind,
          x: p.x,
          y: p.y,
          tx: p.x,
          ty: p.y,

          dir: 'S',
          animF: 0,

          _animAcc: 0,
          _retargetAt: 0,
        };

        chooseNewTarget(a);
        State.animals.push(a);

        if (CFG.logSpawn) {
          const t = worldToTile(a.x, a.y);
          console.info(`${TAG} spawn ${kind} @ px(${a.x.toFixed(1)},${a.y.toFixed(1)}) tile(${t.tx},${t.ty})`);
        }
      }
    }
  }

  function stepAnimals(dt) {
    for (const a of State.animals) {
      const dx = a.tx - a.x;
      const dy = a.ty - a.y;
      const d2 = dx*dx + dy*dy;

      // Ziel erreicht → retarget
      if (d2 < 6*6) {
        if (nowMs() - (a._retargetAt || 0) > CFG.move.retargetCooldownMs) {
          chooseNewTarget(a);
        }
        continue;
      }

      // Richtung fürs Sprite
      a.dir = pickDirectionFromDelta(dx, dy);

      // Bewegung
      const dist = Math.sqrt(d2) || 1;
      const vx = dx / dist;
      const vy = dy / dist;

      const speed = CFG.move.speedPxPerSec;
      const nx = a.x + vx * speed * dt;
      const ny = a.y + vy * speed * dt;

      // Wasser-Block
      if (isWaterAtWorld(nx, ny)) {
        chooseNewTarget(a);
        continue;
      }

      a.x = nx;
      a.y = ny;

      // Animation: 0..7
      a._animAcc += dt;
      const fps = 8;
      if (a._animAcc >= (1 / fps)) {
        a._animAcc = 0;
        a.animF = (a.animF + 1) % 8;
      }
    }
  }

  /* ========================================================================
   *  RENDER
   * ====================================================================== */

  function draw(ctx) {
    if (!State.assets) return;

    for (const a of State.animals) {
      const typeCfg = CFG.types[a.kind];
      if (!typeCfg) continue;

      const atlasKey = typeCfg.atlasKey;
      const frameKey = frameKeyFor(a);

      // Scale pro Tierart
      const scale = (CFG.scales && CFG.scales[a.kind] != null) ? CFG.scales[a.kind] : 1;

      State.assets.drawAtlasFrame(ctx, atlasKey, frameKey, a.x, a.y, {
        scale,
      });
    }
  }

  /* ========================================================================
   *  EVENT / INTEGRATION
   * ====================================================================== */

  function onMapReady(e) {
    const d = (e && e.detail) ? e.detail : {};

    State.mapId = d.mapId || State.mapId;
    State.cols = d.cols || State.cols;
    State.rows = d.rows || State.rows;
    State.tileSize = d.tileSize || State.tileSize;

    // HQ
    State.hqX = (d.hqX != null) ? d.hqX : (window.Game && window.Game.hq && window.Game.hq.x) || (State.cols * State.tileSize * 0.5);
    State.hqY = (d.hqY != null) ? d.hqY : (window.Game && window.Game.hq && window.Game.hq.y) || (State.rows * State.tileSize * 0.5);

    // WaterSet via GameMap legend
    const gm = window.GameMap;
    const st = gm && gm._state;
    const legend = st && st.legend;
    State.waterIdSet = computeWaterIdSetFromLegend(legend);

    State.ready = true;

    if (CFG.logSpawn) {
      console.info(`${TAG} map-ready cols=${State.cols} rows=${State.rows} ts=${State.tileSize} waterIds=${State.waterIdSet ? State.waterIdSet.size : 0}`);
    }

    ensureSpawns();
  }

  function onAssetsReady(e) {
    const d = (e && e.detail) ? e.detail : {};
    State.assets = d.assets || d.assetManager || window.Assets || window.assetManager || State.assets || null;
    State.diag = d.diag || window.Diag || State.diag || null;

    if (CFG.logSpawn) console.info(`${TAG} assets-ready: ${!!State.assets}`);
  }

  function tick(dtMs) {
    if (!State.ready || !CFG.enabled) return;

    const dt = (typeof dtMs === 'number' && isFinite(dtMs)) ? (dtMs / 1000) : (1/60);

    ensureSpawns();
    stepAnimals(dt);
  }

  function collectDrawables() {
    return [{
      id: 'animals',
      z: 25,
      draw,
    }];
  }

  /* ========================================================================
   *  PUBLIC API
   * ====================================================================== */

  const API = {
    CFG,
    _state: State,

    onMapReady,
    onAssetsReady,

    tick,
    collectDrawables,
  };

  window.MapAnimals = API;

  // Events (dein Projekt nutzt CustomEvents)
  document.addEventListener('cb:map:ready', onMapReady);
  document.addEventListener('cb:assets-ready', onAssetsReady);
  document.addEventListener('cb:registry:ready', onAssetsReady);

  // Fallback: wenn es schon global da ist
  if (!State.assets) {
    if (window.Assets) State.assets = window.Assets;
    if (window.assetManager) State.assets = window.assetManager;
  }

  // Fallback: wenn GameMap schon da ist
  try {
    const gm = window.GameMap && window.GameMap._state;
    if (gm && gm.cols && gm.rows) {
      State.cols = gm.cols;
      State.rows = gm.rows;
      State.tileSize = gm.tileSize || State.tileSize;
      State.waterIdSet = computeWaterIdSetFromLegend(gm.legend);
      State.hqX = State.hqX || (State.cols * State.tileSize * 0.5);
      State.hqY = State.hqY || (State.rows * State.tileSize * 0.5);
      State.ready = true;
    }
  } catch (e) { /* ignore */ }

  if (CFG.logSpawn) console.info(`${TAG} loaded v26.01.04-animals-final`);
})();