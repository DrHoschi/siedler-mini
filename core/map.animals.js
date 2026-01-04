/* ============================================================================
 * Datei    : core/map.animals.js
 * Version  : v26.01.14-animals-forestspawn-dirfix-scales
 *
 * Fixes (gegenüber fehlerhaftem Patch):
 *  - Syntax/Scope korrigiert (Forest-Helpers waren versehentlich in chooseSpawnNearHQ eingebettet)
 *  - Doppelte/alte Spawn-Loops entfernt
 *  - Dir-Mapping stabil + optionaler E/W-Flip (MASTER=true für alle Tiere)
 *  - Forest-Hotspot-Spawn basiert auf MapResources (state/State tolerant)
 *  - Water-avoidance: Step-Check blockt Wasser und retargetet
 *  - Per-kind Scale (deer=0.35, fox=0.30)
 *
 * Hinweis:
 *  - Wir nutzen WORLD-Pixel (screen-grid), nicht Iso-Projection. Y nach unten positiv.
 *  - Wenn später das komplette Projekt-Koordinatensystem vereinheitlicht wird,
 *    kann flipEW wieder auf false bzw. entfernt werden.
 * ========================================================================== */
(function(){
  'use strict';

  const TAG  = '[MapAnimals]';
  const LOG  = (...a)=>(window.CBLog?.info||console.info)(TAG, ...a);
  const WARN = (...a)=>(window.CBLog?.warn||console.warn)(TAG, ...a);

  // -------------------------------------------------------------------------
  // KONFIG
  // -------------------------------------------------------------------------
  const CFG = {
    enabled: true,

    // Hard cap gegen "zu viele Tiere"
    maxTotal: 14,
    spawn: { deer: 6, fox: 3, rabbit: 0, boar: 0 },

    // Bewegung
    speedPxPerSec: { deer: 18, fox: 26, rabbit: 22, boar: 20 },
    targetJitterPx: 96,
    retargetEverySec: [1.8, 4.2],

    // Assets
    // Keys müssen exakt core/asset.js loadAtlas(key, ...) matchen.
    atlas:       { deer:'deer_sprite_atlas', fox:'fox_atlas', rabbit:'rabbit_atlas', boar:'boar_atlas' },
    framePrefix: { deer:'deer',             fox:'fox',       rabbit:'rabbit',       boar:'boar' },

    // Scale
    scale: { deer: 0.35, fox: 0.30, rabbit: 0.30, boar: 0.38 },

    // E/W-Flip (MASTER=true)
    flipEW: { deer:true, fox:true, rabbit:true, boar:true },

    // Forest-Hotspot Spawn
    spawnPreferTrees: true,
    forestCellSizeTiles: 8,
    forestPickRadiusTiles: 10,
    forestSamples: 120,

    // Respawn (einfach)
    respawnSec: { deer: 18, fox: 24, rabbit: 18, boar: 26 },

    // Water
    avoidWater: true,
    landPickTries: 18
  };

  // -------------------------------------------------------------------------
  // STATE
  // -------------------------------------------------------------------------
  const State = {
    ready: false,
    cols: 0,
    rows: 0,
    tileSize: 64,
    animals: [],
    dead: [],
    _warnedNoWaterAPI: false
  };

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------
  function rand(a,b){ return a + Math.random()*(b-a); }
  function clamp(v,a,b){ return Math.max(a, Math.min(b,v)); }

  function worldToTile(x,y,ts){
    return { tx: Math.floor(x/ts), ty: Math.floor(y/ts) };
  }
  function tileToWorld(tx,ty,ts){
    return { x: (tx+0.5)*ts, y: (ty+0.5)*ts };
  }

  function getAnimalScale(kind){
    return (CFG.scale && CFG.scale[kind] != null) ? CFG.scale[kind] : 1.0;
  }

  // -------------------------------------------------------------------------
  // Tile / Water (best effort)
  // -------------------------------------------------------------------------
  function getTileIdAt(tx,ty){
    try{
      if (window.GameMap && typeof window.GameMap.getTileId === 'function') return window.GameMap.getTileId(tx,ty);
      if (window.Map && typeof window.Map.getTileId === 'function') return window.Map.getTileId(tx,ty);
      if (window.Game?.map && typeof window.Game.map.getTileId === 'function') return window.Game.map.getTileId(tx,ty);
    }catch(e){ /* ignore */ }
    return null;
  }

  function isWaterTile(tx,ty){
    try{
      if (window.GameMap && typeof window.GameMap.isWaterTile === 'function') return !!window.GameMap.isWaterTile(tx,ty);
      if (window.GameRules && typeof window.GameRules.isWaterTile === 'function') return !!window.GameRules.isWaterTile(tx,ty);
      if (window.MapRules && typeof window.MapRules.isWaterTile === 'function') return !!window.MapRules.isWaterTile(tx,ty);
    }catch(e){ /* ignore */ }

    const id = getTileIdAt(tx,ty);
    if (id == null){
      if (!State._warnedNoWaterAPI){
        State._warnedNoWaterAPI = true;
        WARN('No isWaterTile()/getTileId() found -> water-block disabled (best effort).');
      }
      return false;
    }

    const TILE = window.TILE || window.Tiles || null;
    if (TILE && TILE.WATER != null) return (id|0) === (TILE.WATER|0);

    const waterIds = window.GameMap?.waterIds || window.GameRules?.waterIds || window.MapRules?.waterIds;
    if (waterIds && typeof waterIds.has === 'function') return waterIds.has(id|0);

    return false;
  }

  function randomPointAround(x,y,rad){
    return { x: x + rand(-rad, rad), y: y + rand(-rad, rad) };
  }

  function pickLandPointAround(x,y,rad){
    const ts = State.tileSize || 64;
    for (let i=0;i<CFG.landPickTries;i++){
      const p = randomPointAround(x,y,rad);
      const t = worldToTile(p.x,p.y,ts);
      if (!CFG.avoidWater || !isWaterTile(t.tx,t.ty)) return p;
    }
    return randomPointAround(x,y,rad);
  }

  // -------------------------------------------------------------------------
  // Spawn-Basis: HQ oder Map-Mitte
  // -------------------------------------------------------------------------
  function chooseSpawnNearHQ(){
    const ts = State.tileSize || 64;

    // 1) Game.buildings
    const blds = window.Game?.buildings || window.GameBuildings?.list || null;
    if (Array.isArray(blds)){
      const hq = blds.find(b=> (b.id||b.kind) === 'b.hq');
      if (hq && Number.isFinite(hq.x) && Number.isFinite(hq.y)){
        const tx = clamp(Math.floor(hq.x), 1, Math.max(1,State.cols-2));
        const ty = clamp(Math.floor(hq.y), 1, Math.max(1,State.rows-2));
        return tileToWorld(tx,ty,ts);
      }
    }

    // 2) Production cache
    const prod = window.Production?._buildings;
    if (prod && typeof prod.get === 'function'){
      for (const v of prod.values()){
        if (v?.id === 'b.hq' && Number.isFinite(v.x) && Number.isFinite(v.y)){
          return tileToWorld(Math.floor(v.x), Math.floor(v.y), ts);
        }
      }
    }

    // 3) Mitte
    return tileToWorld(Math.floor(State.cols/2), Math.floor(State.rows/2), ts);
  }

  // -------------------------------------------------------------------------
  // Forest Hotspot Spawn (MapResources)
  // -------------------------------------------------------------------------
  function _getMapResourcesState(){
    return window.MapResources?.state || window.MapResources?.State || null;
  }
  function _isTreeLike(node){
    const s = (node?.kind || node?.type || node?.id || node?.name || '').toString().toLowerCase();
    return s.includes('tree') || s.includes('baum') || s.includes('pine') || s.includes('oak');
  }
  function _treeNodesToTileList(nodes){
    const out = [];
    const ts = State.tileSize || 64;
    for (const n of (nodes||[])){
      let tx = n?.tx ?? n?.TX ?? n?.tileX ?? n?.gridX;
      let ty = n?.ty ?? n?.TY ?? n?.tileY ?? n?.gridY;
      if (tx == null || ty == null){
        const x = n?.x ?? n?.px ?? n?.worldX;
        const y = n?.y ?? n?.py ?? n?.worldY;
        if (x != null && y != null){
          const t = worldToTile(x,y,ts);
          tx = t.tx; ty = t.ty;
        }
      }
      if (tx == null || ty == null) continue;
      out.push({tx: tx|0, ty: ty|0});
    }
    return out;
  }

  function getTreeTiles(){
    const st = _getMapResourcesState();
    if (!st) return [];

    const candidates = [];
    if (Array.isArray(st.trees)) candidates.push(...st.trees);
    if (Array.isArray(st.decos)) candidates.push(...st.decos);
    if (Array.isArray(st.decorations)) candidates.push(...st.decorations);
    if (Array.isArray(st.nodes)) candidates.push(...st.nodes);

    if (candidates.length === 0){
      for (const k of Object.keys(st)){
        const v = st[k];
        if (Array.isArray(v) && v.length && typeof v[0] === 'object'){
          if (v.some(_isTreeLike)) candidates.push(...v);
        }
      }
    }

    const trees = candidates.filter(_isTreeLike);
    return _treeNodesToTileList(trees);
  }

  function chooseSpawnForestHotspot(){
    const ts = State.tileSize || 64;
    const trees = getTreeTiles();
    if (!trees.length) return chooseSpawnNearHQ();

    const cell = Math.max(2, CFG.forestCellSizeTiles|0);
    const samples = Math.min(CFG.forestSamples|0, trees.length);
    const hist = new Map();

    for (let i=0;i<samples;i++){
      const t = trees[(Math.random()*trees.length)|0];
      const cx = (t.tx / cell) | 0;
      const cy = (t.ty / cell) | 0;
      const key = cx+','+cy;
      hist.set(key, (hist.get(key)||0) + 1);
    }

    let bestKey=null, best=-1;
    for (const [k,v] of hist.entries()){
      if (v>best){ best=v; bestKey=k; }
    }

    if (!bestKey){
      const t = trees[(Math.random()*trees.length)|0];
      return tileToWorld(t.tx,t.ty,ts);
    }

    const [cx,cy] = bestKey.split(',').map(n=>parseInt(n,10));
    const centerTx = cx*cell + (cell>>1);
    const centerTy = cy*cell + (cell>>1);

    const radTiles = Math.max(3, CFG.forestPickRadiusTiles|0);
    const c = tileToWorld(centerTx, centerTy, ts);
    return pickLandPointAround(c.x, c.y, radTiles*ts);
  }

  // -------------------------------------------------------------------------
  // Dir mapping (8 directions)
  // -------------------------------------------------------------------------
  function pickDirectionFromDelta(dx, dy, kind){
    // dx/dy können normalisiert sein. Wir nutzen atan2.
    const ang = Math.atan2(dy, dx);
    const deg = (ang * 180 / Math.PI + 360) % 360;

    // E=0, SE=45, S=90, SW=135, W=180, NW=225, N=270, NE=315
    let dir;
    if (deg < 22.5 || deg >= 337.5) dir = 'E';
    else if (deg < 67.5)  dir = 'SE';
    else if (deg < 112.5) dir = 'S';
    else if (deg < 157.5) dir = 'SW';
    else if (deg < 202.5) dir = 'W';
    else if (deg < 247.5) dir = 'NW';
    else if (deg < 292.5) dir = 'N';
    else                  dir = 'NE';

    // MASTER Flip
    if (kind && CFG.flipEW && CFG.flipEW[kind]){
      if (dir === 'E') dir = 'W';
      else if (dir === 'W') dir = 'E';
      else if (dir === 'NE') dir = 'NW';
      else if (dir === 'NW') dir = 'NE';
      else if (dir === 'SE') dir = 'SW';
      else if (dir === 'SW') dir = 'SE';
    }

    return dir;
  }

  // -------------------------------------------------------------------------
  // Animal object
  // -------------------------------------------------------------------------
  function makeAnimal(kind, x, y){
    const uid = `${kind}@${Math.random().toString(16).slice(2)}${Date.now().toString(16)}`;
    return {
      uid,
      kind,
      scale: getAnimalScale(kind),
      x, y,
      dir: 'S',
      animT: 0,
      animF: 0,
      nextRetarget: rand(CFG.retargetEverySec[0], CFG.retargetEverySec[1]),
      target: pickLandPointAround(x,y,CFG.targetJitterPx)
    };
  }

  function ensureInsideMap(a){
    const ts = State.tileSize || 64;
    const maxX = State.cols*ts;
    const maxY = State.rows*ts;
    a.x = clamp(a.x, ts*0.5, maxX - ts*0.5);
    a.y = clamp(a.y, ts*0.5, maxY - ts*0.5);
    a.target.x = clamp(a.target.x, ts*0.5, maxX - ts*0.5);
    a.target.y = clamp(a.target.y, ts*0.5, maxY - ts*0.5);
  }

  // -------------------------------------------------------------------------
  // INIT / RESET
  // -------------------------------------------------------------------------
  function reset(){
    State.animals.length = 0;
    State.dead.length = 0;
    State.ready = true;

    const base = (CFG.spawnPreferTrees ? chooseSpawnForestHotspot() : chooseSpawnNearHQ());

    function spawnKind(kind, n, rad){
      for (let i=0;i<n;i++){
        if (State.animals.length >= (CFG.maxTotal|0)) return;
        const p = pickLandPointAround(base.x, base.y, rad);
        const a = makeAnimal(kind, p.x, p.y);
        ensureInsideMap(a);
        State.animals.push(a);
      }
    }

    spawnKind('deer',   CFG.spawn.deer|0,   320);
    spawnKind('fox',    CFG.spawn.fox|0,    380);
    spawnKind('rabbit', CFG.spawn.rabbit|0, 340);
    spawnKind('boar',   CFG.spawn.boar|0,   420);

    LOG('spawned', State.animals.length, 'animals', CFG.spawnPreferTrees ? '(forest-hotspot)' : '(near HQ/middle)');
  }

  // -------------------------------------------------------------------------
  // TICK
  // -------------------------------------------------------------------------
  function tick(dt){
    if (!CFG.enabled || !State.ready) return;

    const ts = State.tileSize || 64;

    // Respawn queue
    for (let i=State.dead.length-1;i>=0;i--){
      const d = State.dead[i];
      d.t -= dt;
      if (d.t <= 0){
        State.dead.splice(i,1);
        const base = (CFG.spawnPreferTrees ? chooseSpawnForestHotspot() : chooseSpawnNearHQ());
        const p = pickLandPointAround(base.x, base.y, 420);
        const a = makeAnimal(d.kind, p.x, p.y);
        ensureInsideMap(a);
        if (State.animals.length < (CFG.maxTotal|0)) State.animals.push(a);
      }
    }

    for (const a of State.animals){
      a.nextRetarget -= dt;
      if (a.nextRetarget <= 0){
        a.nextRetarget = rand(CFG.retargetEverySec[0], CFG.retargetEverySec[1]);
        a.target = pickLandPointAround(a.x, a.y, CFG.targetJitterPx);
        ensureInsideMap(a);
      }

      const dx = a.target.x - a.x;
      const dy = a.target.y - a.y;
      const dist = Math.hypot(dx,dy);

      const sp = CFG.speedPxPerSec[a.kind] || 18;

      if (dist > 1){
        const nx = dx / dist;
        const ny = dy / dist;

        const nextX = a.x + nx * sp * dt;
        const nextY = a.y + ny * sp * dt;

        if (CFG.avoidWater){
          const nt = worldToTile(nextX, nextY, ts);
          if (isWaterTile(nt.tx, nt.ty)){
            // Wasser blockiert: sofort neues Ziel suchen
            a.nextRetarget = 0;
          } else {
            a.x = nextX; a.y = nextY;
            a.dir = pickDirectionFromDelta(nx, ny, a.kind);
          }
        } else {
          a.x = nextX; a.y = nextY;
          a.dir = pickDirectionFromDelta(nx, ny, a.kind);
        }
      }

      // Anim
      a.animT += dt;
      if (a.animT >= 0.12){
        a.animT = 0;
        a.animF = (a.animF + 1) % 8;
      }

      ensureInsideMap(a);
    }
  }

  // -------------------------------------------------------------------------
  // DRAWABLES (GameMap.globalYSort)
  // -------------------------------------------------------------------------
  function collectDrawables(out){
    if (!CFG.enabled || !State.ready) return;

    const A = window.Assets;
    if (!A || typeof A.drawAtlasFrame !== 'function') return;

    for (const a of State.animals){
      const atlasKey = CFG.atlas[a.kind];
      const prefix   = CFG.framePrefix[a.kind];
      if (!atlasKey || !prefix) continue;

      const frame = `${prefix}_${a.dir}_walk_${a.animF}`;
      out.push({
        uid: a.uid,
        y: a.y,
        draw: (ctx)=>{
          // align:'pivot' erwartet Pivot in atlas.frames. Wir nutzen scale pro Tier.
          A.drawAtlasFrame(ctx, atlasKey, frame, a.x, a.y, { align:'pivot', scale: a.scale || 1 });
        }
      });
    }
  }

  // -------------------------------------------------------------------------
  // PUBLIC API / Integration
  // -------------------------------------------------------------------------
  function init(){
    try{
      // Map size
      const m = window.GameMap || window.Map || window.Game?.map;
      const cols = m?.cols ?? m?.w ?? window.MAP_COLS;
      const rows = m?.rows ?? m?.h ?? window.MAP_ROWS;
      const ts   = m?.tileSize ?? window.TILE_SIZE ?? 64;

      if (Number.isFinite(cols)) State.cols = cols|0;
      if (Number.isFinite(rows)) State.rows = rows|0;
      if (Number.isFinite(ts))   State.tileSize = ts|0;

      reset();

      // Hook into GameMap
      if (window.GameMap && typeof window.GameMap.globalYSort === 'function'){
        window.GameMap.globalYSort('animals', collectDrawables);
      } else {
        // Fallback: expose collectDrawables
        window.MapAnimals = window.MapAnimals || {};
        window.MapAnimals.collectDrawables = collectDrawables;
      }

      State.ready = true;
      LOG('ready cols/rows/ts =', State.cols, State.rows, State.tileSize);
    }catch(e){
      WARN('init failed', e);
    }
  }

  // Game-loop hook (best effort)
  function hookTick(){
    // We listen to a common tick event if present, else fallback to RAF.
    if (window.CB && typeof window.CB.on === 'function'){
      window.CB.on('cb:tick', (dt)=>{ tick(dt||0); });
      return;
    }

    // RAF fallback
    let last = performance.now();
    function raf(now){
      const dt = (now-last)/1000;
      last = now;
      tick(dt);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);
  }

  // Boot
  init();
  hookTick();

})();
