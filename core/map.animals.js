/* ============================================================================
 * Datei    : core/map.animals.js
 * Projekt  : Neue Siedler – MapAnimals (Wildtiere)
 * Version  : v26.01.04-mapanimals-stable-ysort-init
 *
 * Ziel (FINAL, stabil):
 *  - Tiere erscheinen zuverlässig auf der Map (auch wenn cb:map:ready bereits vorbei ist)
 *  - Rendering läuft über den bestehenden GLOBAL Y-SORT Pfad (core/game.map.js)
 *  - Keine harten Abhängigkeiten an Game/Boot → nur GameMap + Assets (wenn da)
 *  - Tiere laufen NICHT auf Wasser
 *  - Spawn bevorzugt baumreiche Bereiche (über MapResources), hat aber Fallback (nie 0 Tiere)
 *  - Richtungs-Mapping kompatibel zu deinen Atlanten:
 *      N → NE → E → SE → S → SW → W → NW   (Uhrzeigersinn)
 *
 * WICHTIG:
 *  - Das Projekt rendert Ressourcen/Deko/Tiere über:
 *      GameMap.drawWorldGlobalYSort() → MapAnimals.collectDrawables(z, cam, ts)
 *    Daher MUSS collectDrawables() Einträge pushen mit:
 *      { sortY, z, kind, draw(ctx) }
 *    (NICHT "y:" oder andere Property-Namen)
 * ========================================================================== */
