/* ============================================================================
 * Datei    : core/map.animals.js
 * Version  : v26.01.04-animals-forestspawn-dirfix-scales-perkind
 *
 * Zweck:
 *   - Tiere (Reh/Fuchs + vorbereitet: Hase, Wildschwein) als "dynamische Ressourcen"
 *   - Spawnen bevorzugt in waldreichen Zonen (Tree-Hotspots), streuen dann über Land
 *   - Laufen NICHT aufs Wasser (Spawn + Target + Step-Check)
 *   - Richtungs-Mapping ist an SpriteTest angeglichen (inkl. E/W-Flip Workaround)
 *
 * WICHTIG / TECH-DEBT (bewusst so):
 *   - CFG.flipEW ist aktuell für alle Tiere TRUE gesetzt, weil euer Projekt/ISO-Achsen
 *     noch nicht global vereinheitlicht sind.
 *   - Sobald wir die Koordinaten/Projektion zentral bereinigen, kann flipEW wieder
 *     deaktiviert/entfernt werden. (=> Kommentar NICHT löschen!)
 * ========================================================================== */
(() => {
  'use strict';

  // ------------------------------------------------------------
  // Imports / externe Hooks (defensiv, weil sich Namen je Version ändern können)
  // ------------------------------------------------------------
  const LOG = (...a)=>console.log('[animals]', ...a);
  const WARN= (...a)=>console.warn('[animals]', ...a);

  // ------------------------------------------------------------
  // Konfiguration (Option B später: aus Registry/Rules ziehen)
  // ------------------------------------------------------------
  const CFG = {
    enabled : true,

    // Anzahl Tiere (pro Map-Reset)
    // Hinweis: rabbit/boar sind bereits vorbereitet; setze >0 sobald Atlas + PNG geladen sind.
    spawn   : { deer: 6, fox: 3, rabbit: 2, boar: 1 },

    // Größen (der Nutzer-Wunsch)
    scale   : { deer: 0.35, fox: 0.30, rabbit: 0.28, boar: 0.32 },

    // Bewegung: Grundgeschwindigkeit (px/s) je Tierart
    speedPxPerSec : { deer: 18, fox: 26, rabbit: 22, boar: 20 },

    // Zielstreuung (damit es nicht „Grid-robotisch“ wirkt)
    targetJitterPx: 120,

    // Wie oft (zufällig) ein neues Ziel gesucht wird
    retargetEverySec: [2.0, 5.0],

    // Wie weit die Tiere „wandern dürfen“ (Tiles).
    // Erhöht => Tiere verteilen sich stärker über die Map.
    roamRadiusTiles: { deer: 18, fox: 22, rabbit: 16, boar: 20 },

    // Maximal erlaubte Gesamtanzahl (Sicherheitsgurt gegen „zu viele“)
    maxTotal: 20,

    // Atlas-Mapping (MUSS zu core/asset.js passen)
    atlas      : {
      deer  : 'deer_sprite_atlas',
      fox   : 'fox_atlas',
      rabbit: 'rabbit_sprite_atlas',
      boar  : 'boar_sprite_atlas'
    },
    framePrefix: { deer:'deer', fox:'fox', rabbit:'rabbit', boar:'boar' },

    // Richtungs-Reihenfolge (wie SpriteTest): N -> NE -> E -> SE -> S -> SW -> W -> NW
    dirOrder: ['N','NE','E','SE','S','SW','W','NW'],

    // WORKAROUND: E/W (und Diagonalen) spiegeln – solange Iso/Koordinaten nicht final sind.
    // Wenn später alles vereinheitlicht ist: flipEW auf false setzen oder entfernen.
    flipEW: { deer:true, fox:true, rabbit:true, boar:true },

    // Debug
    debug: {
      logs: false,          // spamt sonst
      drawTileDot: false    // kleine Punkte auf Pivot-Tile
    }
  };

  // ------------------------------------------------------------
  // STATE
  // ------------------------------------------------------------
  const State = {
    ready   : false,
    cols    : 0,
    rows    : 0,
    tileSize: 64,
    animals : []
  };

  // ------------------------------------------------------------
  // Helper: Random
  // ------------------------------------------------------------
  function rnd(min, max){ return min + Math.random() * (max - min); }
  function rndi(min, max){ return Math.floor(rnd(min, max+1)); }
  function pick(arr){ return arr[Math.floor(Math.random()*arr.length)] || null; }

  // ------------------------------------------------------------
  // Helper: Tile/World Conversion
  // ------------------------------------------------------------
  function tileToWorld(tx, ty, tileSize){
    // Wir nutzen hier die gleiche Definition wie in anderen Modulen:
    // worldX/worldY sind die „TopLeft“ der Tile in World-Space.
    return { x: tx * tileSize, y: ty * tileSize };
  }

  function worldToTile(x, y, tileSize){
    return { tx: Math.floor(x / tileSize), ty: Math.floor(y / tileSize) };
  }

  function clamp(v, a, b){ return Math.max(a, Math.min(b, v)); }

  // ------------------------------------------------------------
  // Map-Access: TileId + Water-Detection (defensiv)
  // ------------------------------------------------------------
  function getMapRef(){
    // Viele Systeme halten das Map-Objekt irgendwo.
    return window.GameMap?.State?.map
        || window.GameMap?.map
        || window.Game?.map
        || null;
  }

  function getTileIdAt(tx, ty){
    try{
      if (window.GameRules && typeof window.GameRules.getTileIdAt === 'function'){
        return window.GameRules.getTileIdAt(tx, ty);
      }
      if (window.GameMap && typeof window.GameMap.getTileId === 'function'){
        return window.GameMap.getTileId(tx, ty);
      }
      // Fallback: falls Grid direkt im State liegt
      const g = window.GameMap?.State?.tiles || window.GameMap?.State?.grid || null;
      if (g && g[ty] && Number.isFinite(g[ty][tx])) return g[ty][tx];
    }catch(_){}
    return NaN;
  }

  function isWater(tx, ty){
    const tid = getTileIdAt(tx, ty);
    try{
      const map = getMapRef();
      if (window.GameRules && typeof window.GameRules.isWaterTileId === 'function'){
        return window.GameRules.isWaterTileId(tid, map);
      }
    }catch(_){}
    // Fallback (konservativ)
    return tid === 8 || tid === 9;
  }

  function inBounds(tx, ty){
    return tx >= 0 && ty >= 0 && tx < State.cols && ty < State.rows;
  }

  function isLand(tx, ty){
    if (!inBounds(tx, ty)) return false;
    return !isWater(tx, ty);
  }

  // ------------------------------------------------------------
  // Tree Hotspots: bevorzugt dort spawnen, wo viele Bäume sind
  // ------------------------------------------------------------
  function getTreeNodes(){
    // MapResources ist bei euch das „neue“ System – manchmal state/State.
    const mr = window.MapResources;
    const st = mr?.state || mr?.State || null;
    const trees = st?.trees || st?.Trees || null;
    if (!trees || !Array.isArray(trees) || !trees.length) return [];

    const out = [];
    for (const t of trees){
      // tolerant: tx/ty oder x/y
      const tx = Number.isFinite(t?.tx) ? t.tx : (Number.isFinite(t?.x) ? t.x : NaN);
      const ty = Number.isFinite(t?.ty) ? t.ty : (Number.isFinite(t?.y) ? t.y : NaN);
      if (!Number.isFinite(tx) || !Number.isFinite(ty)) continue;
      if (!inBounds(tx, ty)) continue;
      out.push({ tx, ty });
    }
    return out;
  }

  function pickForestHotspot(){
    // Scoring: wir legen ein grobes Raster über die Map und zählen Trees in Zellen.
    const nodes = getTreeNodes();
    if (!nodes.length) return null;

    const cell = 8; // Zellgröße in Tiles (8x8)
    const cols = Math.ceil(State.cols / cell);
    const rows = Math.ceil(State.rows / cell);
    const score = new Array(cols * rows).fill(0);

    for (const n of nodes){
      const cx = Math.floor(n.tx / cell);
      const cy = Math.floor(n.ty / cell);
      score[cx + cy * cols] += 1;
    }

    // Top-K Zellen sammeln
    const K = 6; // mehrere Hotspots => mehr Streuung
    const idxs = score
      .map((v,i)=>({v,i}))
      .sort((a,b)=>b.v-a.v)
      .slice(0, K)
      .filter(e=>e.v > 0);

    if (!idxs.length) return null;

    const chosen = pick(idxs);
    const cx = chosen.i % cols;
    const cy = Math.floor(chosen.i / cols);

    // In der Zelle random Landtile suchen
    for (let tries=0; tries<80; tries++){
      const tx = clamp(cx * cell + rndi(0, cell-1), 0, State.cols-1);
      const ty = clamp(cy * cell + rndi(0, cell-1), 0, State.rows-1);
      if (isLand(tx, ty)) return { tx, ty };
    }
    return null;
  }

  // ------------------------------------------------------------
  // Direction Mapping (SpriteTest kompatibel)
  // ------------------------------------------------------------
  function vecToDir(dx, dy){
    // dx,dy in World-Pixeln (screen space).
    // Wir nutzen klassischen 8-way Winkel.
    const ang = Math.atan2(-dy, dx); // -dy: y nach unten positiv => invertieren für Winkel
    // ang: 0 = East, pi/2 = North
    const pi = Math.PI;
    // Map auf 8 Sektoren (E,NE,N,NW,W,SW,S,SE)
    const sector = Math.round(ang / (pi/4));
    const s = (sector + 8) % 8;
    // E=0, NE=1, N=2, NW=3, W=4, SW=5, S=6, SE=7
    const map = ['E','NE','N','NW','W','SW','S','SE'];
    return map[s] || 'S';
  }

  function applyFlipEW(dir){
    // Flip: E<->W, NE<->NW, SE<->SW. N/S bleiben.
    switch(dir){
      case 'E':  return 'W';
      case 'W':  return 'E';
      case 'NE': return 'NW';
      case 'NW': return 'NE';
      case 'SE': return 'SW';
      case 'SW': return 'SE';
      default:   return dir;
    }
  }

  function dirToIndex(dir){
    // Index laut CFG.dirOrder (N..NW)
    const i = CFG.dirOrder.indexOf(dir);
    return i >= 0 ? i : 4; // fallback W
  }

  // ------------------------------------------------------------
  // Frame Name Helper (wir erwarten: <prefix>_<dirIndex>_<frameIndex>)
  // ------------------------------------------------------------
  function frameName(kind, dirIdx, frameIdx){
    const p = CFG.framePrefix[kind] || kind;
    return `${p}_${dirIdx}_${frameIdx}`;
  }

  // ------------------------------------------------------------
  // Animal Factory
  // ------------------------------------------------------------
  function makeAnimal(kind, tx, ty){
    const tileSize = State.tileSize || 64;
    const w = tileToWorld(tx, ty, tileSize);

    return {
      kind,
      // World-Position (wir rendern im WORLD-Space)
      x: w.x + tileSize * 0.5,
      y: w.y + tileSize * 0.5,

      // Bewegung
      vx: 0, vy: 0,
      speed: (CFG.speedPxPerSec[kind] || 18),
      nextRetargetAt: 0,
      target: { x: w.x + tileSize * 0.5, y: w.y + tileSize * 0.5 },

      // Animation
      dir: 'S',
      dirIdx: 4,
      animT: 0,
      frame: 0,

      // Render
      scale: (CFG.scale[kind] ?? 1),
      // Debug
      uid: `${kind}_${Math.random().toString(16).slice(2)}`
    };
  }

  // ------------------------------------------------------------
  // Spawn Logic
  // ------------------------------------------------------------
  function chooseSpawn(kind){
    // 1) Forest Hotspot
    const hs = pickForestHotspot();
    if (hs) return hs;

    // 2) Random Land (breit gestreut)
    for (let tries=0; tries<200; tries++){
      const tx = rndi(0, State.cols-1);
      const ty = rndi(0, State.rows-1);
      if (isLand(tx, ty)) return { tx, ty };
    }
    // 3) Notfalls: Mitte (aber dann wenigstens Land suchen)
    const mx = Math.floor(State.cols/2), my=Math.floor(State.rows/2);
    for (let r=0; r<Math.max(State.cols, State.rows); r++){
      for (let dx=-r; dx<=r; dx++){
        const tx = mx + dx;
        const ty = my + r;
        if (isLand(tx, ty)) return { tx, ty };
      }
    }
    return { tx: mx, ty: my };
  }

  function reset(){
    State.animals.length = 0;

    // Counts zusammenrechnen, aber capped
    const kinds = Object.keys(CFG.spawn || {});
    for (const kind of kinds){
      const n = CFG.spawn[kind] || 0;
      for (let i=0; i<n; i++){
        if (State.animals.length >= CFG.maxTotal) break;
        const sp = chooseSpawn(kind);
        State.animals.push(makeAnimal(kind, sp.tx, sp.ty));
      }
    }
    State.ready = true;
    if (CFG.debug.logs) LOG('reset', { count: State.animals.length });
  }

  // ------------------------------------------------------------
  // Target / Wander
  // ------------------------------------------------------------
  function chooseTarget(a){
    const tileSize = State.tileSize || 64;
    const posT = worldToTile(a.x, a.y, tileSize);
    const rad = CFG.roamRadiusTiles[a.kind] || 18;

    // Wir versuchen mehrere Kandidaten: je weiter, desto mehr Streuung.
    for (let tries=0; tries<80; tries++){
      const tx = clamp(posT.tx + rndi(-rad, rad), 0, State.cols-1);
      const ty = clamp(posT.ty + rndi(-rad, rad), 0, State.rows-1);
      if (!isLand(tx, ty)) continue;

      const w = tileToWorld(tx, ty, tileSize);
      const cx = w.x + tileSize*0.5 + rnd(-CFG.targetJitterPx, CFG.targetJitterPx);
      const cy = w.y + tileSize*0.5 + rnd(-CFG.targetJitterPx, CFG.targetJitterPx);
      return { x: cx, y: cy };
    }

    // Fallback: stehen bleiben
    return { x: a.x, y: a.y };
  }

  // ------------------------------------------------------------
  // Tick / Update
  // ------------------------------------------------------------
  function tick(dt, nowSec){
    if (!CFG.enabled) return;
    if (!State.ready) return;

    const tileSize = State.tileSize || 64;

    for (const a of State.animals){
      // Retarget?
      if (!a.nextRetargetAt || nowSec >= a.nextRetargetAt){
        a.target = chooseTarget(a);
        a.nextRetargetAt = nowSec + rnd(CFG.retargetEverySec[0], CFG.retargetEverySec[1]);
      }

      // Move toward target
      const dx = a.target.x - a.x;
      const dy = a.target.y - a.y;
      const dist = Math.hypot(dx, dy) || 0.0001;

      // Richtung bestimmen (für Sprite)
      let dir = vecToDir(dx, dy);
      if (CFG.flipEW[a.kind]) dir = applyFlipEW(dir);

      // Umsetzen auf Index nach CFG.dirOrder
      const dirIdx = dirToIndex(dir);

      a.dir = dir;
      a.dirIdx = dirIdx;

      // Step (mit Water-Block)
      const step = a.speed * dt;
      const nx = a.x + (dx / dist) * step;
      const ny = a.y + (dy / dist) * step;

      const t2 = worldToTile(nx, ny, tileSize);
      if (isLand(t2.tx, t2.ty)){
        a.x = nx; a.y = ny;
      } else {
        // Wasser/Out -> neues Ziel suchen (sofort)
        a.target = chooseTarget(a);
        a.nextRetargetAt = nowSec + rnd(0.4, 1.2);
      }

      // Animation (einfach: 0=idle, 1.. = walk)
      // Wir animieren „leicht“ – wenn du später mehr Frames hast, kann das erweitert werden.
      a.animT += dt;
      const fps = 6; // bewusst moderat
      const f = Math.floor(a.animT * fps) % 2; // 0..1
      a.frame = f; // Frame 0/1 nutzen
    }
  }

  // ------------------------------------------------------------
  // Render Integration: Drawables für GameMap.globalYSort()
  // ------------------------------------------------------------
  function collectDrawables(out){
    if (!CFG.enabled || !State.ready) return;
    const Assets = window.Assets || window.Asset || null;
    if (!Assets || typeof Assets.drawAtlasFrame !== 'function') return;

    for (const a of State.animals){
      const atlasKey = CFG.atlas[a.kind];
      const name = frameName(a.kind, a.dirIdx, a.frame);

      out.push({
        id: a.uid,
        kind: a.kind,
        x: a.x,
        y: a.y,
        // y-sort: world y (unten = weiter vorne)
        ySort: a.y,

        draw: (ctx)=>{
          // drawAtlasFrame(ctx, atlasName, frameName, worldX, worldY, opts)
          Assets.drawAtlasFrame(ctx, atlasKey, name, a.x, a.y, {
            // Anker/Pivot macht Asset-Layer; wir geben nur Scale
            scale: a.scale
          });

          if (CFG.debug.drawTileDot){
            ctx.save();
            ctx.globalAlpha = 0.9;
            ctx.fillStyle = 'magenta';
            ctx.fillRect(a.x-1, a.y-1, 2, 2);
            ctx.restore();
          }
        }
      });
    }
  }

  // ------------------------------------------------------------
  // Boot / Hook: auf Map-Ready warten
  // ------------------------------------------------------------
  function tryInitFromMap(){
    // GameMap liefert cols/rows/tileSize
    const gm = window.GameMap || null;
    const st = gm?.State || gm?.state || null;
    const cols = st?.cols ?? st?.width ?? null;
    const rows = st?.rows ?? st?.height ?? null;
    const tileSize = st?.tileSize ?? st?.ts ?? 64;

    if (Number.isFinite(cols) && Number.isFinite(rows)){
      State.cols = cols;
      State.rows = rows;
      State.tileSize = tileSize;
      reset();
      return true;
    }
    return false;
  }

  // Versuche sofort, sonst auf events
  tryInitFromMap();

  window.addEventListener('cb:map:ready', ()=>{ tryInitFromMap(); });
  window.addEventListener('cb:game:start', ()=>{ tryInitFromMap(); });

  // Expose (wie bisher)
  window.MapAnimals = {
    id:'MapAnimals',
    CFG,
    State,
    tick,
    collectDrawables,
    worldToTile: (x,y)=>worldToTile(x,y, State.tileSize||64)
  };

  LOG('loaded', { enabled: CFG.enabled });
})();
