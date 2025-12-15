/* ============================================================================
 * Datei   : core/map.decorations.js
 * Projekt : Neue Siedler – Epoche 1
 * Version : v25.12.15-mapdecorations-deco-atlas-v3 (VARI-SIZE + TILT + WOBBLE)
 *
 * Wunsch-Umsetzung (dein Feedback):
 *   - Unterschiedliche Größen pro Deko-Typ (und leicht pro Objekt zufällig)
 *   - Kleine Neigung links/rechts (Tilt) + lebendiges "Wachstums"-Loop (sehr langsam)
 *   - Pro Typ EINSTELLBAR (baseScale / randScale / rotDeg / wobble)
 *
 * Hinweis:
 *   - Wir rotieren Frames selbst (ctx.rotate) anhand der Atlas-Frame-Daten.
 *   - Kein Gameplay-Effekt: rein dekorativ, non-blocking.
 * ========================================================================== */

(function(){
  'use strict';

  // =========================================================================
  // LOGGING
  // =========================================================================
  const TAG  = '[map.decorations]';
  const LOG  = (window.CBLog?.ok    || console.log ).bind(console, TAG);
  const WARN = (window.CBLog?.warn  || console.warn).bind(console, TAG);

  // =========================================================================
  // TILE-LEGEND (map-epoch1.json) fileciteturn2file16
  // =========================================================================
  const TILE = { GRASS:1, FOREST:5, ROCK:6, WATER:8, SAND:9 };

  // =========================================================================
  // CFG – HIER stellst du deine Größen/Varianz pro Typ ein
  // =========================================================================
  const CFG = {
    atlasName: 'deco_plants_mega_atlas',

    // ---------------------------------------------------------------
    // Dichte (Counts) – mehr/ weniger Deko insgesamt
    // ---------------------------------------------------------------
    counts: {
      grassClumps: 78,
      shrubs:      42,
      flowers:     30,
      mushrooms:   18,
      cattails:    14,
      waterlily:    9,
      logs:         5,
      rocksSmall:  12,
      rocksLarge:   7,
      boulders:     4
    },

    // ---------------------------------------------------------------
    // Patch/Cluster: kleine Gruppen, dazwischen Platz
    // ---------------------------------------------------------------
    clusterChance: {
      grassClumps: 0.62,
      shrubs:      0.44,
      flowers:     0.58,
      mushrooms:   0.70,
      cattails:    0.65,
      waterlily:   0.70,
      logs:        0.30,
      rocksSmall:  0.30,
      rocksLarge:  0.25,
      boulders:    0.20
    },
    clusterRadius: {
      grassClumps: 2,
      flowers:     2,
      mushrooms:   2,
      shrubs:      3,
      cattails:    2,
      waterlily:   2,
      logs:        2,
      rocksSmall:  2,
      rocksLarge:  2,
      boulders:    2
    },

    // ---------------------------------------------------------------
    // Position-Jitter (innerhalb der Tile)
    // ---------------------------------------------------------------
    jitter: { px: 0.18, py: 0.10 },

    // ---------------------------------------------------------------
    // GRÖSSEN/VARIANZ pro Typ
    //
    // baseScale: Basis (relativ zu tileSize; wird später mit ts/256 multipliziert)
    // randScale: Zufallsabweichung (0.20 = ±20% um baseScale)
    //
    // Beispiel: Pilze kleiner + stark variieren:
    //   mushrooms.baseScale runter / randScale hoch
    // ---------------------------------------------------------------
    size: {
      grassClumps: { baseScale: 0.62, randScale: 0.25 },
      shrubs:      { baseScale: 0.78, randScale: 0.30 }, // Büsche dürfen deutlich variieren
      flowers:     { baseScale: 0.58, randScale: 0.28 },
      mushrooms:   { baseScale: 0.44, randScale: 0.35 }, // kleiner, aber mit "Wachstum"
      cattails:    { baseScale: 0.70, randScale: 0.22 },
      waterlily:   { baseScale: 0.62, randScale: 0.20 }, // Seerosen kleiner machen hier!
      logs:        { baseScale: 0.82, randScale: 0.18 },
      rocksSmall:  { baseScale: 0.65, randScale: 0.20 },
      rocksLarge:  { baseScale: 0.72, randScale: 0.18 },
      boulders:    { baseScale: 0.78, randScale: 0.15 }
    },

    // ---------------------------------------------------------------
    // TILT (Neigung) pro Typ – in Grad
    // randRotDeg: Zufalls-Neigung pro Objekt
    // wobbleRotDeg: sehr langsame Mini-Schwingung (lebendig)
    // ---------------------------------------------------------------
    tilt: {
      grassClumps: { randRotDeg: 2.0, wobbleRotDeg: 1.2 },
      shrubs:      { randRotDeg: 3.0, wobbleRotDeg: 1.4 },
      flowers:     { randRotDeg: 3.2, wobbleRotDeg: 1.6 },
      mushrooms:   { randRotDeg: 2.8, wobbleRotDeg: 1.8 },
      cattails:    { randRotDeg: 3.0, wobbleRotDeg: 1.2 },
      waterlily:   { randRotDeg: 2.0, wobbleRotDeg: 0.8 },
      logs:        { randRotDeg: 4.0, wobbleRotDeg: 0.6 },
      rocksSmall:  { randRotDeg: 3.0, wobbleRotDeg: 0.4 },
      rocksLarge:  { randRotDeg: 2.0, wobbleRotDeg: 0.3 },
      boulders:    { randRotDeg: 1.5, wobbleRotDeg: 0.2 }
    },

    // ---------------------------------------------------------------
    // "Wachstums"-Loop: extrem subtiler Scale-Loop
    // wobbleScale: Amplitude (0.03 = ±3%)
    // speedMin/Max: langsam! (Sekunden-Frequenz)
    // ---------------------------------------------------------------
    wobble: {
      enabled: true,
      perKind: {
        grassClumps: { wobbleScale: 0.018, speedMin: 0.10, speedMax: 0.20 },
        shrubs:      { wobbleScale: 0.020, speedMin: 0.08, speedMax: 0.18 },
        flowers:     { wobbleScale: 0.028, speedMin: 0.10, speedMax: 0.22 },
        mushrooms:   { wobbleScale: 0.035, speedMin: 0.06, speedMax: 0.14 }, // langsam & "wachsend"
        cattails:    { wobbleScale: 0.020, speedMin: 0.10, speedMax: 0.18 },
        waterlily:   { wobbleScale: 0.022, speedMin: 0.07, speedMax: 0.14 },
        logs:        { wobbleScale: 0.006, speedMin: 0.05, speedMax: 0.10 },
        rocksSmall:  { wobbleScale: 0.004, speedMin: 0.05, speedMax: 0.10 },
        rocksLarge:  { wobbleScale: 0.003, speedMin: 0.05, speedMax: 0.10 },
        boulders:    { wobbleScale: 0.002, speedMin: 0.05, speedMax: 0.10 }
      }
    },

    sortByY: true
  };

  // =========================================================================
  // STATE
  // =========================================================================
  const State = {
    initialized: false,
    seed: (Math.random()*1e9)|0,
    // nodes: { id, kind, x,y, frame, ox,oy, sMul, rotBase, phase, speed, phase2, speed2 }
    nodes: []
  };

  // =========================================================================
  // RNG
  // =========================================================================
  function mulberry32(a){
    return function(){
      let t = a += 0x6D2B79F5;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // =========================================================================
  // MAP HELPERS
  // =========================================================================
  function getMap(){ return (window.GameMap && window.GameMap._state) ? window.GameMap._state : (window.Map||null); }
  function getGrid(map){ return map ? (map.grid || map.tiles || null) : null; }
  function getColsRows(map){
    const g = getGrid(map);
    const rows = (map?.rows|0) || (Array.isArray(g) ? g.length : 0);
    const cols = (map?.cols|0) || (Array.isArray(g?.[0]) ? g[0].length : 0);
    return { cols, rows };
  }
  function getTileId(x,y){
    const map = getMap(); const g = getGrid(map);
    const row = g?.[y]; return row ? (row[x]|0) : 0;
  }
  function isInside(x,y){
    const map = getMap(); const {cols, rows} = getColsRows(map);
    return (x>=0 && y>=0 && x<cols && y<rows);
  }

  const isWater  = (x,y)=> getTileId(x,y)===TILE.WATER;
  const isSand   = (x,y)=> getTileId(x,y)===TILE.SAND;
  const isGrass  = (x,y)=> getTileId(x,y)===TILE.GRASS;
  const isForest = (x,y)=> getTileId(x,y)===TILE.FOREST;
  const isRock   = (x,y)=> getTileId(x,y)===TILE.ROCK;

  function countNeighbors4(x,y, predicate){
    let c=0;
    if (predicate(x+1,y)) c++;
    if (predicate(x-1,y)) c++;
    if (predicate(x,y+1)) c++;
    if (predicate(x,y-1)) c++;
    return c;
  }
  function isShoreWaterTile(x,y){
    if (!isWater(x,y)) return false;
    const land = (nx,ny)=>isInside(nx,ny) && !isWater(nx,ny);
    return countNeighbors4(x,y, land) > 0;
  }
  function isLandNextToWater(x,y){
    if (!isInside(x,y) || isWater(x,y)) return false;
    const w = (nx,ny)=>isInside(nx,ny) && isWater(nx,ny);
    return countNeighbors4(x,y, w) > 0;
  }

  // optional: keine Überdeckung mit Ressourcen
  function isOccupiedByResource(x,y){
    const res = window.MapResources?.state?.nodes;
    if (!Array.isArray(res)) return false;
    return res.some(n => n && n.x===x && n.y===y);
  }
  function isOccupiedByDeco(x,y){
    return State.nodes.some(n => n.x===x && n.y===y);
  }

  // =========================================================================
  // FRAME PICKER (Prefixe aus deinem Deco-Atlas) fileciteturn3file4
  // =========================================================================
  function pickByPrefix(prefix){
    const A = window.Assets;
    if (!A || !A.state?.ready) return null;
    return A.pickRandomFrame(CFG.atlasName, prefix);
  }
  function pickFrameForKind(kind){
    switch (kind){
      case 'grassClumps': return pickByPrefix('deco_grass_clump_');
      case 'shrubs':      return (Math.random() < 0.18) ? pickByPrefix('deco_shrub_berries_') : pickByPrefix('deco_shrub_round_');
      case 'flowers':     return (Math.random() < 0.55) ? pickByPrefix('deco_flowers_blue_') : pickByPrefix('deco_flowers_yellow_');
      case 'mushrooms':   return (Math.random() < 0.55) ? pickByPrefix('deco_mushroom_red_') : pickByPrefix('deco_mushroom_brown_');
      case 'cattails':    return pickByPrefix('deco_cattails_');
      case 'waterlily':   return pickByPrefix('deco_waterlily_');
      case 'logs':        return pickByPrefix('deco_log_');
      case 'rocksSmall':  return pickByPrefix('deco_rocks_small_');
      case 'rocksLarge':  return pickByPrefix('deco_rocks_large_');
      case 'boulders':    return pickByPrefix('deco_boulder_');
      default: return null;
    }
  }

  // =========================================================================
  // PLACEMENT RULES (tunen nach Geschmack)
  // =========================================================================
  function canPlace(kind, x,y){
    if (!isInside(x,y)) return false;
    if (isOccupiedByDeco(x,y)) return false;
    if (isOccupiedByResource(x,y)) return false;

    if (kind === 'waterlily') return isShoreWaterTile(x,y);

    if (kind === 'cattails'){
      if (!isLandNextToWater(x,y)) return false;
      return isSand(x,y) || isGrass(x,y);
    }

    if (kind === 'mushrooms'){
      if (isForest(x,y)) return true;
      if (isGrass(x,y)){
        const nearForest = (nx,ny)=>isInside(nx,ny) && isForest(nx,ny);
        return countNeighbors4(x,y, nearForest) > 0;
      }
      return false;
    }

    if (kind === 'logs'){
      if (isForest(x,y)) return true;
      if (isGrass(x,y)){
        const nearForest = (nx,ny)=>isInside(nx,ny) && isForest(nx,ny);
        return countNeighbors4(x,y, nearForest) > 0;
      }
      return false;
    }

    if (kind === 'rocksLarge' || kind === 'boulders') return isRock(x,y);

    if (kind === 'rocksSmall'){
      if (isWater(x,y)) return false;
      return isSand(x,y) || isRock(x,y) || isGrass(x,y);
    }

    if (kind === 'shrubs')      return isGrass(x,y) || isForest(x,y);
    if (kind === 'grassClumps') return isGrass(x,y) || isSand(x,y);

    if (kind === 'flowers'){
      if (isGrass(x,y)) return true;
      if (isForest(x,y)) return Math.random() < 0.10;
      return false;
    }

    return false;
  }

  // =========================================================================
  // ROTATED DRAW (wir kopieren das Prinzip aus Assets.drawAtlasFrame)
  // =========================================================================
  function isDrawableImage(img){
    return !!(img && img.complete && img.naturalWidth > 0 && img.naturalHeight > 0);
  }

  function drawAtlasFrameRot(ctx, atlasName, frameName, worldX, worldY, scale, rotRad){
    const A = window.Assets;
    if (!A) return false;

    // getAtlas ist public in core/asset.js fileciteturn5file0
    const a = A.getAtlas?.(atlasName);
    if (!a || !a.ok || !isDrawableImage(a.img)) return false;

    const fr = a.frames?.[frameName];
    if (!fr) return false;

    const dw = fr.w * scale;
    const dh = fr.h * scale;

    // Pivot-Align: worldX/worldY ist Pivot-Punkt in WORLD
    const dx = - (fr.pivotX * scale);
    const dy = - (fr.pivotY * scale);

    try{
      ctx.save();
      ctx.translate(worldX, worldY);
      if (rotRad) ctx.rotate(rotRad);
      ctx.drawImage(a.img, fr.x, fr.y, fr.w, fr.h, dx, dy, dw, dh);
      ctx.restore();
      return true;
    }catch(e){
      try{ ctx.restore(); }catch(_){}
      return false;
    }
  }

  // =========================================================================
  // SPAWN
  // =========================================================================
  function spawn(kind, count, rng){
    const map = getMap();
    const g = getGrid(map);
    const {cols, rows} = getColsRows(map);
    if (!g || !cols || !rows) return;

    const listOfThisKind = ()=>State.nodes.filter(n => n.kind === kind);

    function pickBase(){
      const list = listOfThisKind();
      if (list.length && rng() < (CFG.clusterChance[kind] ?? 0.0)){
        return list[(rng()*list.length)|0];
      }
      return null;
    }

    const rad = Math.max(1, (CFG.clusterRadius[kind] ?? 2)|0);

    let tries = 0;
    let made  = 0;

    while (made < count && tries < count*170){
      tries++;

      const base = pickBase();
      let x, y;

      if (base){
        x = base.x + ((rng()*(rad*2+1))|0) - rad;
        y = base.y + ((rng()*(rad*2+1))|0) - rad;
      } else {
        x = (rng()*cols)|0;
        y = (rng()*rows)|0;
      }

      if (!canPlace(kind, x,y)) continue;

      // ---- per-object Variation ------------------------------------------------
      const sCfg = CFG.size[kind] || { baseScale: 0.7, randScale: 0.2 };
      const tCfg = CFG.tilt[kind] || { randRotDeg: 2, wobbleRotDeg: 1 };

      const sMul = 1 + ((rng()*2)-1) * (sCfg.randScale ?? 0.0);
      const rotBase = (((rng()*2)-1) * (tCfg.randRotDeg ?? 0.0)) * (Math.PI/180);

      const wCfg = CFG.wobble.perKind[kind] || { wobbleScale: 0.0, speedMin: 0.05, speedMax: 0.10 };
      const phase  = rng() * Math.PI * 2;
      const phase2 = rng() * Math.PI * 2;
      const speed  = (wCfg.speedMin ?? 0.05) + rng() * ((wCfg.speedMax ?? 0.10) - (wCfg.speedMin ?? 0.05));
      const speed2 = (wCfg.speedMin ?? 0.05) + rng() * ((wCfg.speedMax ?? 0.10) - (wCfg.speedMin ?? 0.05));

      const frame = pickFrameForKind(kind);

      State.nodes.push({
        id: `${kind}:${State.nodes.length}`,
        kind, x, y,
        frame,

        // Tile jitter
        ox: ((rng()*2)-1) * (CFG.jitter.px ?? 0),
        oy: ((rng()*2)-1) * (CFG.jitter.py ?? 0),

        // Variation
        sBase: (sCfg.baseScale ?? 0.7),
        sMul,
        rotBase,

        // Wobble
        phase, phase2, speed, speed2
      });

      made++;
    }

    LOG('spawn', kind, { want: count, made, tries, rad });
  }

  function _mapIsReady(){
    const map = getMap();
    const g = getGrid(map);
    const {cols, rows} = getColsRows(map);
    return !!(g && cols>0 && rows>0);
  }

  function init(seed){
    if (State.initialized) return;
    if (typeof seed === 'number') State.seed = seed|0;
    const rng = mulberry32(State.seed);

    // Reihenfolge: fein -> groß
    spawn('grassClumps', CFG.counts.grassClumps, rng);
    spawn('flowers',     CFG.counts.flowers,     rng);
    spawn('shrubs',      CFG.counts.shrubs,      rng);
    spawn('mushrooms',   CFG.counts.mushrooms,   rng);

    spawn('cattails',    CFG.counts.cattails,    rng);
    spawn('waterlily',   CFG.counts.waterlily,   rng);

    spawn('logs',        CFG.counts.logs,        rng);
    spawn('rocksSmall',  CFG.counts.rocksSmall,  rng);
    spawn('rocksLarge',  CFG.counts.rocksLarge,  rng);
    spawn('boulders',    CFG.counts.boulders,    rng);

    if (CFG.sortByY) State.nodes.sort((a,b)=> (a.y-b.y) || (a.x-b.x));

    State.initialized = true;
    LOG('init ok', { seed: State.seed, nodes: State.nodes.length });
  }

  // =========================================================================
  // DRAW
  // =========================================================================
  function drawOnMainCanvas(ctx, cam, tileSize){
    if (!ctx) return;

    if (!State.initialized){
      if (!_mapIsReady()) return;
      init();
    }

    const ts = tileSize || (window.GameMap?.tileSize) || 64;
    const baseAtlasScale = ts / 256; // Atlas sourceSize ~256 fileciteturn3file0

    // Zeit (Sekunden) für Loop
    const t = (typeof performance !== 'undefined' && performance.now) ? (performance.now() * 0.001) : (Date.now() * 0.001);

    for (const n of State.nodes){
      // world pos (wie Ressourcen)
      const wx = (n.x * ts) + ts * (0.5 + (n.ox || 0));
      const wy = (n.y * ts) + ts * (0.82 + (n.oy || 0));

      // Scale & Tilt Variation + langsamer Loop
      const wCfg = CFG.wobble.perKind[n.kind] || { wobbleScale: 0.0, speedMin: 0.05, speedMax: 0.10 };
      const wobbleScale = (CFG.wobble.enabled ? (wCfg.wobbleScale ?? 0.0) : 0.0);

      const tiltCfg = CFG.tilt[n.kind] || { wobbleRotDeg: 0.0 };
      const wobbleRotDeg = (CFG.wobble.enabled ? (tiltCfg.wobbleRotDeg ?? 0.0) : 0.0);
      const wobbleRot = wobbleRotDeg * (Math.PI/180);

      const sLoop = wobbleScale ? (1 + wobbleScale * Math.sin(t * (n.speed || 0.1) + (n.phase || 0))) : 1;
      const rLoop = wobbleRot ? (wobbleRot * Math.sin(t * (n.speed2 || 0.08) + (n.phase2 || 0))) : 0;

      const scale = baseAtlasScale * (n.sBase || 0.7) * (n.sMul || 1) * sLoop;
      const rot   = (n.rotBase || 0) + rLoop;

      // Draw rotated
      if (n.frame){
        const ok = drawAtlasFrameRot(ctx, CFG.atlasName, n.frame, wx, wy, scale, rot);
        if (ok) continue;
      }

      // Fallback Kreis (wenn Atlas fehlt)
      ctx.save();
      ctx.fillStyle = 'rgba(0,200,0,0.70)';
      if (n.kind === 'waterlily') ctx.fillStyle = 'rgba(20,170,120,0.85)';
      if (n.kind === 'rocksSmall' || n.kind === 'rocksLarge' || n.kind === 'boulders') ctx.fillStyle = 'rgba(160,160,160,0.85)';
      ctx.beginPath();
      ctx.arc(wx, wy, ts * 0.09, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  // =========================================================================
  // TOOLS API (regen/clear/snapshot/export)
  // =========================================================================
  function _resetState(keepSeed=true){
    const s = State.seed;
    State.initialized = false;
    State.nodes.length = 0;
    if (keepSeed) State.seed = s;
  }

  function snapshot(options = {}){
    const limit = Number.isFinite(options.limit) ? options.limit : 300;
    const sample = State.nodes.slice(0, Math.max(0, limit)).map(n => ({
      id:n.id, kind:n.kind, x:n.x, y:n.y, frame:n.frame||null,
      sBase:n.sBase, sMul:n.sMul, rotBase:n.rotBase,
      ox:n.ox??0, oy:n.oy??0
    }));
    return {
      version: window.MapDecorations?.version || 'unknown',
      initialized: State.initialized,
      seed: State.seed,
      counts: { nodes: State.nodes.length },
      sample,
      note: (State.nodes.length > limit) ? `sample limited to ${limit}` : 'full list (<= limit)'
    };
  }

  function exportJSON(pretty=true){
    const payload = {
      id: (getMap()?.id) || 'unknown-map',
      seed: State.seed,
      nodes: State.nodes.map(n => ({
        kind:n.kind, x:n.x, y:n.y, frame:n.frame||null,
        sBase:n.sBase, sMul:n.sMul, rotBase:n.rotBase,
        ox:n.ox??0, oy:n.oy??0
      }))
    };
    return JSON.stringify(payload, null, pretty ? 2 : 0);
  }

  function regen(seed){
    if (Number.isFinite(seed)) State.seed = seed|0;
    _resetState(true);
    if (_mapIsReady()){
      init(State.seed);
      window.dispatchEvent(new CustomEvent('cb:mapdeco:changed', { detail: snapshot() }));
      return true;
    }
    window.dispatchEvent(new CustomEvent('cb:mapdeco:changed', { detail: snapshot({limit:50}) }));
    return false;
  }

  function clear(){
    _resetState(true);
    State.initialized = true; // kein auto-init
    window.dispatchEvent(new CustomEvent('cb:mapdeco:changed', { detail: snapshot() }));
  }

  window.addEventListener('req:mapdeco:snapshot', ()=>{
    window.dispatchEvent(new CustomEvent('cb:mapdeco:snapshot', { detail: snapshot() }));
  });
  window.addEventListener('req:mapdeco:regen', (e)=>{
    const seed = e?.detail?.seed;
    const ok = regen(seed);
    window.dispatchEvent(new CustomEvent('cb:mapdeco:regen', { detail: { ok, seed: State.seed, snap: snapshot() } }));
  });
  window.addEventListener('req:mapdeco:clear', ()=>{
    clear();
    window.dispatchEvent(new CustomEvent('cb:mapdeco:clear', { detail: snapshot() }));
  });

  // =========================================================================
  // PUBLIC
  // =========================================================================
  window.MapDecorations = {
    version: 'v25.12.15-mapdecorations-deco-atlas-v3',
    state: State,
    cfg: CFG,
    init,
    drawOnMainCanvas,
    regen,
    clear,
    snapshot,
    exportJSON
  };

  LOG('bereit', window.MapDecorations.version);

})();