(function(){
  'use strict';

  // -------------------------------------------------------------------------
  // LOG HELPERS (Inspector kompatibel)
  // -------------------------------------------------------------------------
  const TAG  = '[MapAnimals]';
  const LOG  = (...a)=>(window.CBLog?.info || console.info)(TAG, ...a);
  const WARN = (...a)=>(window.CBLog?.warn || console.warn)(TAG, ...a);

  // -------------------------------------------------------------------------
  // CONFIG
  // -------------------------------------------------------------------------
  const CFG = {
    VERSION: 'v26.01.04-mapanimals-stable-ysort-init',

    enabled: true,

    // Wenn deine Atlanten links/rechts gespiegelt wirken:
    // - true  => E/W (+ Diagonalen) werden geswapped
    // - false => normal
    //
    // Du hattest zuletzt gesagt: "Alle Uhrzeiger sind so auf" und EW kann falsch wirken.
    // -> Default: false (sauberer Standard). Falls dein Hirsch auf Map wieder "falsch" ist:
    //    setze in DevTools: window.MapAnimals.CFG.flipEW = true;
    flipEW: false,

    // Anzahl Tiere (Limit, damit es nicht eskaliert)
    maxPerType: {
      deer:   8,
      fox:    6,
      boar:   4,
      rabbit: 10,
    },

    // Scale pro Tierart (deine Vorgaben)
    // (Zusätzlich wird im Draw der TileScale ts/128 mit eingerechnet, wie bei anderen Atlanten.)
    scale: {
      deer:   0.35,
      fox:    0.30,
      boar:   0.35,
      rabbit: 0.30,
    },

    // Atlas Keys + Prefix pro Tierart
    // Frame-Namen: <prefix>_<DIR>_walk_<i>
    species: {
      deer:   { atlas:'deer_sprite_atlas',   prefix:'deer'   },
      fox:    { atlas:'fox_sprite_atlas',    prefix:'fox'    },
      boar:   { atlas:'boar_sprite_atlas',   prefix:'boar'   },
      rabbit: { atlas:'rabbit_sprite_atlas', prefix:'rabbit' },
    },

    // Bewegung (in TILES pro Sekunde, unabhängig vom Pixel-Scale)
    moveTilesPerSec: 0.40,          // Grundspeed (kannst du später im Inspector regeln)
    retargetMinTiles: 2.0,
    retargetMaxTiles: 9.0,
    retargetCooldownMs: 350,

    // Forest Spawn Heuristik
    forestCandidates: 48,
    forestRadiusTiles: 6.0,         // Umkreis zum "besten" Baumcluster
    minDistToHQTiles: 4.0,          // nicht direkt am HQ spawnen (wenn HQ bekannt)
    fallbackTries: 120,

    // Debug
    logSpawns: false,
  };

  // -------------------------------------------------------------------------
  // INTERNAL STATE
  // -------------------------------------------------------------------------
  const State = {
    initialized: false,
    lastNow: 0,

    cols: 0,
    rows: 0,
    tileSize: 64,

    // Wasser-IDs aus Tileset-Legende (Set<number>)
    waterIds: null,

    // Tiere: x/y sind FLOAT tiles (nicht Pixel)
    animals: [],

    // Tree nodes (tile coords) aus MapResources
    treeNodes: null,

    // HQ (tile coords) – optional
    hqX: null,
    hqY: null,
  };

  // -------------------------------------------------------------------------
  // SMALL HELPERS
  // -------------------------------------------------------------------------
  function _nowSec(){
    const t = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
    return t * 0.001;
  }

  function _clamp(v,a,b){ return Math.max(a, Math.min(b, v)); }

  function _rand(min,max){ return min + Math.random()*(max-min); }

  function _randInt(min,maxIncl){ return Math.floor(min + Math.random()*(maxIncl-min+1)); }

  function _dist2(ax,ay,bx,by){ const dx=bx-ax, dy=by-ay; return dx*dx+dy*dy; }

  function _mapIsReady(){
    const st = window.GameMap?._state;
    return !!(st && st.grid && st.cols && st.rows);
  }

  function _computeWaterIds(){
    // Versuche, Wasser-IDs aus der Legend zu extrahieren (wie andere Module)
    try{
      const legend = window.GameMap?._state?.legend;
      const out = new Set();
      if (!legend) return out;

      if (legend.idByName){
        for (const [name,id] of Object.entries(legend.idByName)){
          if (String(name).toLowerCase().includes('water')) out.add(Number(id));
        }
      }
      if (legend.terrainNameById){
        for (const [id,name] of Object.entries(legend.terrainNameById)){
          if (String(name).toLowerCase().includes('water')) out.add(Number(id));
        }
      }
      if (Array.isArray(legend.names) && Array.isArray(legend.ids) && legend.names.length===legend.ids.length){
        for (let i=0;i<legend.names.length;i++){
          if (String(legend.names[i]).toLowerCase().includes('water')) out.add(Number(legend.ids[i]));
        }
      }
      return out;
    }catch{
      return new Set();
    }
  }

  function _getTerrainId(tx,ty){
    const st = window.GameMap?._state;
    const grid = st?.grid;
    if (!grid) return null;

    // 2D grid
    if (Array.isArray(grid) && Array.isArray(grid[0])){
      const row = grid[ty];
      return row ? row[tx] : null;
    }

    // flat grid
    if (Array.isArray(grid)){
      const idx = ty * State.cols + tx;
      return grid[idx];
    }

    return null;
  }

  function _isInside(tx,ty){
    return (tx>=0 && ty>=0 && tx<State.cols && ty<State.rows);
  }

  function _isWaterTile(tx,ty){
    if (!_isInside(tx,ty)) return true; // out of bounds = block
    const ids = State.waterIds;
    if (!ids || !ids.size) return false; // unbekannt → nicht blocken
    const id = _getTerrainId(tx,ty);
    if (id == null) return false;
    return ids.has(Number(id));
  }

  function _refreshTreeNodes(){
    // Wir versuchen, Tree-Nodes aus MapResources zu lesen.
    // MapResources nutzt "State.nodes" (siehe Monolith) und kind === 'tree'.
    const MR = window.MapResources;
    const st = MR?._state || MR?.State || MR?.state || MR?.STATE;
    const nodes = st?.nodes;
    if (!Array.isArray(nodes)) { State.treeNodes = null; return; }

    // Nodes sind tile coords: {x,y,kind:'tree', ...}
    const trees = nodes.filter(n => n && n.kind === 'tree' && typeof n.x==='number' && typeof n.y==='number');
    State.treeNodes = (trees.length ? trees : null);
  }

  function _countByKind(kind){
    let c=0;
    for (const a of State.animals) if (a.kind===kind) c++;
    return c;
  }

  // -------------------------------------------------------------------------
  // DIRECTION (Clockwise) – returns 'N','NE','E','SE','S','SW','W','NW'
  // -------------------------------------------------------------------------
  function _dirFromDelta(dx,dy){
    // Tiles: x right positive, y down positive.
    // Für "N" brauchen wir dy < 0.
    const ang = (Math.atan2(-dy, dx) * 180 / Math.PI + 360) % 360;

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

    // EW flip (incl diagonals)
    if (dir === 'E')  return 'W';
    if (dir === 'W')  return 'E';
    if (dir === 'NE') return 'NW';
    if (dir === 'NW') return 'NE';
    if (dir === 'SE') return 'SW';
    if (dir === 'SW') return 'SE';
    return dir;
  }

  // -------------------------------------------------------------------------
  // INIT (lazy – called from collectDrawables)
  // -------------------------------------------------------------------------
  function init(){
    if (State.initialized) return;

    if (!_mapIsReady()) return;

    const st = window.GameMap._state;
    State.cols = Number(st.cols||0);
    State.rows = Number(st.rows||0);
    State.tileSize = Number(st.tileSize||window.GameMap.tileSize||64);

    State.waterIds = _computeWaterIds();

    // HQ optional (falls Game.buildings existiert)
    try{
      const list = window.Game?.buildings?.list;
      if (Array.isArray(list)){
        const hq = list.find(b => b && (b.id==='b.hq' || b.key==='b.hq' || b.type==='b.hq'));
        if (hq && typeof hq.x==='number' && typeof hq.y==='number'){
          State.hqX = hq.x;
          State.hqY = hq.y;
        }
      }
    }catch{/* ignore */}

    _refreshTreeNodes();

    State.lastNow = _nowSec();
    State.initialized = true;

    LOG('init ok',
      `cols=${State.cols} rows=${State.rows} ts=${State.tileSize}`,
      `waterIds=${State.waterIds ? State.waterIds.size : 0}`,
      `trees=${State.treeNodes ? State.treeNodes.length : 0}`
    );
  }

  // -------------------------------------------------------------------------
  // SPAWN
  // -------------------------------------------------------------------------
  function _pickForestSpawn(){
    const trees = State.treeNodes;
    if (!trees || trees.length < 10) return null;

    const tries = Math.min(CFG.forestCandidates, trees.length);
    let best = null;
    let bestScore = -1;

    const r2 = (CFG.forestRadiusTiles * CFG.forestRadiusTiles);

    for (let i=0;i<tries;i++){
      const t = trees[_randInt(0, trees.length-1)];
      const cx = t.x, cy = t.y;

      // sampling statt full scan
      let score = 0;
      const sample = Math.min(60, trees.length);
      for (let k=0;k<sample;k++){
        const tt = trees[_randInt(0, trees.length-1)];
        if (_dist2(cx,cy,tt.x,tt.y) <= r2) score++;
      }

      // nicht zu nah am HQ
      if (State.hqX!=null && State.hqY!=null){
        const min2 = CFG.minDistToHQTiles * CFG.minDistToHQTiles;
        if (_dist2(cx,cy,State.hqX,State.hqY) < min2) score -= 999;
      }

      if (score > bestScore){
        bestScore = score;
        best = { x: cx, y: cy };
      }
    }

    if (!best) return null;

    // Jitter um das Cluster
    const ang = _rand(0, Math.PI*2);
    const rad = _rand(0.6, CFG.forestRadiusTiles);
    const x = best.x + Math.cos(ang)*rad;
    const y = best.y + Math.sin(ang)*rad;

    const tx = Math.floor(_clamp(x, 0, State.cols-1));
    const ty = Math.floor(_clamp(y, 0, State.rows-1));
    if (_isWaterTile(tx,ty)) return null;

    return { x, y };
  }

  function _pickFallbackSpawn(){
    // random land tile, try many times
    for (let i=0;i<CFG.fallbackTries;i++){
      const tx = _randInt(0, State.cols-1);
      const ty = _randInt(0, State.rows-1);
      if (_isWaterTile(tx,ty)) continue;

      // nicht zu nah am HQ
      if (State.hqX!=null && State.hqY!=null){
        const min2 = CFG.minDistToHQTiles * CFG.minDistToHQTiles;
        if (_dist2(tx+0.5,ty+0.5,State.hqX+0.5,State.hqY+0.5) < min2) continue;
      }

      return { x: tx + 0.5, y: ty + 0.5 };
    }

    // ultra fallback: map center
    return { x: (State.cols*0.5), y: (State.rows*0.5) };
  }

  function _pickSpawn(){
    return _pickForestSpawn() || _pickFallbackSpawn();
  }

  function _chooseNewTarget(a){
    const baseAng = _rand(0, Math.PI*2);
    const baseDist = _rand(CFG.retargetMinTiles, CFG.retargetMaxTiles);

    for (let i=0;i<24;i++){
      const ang = baseAng + i*(Math.PI/12);
      const x = a.x + Math.cos(ang)*baseDist;
      const y = a.y + Math.sin(ang)*baseDist;

      const tx = Math.floor(_clamp(x, 0, State.cols-1));
      const ty = Math.floor(_clamp(y, 0, State.rows-1));
      if (_isWaterTile(tx,ty)) continue;

      a.tx = x;
      a.ty = y;
      a._retargetAt = Date.now();
      return;
    }

    a.tx = a.x;
    a.ty = a.y;
    a._retargetAt = Date.now();
  }

  function _ensureSpawns(){
    if (!CFG.enabled) return;

    for (const kind of Object.keys(CFG.species)){
      const max = Number(CFG.maxPerType?.[kind] || 0);
      if (max <= 0) continue;

      const cur = _countByKind(kind);
      const need = max - cur;
      if (need <= 0) continue;

      for (let i=0;i<need;i++){
        const p = _pickSpawn();
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
        _chooseNewTarget(a);
        State.animals.push(a);

        if (CFG.logSpawns){
          LOG('spawn', kind, `@(${a.x.toFixed(2)},${a.y.toFixed(2)})`);
        }
      }
    }
  }

  // -------------------------------------------------------------------------
  // UPDATE (time based)
  // -------------------------------------------------------------------------
  function _step(dt){
    // dt in seconds
    const speed = Number(CFG.moveTilesPerSec || 0);
    if (!(speed > 0)) return;

    for (const a of State.animals){
      const dx = a.tx - a.x;
      const dy = a.ty - a.y;
      const d2 = dx*dx + dy*dy;

      // Ziel erreicht → retarget (mit cooldown)
      if (d2 < 0.03*0.03){
        if ((Date.now() - (a._retargetAt||0)) > CFG.retargetCooldownMs){
          _chooseNewTarget(a);
        }
        continue;
      }

      a.dir = _dirFromDelta(dx,dy);

      const dist = Math.sqrt(d2) || 1;
      const vx = dx / dist;
      const vy = dy / dist;

      const nx = a.x + vx * speed * dt;
      const ny = a.y + vy * speed * dt;

      // Wasserblock
      const ntx = Math.floor(_clamp(nx, 0, State.cols-1));
      const nty = Math.floor(_clamp(ny, 0, State.rows-1));
      if (_isWaterTile(ntx, nty)){
        _chooseNewTarget(a);
        continue;
      }

      a.x = nx;
      a.y = ny;

      // Anim: 8 Frames
      a._animAcc += dt;
      const fps = 8;
      if (a._animAcc >= (1/fps)){
        a._animAcc = 0;
        a.animF = (a.animF + 1) % 8;
      }
    }
  }

  // -------------------------------------------------------------------------
  // DRAWABLES (GLOBAL Y-SORT)
  // -------------------------------------------------------------------------
  function collectDrawables(out, cam, tileSize){
    if (!Array.isArray(out)) return out;
    if (!CFG.enabled) return out;

    // Lazy init: wir hängen NICHT an cb:map:ready, weil das Event
    // je nach Script-Order schon vorbei sein kann.
    if (!State.initialized){
      if (!_mapIsReady()) return out;
      init();
    }

    // Nur zeichnen, wenn Assets wirklich ready sind
    const A = window.Assets;
    if (!A || !A.state?.ready || typeof A.drawAtlasFrame !== 'function'){
      // Kein Assets → kein Draw (bewusst, damit wir keine Dummy-Kreise haben)
      return out;
    }

    // TileSize aus Renderer ist authoritative
    const ts = Number(tileSize || State.tileSize || 64);
    State.tileSize = ts;

    // Update pro Frame (damit Tiere ohne extra Tick leben)
    const tNow = _nowSec();
    const dt = Math.min(0.05, Math.max(0, tNow - (State.lastNow || tNow)));
    State.lastNow = tNow;

    _refreshTreeNodes();
    _ensureSpawns();
    _step(dt);

    // Scale wie bei anderen Atlanten: ts/128 (deine Animal-Sheets sind 1024px/8=128px pro Tile)
    const baseAtlasScale = ts / 128;

    for (let i=0;i<State.animals.length;i++){
      const a = State.animals[i];
      const spec = CFG.species[a.kind];
      if (!spec) continue;

      const atlasName = spec.atlas;
      const prefix = spec.prefix;
      const frame = `${prefix}_${a.dir}_walk_${a.animF}`;

      const sx = (a.x * ts) + ts * 0.5;
      const sy = (a.y * ts) + ts * 0.80; // "Fußpunkt" etwas tiefer (wie bei Ressourcen)

      const sMul = Number(CFG.scale?.[a.kind] ?? 1);
      const scale = baseAtlasScale * sMul;

      out.push({
        sortY: sy,       // <- WICHTIG: renderer sortiert nach sortY
        z: 25,           // zwischen Ressourcen (10) und Buildings (30)
        i,
        kind: 'ani',
        draw: (ctx)=>{
          // align:'pivot' wie in anderen Modulen, damit Pivot-Offsets aus dem Atlas greifen
          A.drawAtlasFrame(ctx, atlasName, frame, sx, sy, {
            scale,
            align: 'pivot'
          });
        }
      });
    }

    return out;
  }

  // -------------------------------------------------------------------------
  // PUBLIC API (für Inspector/Debug)
  // -------------------------------------------------------------------------
  const API = {
    CFG,
    _state: State,
    init,
    collectDrawables,
  };

  window.MapAnimals = API;

  LOG('loaded', CFG.VERSION);
})();
