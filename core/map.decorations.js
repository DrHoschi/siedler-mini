/* ============================================================================
 * Datei   : core/map.decorations.js
 * Projekt : Neue Siedler – Epoche 1
 * Version : v25.12.15-mapdecorations-deco-atlas-v2 (SMALLER + PATCHY)
 *
 * Änderungen ggü. v1:
 *   - Deko insgesamt deutlich kleiner (v.a. Pilze/Blumen/Gras)
 *   - Mehr "kleine Anhäufungen" (Cluster-Radius pro Typ), dazwischen mehr Platz
 *   - Counts reduziert, Cluster-Chance für kleine Pflanzen leicht erhöht
 * ========================================================================== */

(function(){
  'use strict';

  const TAG  = '[map.decorations]';
  const LOG  = (window.CBLog?.ok    || console.log ).bind(console, TAG);
  const WARN = (window.CBLog?.warn  || console.warn).bind(console, TAG);

  // Tile-Legende aus map-epoch1.json fileciteturn2file16
  const TILE = { GRASS:1, FOREST:5, ROCK:6, WATER:8, SAND:9 };

  const CFG = {
    atlasName: 'deco_plants_mega_atlas',

    // ---------------------------------------------------------------
    // DICHTE: weniger insgesamt -> mehr Platz
    // ---------------------------------------------------------------
    counts: {
      grassClumps: 70,
      shrubs:      38,
      flowers:     26,
      mushrooms:   16,
      cattails:    14,
      waterlily:    8,
      logs:         5,
      rocksSmall:  12,
      rocksLarge:   7,
      boulders:     4
    },

    // ---------------------------------------------------------------
    // CLUSTER: kleine Pflanzen dürfen eher "patchy" wachsen
    // ---------------------------------------------------------------
    clusterChance: {
      grassClumps: 0.62,
      shrubs:      0.42,
      flowers:     0.58,
      mushrooms:   0.70,
      cattails:    0.65,
      waterlily:   0.70,
      logs:        0.30,
      rocksSmall:  0.30,
      rocksLarge:  0.25,
      boulders:    0.20
    },

    // ---------------------------------------------------------------
    // CLUSTER-RADIUS: kleinere Patches (statt große "Wolken")
    // Werte sind in Tiles (Radius 1..4)
    // ---------------------------------------------------------------
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
    // GRÖSSE: deutlich kleiner (Pilze waren zu groß)
    // ---------------------------------------------------------------
    drawScale: {
      grassClumps: 0.62,
      shrubs:      0.78,
      flowers:     0.58,
      mushrooms:   0.45,
      cattails:    0.70,
      waterlily:   0.70,
      logs:        0.82,
      rocksSmall:  0.65,
      rocksLarge:  0.72,
      boulders:    0.78
    },

    // weniger Jitter: wirkt ruhiger/gezielter
    jitter: { px: 0.16, py: 0.08 },

    sortByY: true
  };

  const State = {
    initialized: false,
    seed: (Math.random()*1e9)|0,
    nodes: []
  };

  function mulberry32(a){
    return function(){
      let t = a += 0x6D2B79F5;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

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

  function isOccupiedByResource(x,y){
    const res = window.MapResources?.state?.nodes;
    if (!Array.isArray(res)) return false;
    return res.some(n => n && n.x===x && n.y===y);
  }
  function isOccupiedByDeco(x,y){
    return State.nodes.some(n => n.x===x && n.y===y);
  }

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

    while (made < count && tries < count*160){
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

      const frame = pickFrameForKind(kind);
      State.nodes.push({
        id: `${kind}:${State.nodes.length}`,
        kind,
        x, y,
        frame,
        ox: ((rng()*2)-1) * CFG.jitter.px,
        oy: ((rng()*2)-1) * CFG.jitter.py
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

  function drawOnMainCanvas(ctx, cam, tileSize){
    if (!ctx) return;

    if (!State.initialized){
      if (!_mapIsReady()) return;
      init();
    }

    const ts = tileSize || (window.GameMap?.tileSize) || 64;
    const A  = window.Assets;

    for (const n of State.nodes){
      const wx = (n.x * ts) + ts * (0.5 + (n.ox || 0));
      const wy = (n.y * ts) + ts * (0.82 + (n.oy || 0));

      if (A && A.state?.ready && n.frame){
        const scale = (CFG.drawScale[n.kind] ?? 1.0);
        const ok = A.drawAtlasFrame(ctx, CFG.atlasName, n.frame, wx, wy, {
          scale: (ts/256) * scale,
          align: 'pivot'
        });
        if (ok) continue;
      }

      ctx.save();
      ctx.fillStyle = 'rgba(0,200,0,0.75)';
      if (n.kind === 'waterlily') ctx.fillStyle = 'rgba(20,170,120,0.85)';
      if (n.kind === 'rocksSmall' || n.kind === 'rocksLarge' || n.kind === 'boulders') ctx.fillStyle = 'rgba(160,160,160,0.85)';
      ctx.beginPath();
      ctx.arc(wx, wy, ts * 0.09, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  function _resetState(keepSeed=true){
    const s = State.seed;
    State.initialized = false;
    State.nodes.length = 0;
    if (keepSeed) State.seed = s;
  }

  function snapshot(options = {}){
    const limit = Number.isFinite(options.limit) ? options.limit : 300;
    const nodes = State.nodes.slice(0, Math.max(0, limit)).map(n => ({
      id:n.id, kind:n.kind, x:n.x, y:n.y, frame:n.frame||null, ox:n.ox??0, oy:n.oy??0
    }));
    return {
      version: window.MapDecorations?.version || 'unknown',
      initialized: State.initialized,
      seed: State.seed,
      counts: { nodes: State.nodes.length },
      sample: nodes,
      note: (State.nodes.length > limit) ? `sample limited to ${limit}` : 'full list (<= limit)'
    };
  }

  function exportJSON(pretty=true){
    const payload = {
      id: (getMap()?.id) || 'unknown-map',
      seed: State.seed,
      nodes: State.nodes.map(n => ({ kind:n.kind, x:n.x, y:n.y, frame:n.frame||null, ox:n.ox??0, oy:n.oy??0 }))
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
    State.initialized = true;
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

  window.MapDecorations = {
    version: 'v25.12.15-mapdecorations-deco-atlas-v2',
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
