/**
 * core/map.animals.js
 * Version  : v26.01.04-animals-hotfix-nobug-scale-dir
 * Zweck    : Tiere (Reh/Fuchs/Wildschwein/Hase) auf der World-Map rendern + bewegen
 *
 * Fixes in diesem Patch:
 *  - ✅ SyntaxError entfernt ("Animals loaded" war versehentlich in einer Parameterliste gelandet)
 *  - ✅ Scale pro Tier wird WIRKLICH an Assets.drawAtlasFrame übergeben (opts.scale)
 *  - ✅ Richtungs-Mapping konsistent: N→NE→E→SE→S→SW→W→NW (Uhrzeigersinn)
 *  - ✅ No-Water: Tiere betreten kein Wasser (wenn Water-Checker verfügbar ist)
 *  - ✅ Spawns: bevorzugt "tree-dense" Bereiche, fällt aber sauber zurück (damit nie wieder 0 Tiere)
 *
 * Hinweis:
 *  - Wir nutzen ausschließlich Atlas-Frames: <prefix>_<DIR>_walk_<i>
 *    (Frame 0 gilt bei euch als "Idle-Pose" → bleibt kompatibel)
 */

(function(){
  'use strict';

  // ------------------------------------------------------------
  // SHORTCUTS / SAFE HELPERS
  // ------------------------------------------------------------
  const now = ()=> (performance && performance.now) ? performance.now() : Date.now();

  const LOG  = (...a)=> console.log('[animals]', ...a);
  const WARN = (...a)=> console.warn('[animals]', ...a);

  // ------------------------------------------------------------
  // CONFIG
  // ------------------------------------------------------------
  const CFG = {
    enabled: true,

    // Max. Anzahl pro Tierart (damit nichts explodiert)
    maxTotal: 20,

    // Spawn-Counts (kannst du später über Registry/JSON steuern)
    spawn: {
      deer: 8,
      fox: 6,
      boar: 4,
      rabbit: 6
    },

    // Anim
    animFps: 6,          // Frames pro Sekunde
    movePxPerSec: 18,    // Welt-Pixel pro Sekunde (klein = ruhiger)

    // Retarget (wie oft neue Zielpunkte gesucht werden)
    retargetSecMin: 1.8,
    retargetSecMax: 3.4,

    // Spawn-Suche
    spawnSearchTries: 80,        // wie oft wir "gute" Spawn-Punkte suchen
    spawnPreferTreesMin: 6,      // Minimum "Baum-Punkte" in 5x5 Umgebung
    spawnRadiusFromCenter: 520,  // initiale Suche rund um Map-Mitte (fallback-sicher)

    // Dir-Order (Master): Uhrzeigersinn
    dirLabels: ['N','NE','E','SE','S','SW','W','NW'],
  };

  // Tier-Definitionen (AtlasKey + Prefix + Scale)
  const KIND = {
    deer:   { atlas:'deer_sprite_atlas',   prefix:'deer_',   scale:0.35 },
    fox:    { atlas:'fox_sprite_atlas',    prefix:'fox_',    scale:0.30 },
    boar:   { atlas:'boar_sprite_atlas',   prefix:'boar_',   scale:0.40 },
    rabbit: { atlas:'rabbit_sprite_atlas', prefix:'rabbit_', scale:0.28 },
  };

  // ------------------------------------------------------------
  // STATE
  // ------------------------------------------------------------
  const State = {
    ready:false,
    cols:0,
    rows:0,
    tileSize:64,
    mapId:null,

    animals:[],
    dead:[],
    _t:0,
    _lastDrawT:0,
  };

  // ------------------------------------------------------------
  // MAP HELPERS (Water / Trees)
  // ------------------------------------------------------------
  function clamp(v, a, b){ return Math.max(a, Math.min(b, v)); }

  function worldToTile(x,y){
    const ts = State.tileSize||64;
    return {
      tx: Math.floor(x/ts),
      ty: Math.floor(y/ts),
    };
  }

  function tileToWorldCenter(tx,ty){
    const ts = State.tileSize||64;
    return {
      x: (tx+0.5)*ts,
      y: (ty+0.5)*ts,
    };
  }

  function insideTile(tx,ty){
    return (tx>=0 && ty>=0 && tx<State.cols && ty<State.rows);
  }

  // --- Water detection: wir unterstützen mehrere mögliche APIs (weil dein Projekt historisch gewachsen ist)
  function isWater(tx,ty){
    try{
      const GM = window.GameMap;
      // 1) GameMap.isWater(tx,ty)
      if (GM && typeof GM.isWater === 'function') return !!GM.isWater(tx,ty);
      // 2) GameMap.terrainAt(tx,ty) -> {water:true}
      if (GM && typeof GM.terrainAt === 'function') {
        const t = GM.terrainAt(tx,ty);
        if (t && typeof t.water !== 'undefined') return !!t.water;
      }
      // 3) GameMap.getTerrain(tx,ty) -> string
      if (GM && typeof GM.getTerrain === 'function') {
        const v = GM.getTerrain(tx,ty);
        if (typeof v === 'string') return (v.toLowerCase().includes('water') || v.toLowerCase().includes('sea') || v.toLowerCase().includes('river'));
      }
      // 4) GameMap.isWaterTileId(tileId)
      if (GM && typeof GM.getTileId === 'function' && typeof GM.isWaterTileId === 'function') {
        const id = GM.getTileId(tx,ty);
        return !!GM.isWaterTileId(id);
      }
    }catch(e){ /* ignore */ }
    return false; // fallback: wenn wir Wasser nicht erkennen können, blocken wir nicht hart (aber meist habt ihr eine API)
  }

  // --- Tree density: ebenfalls mehrere APIs/fallbacks
  function treeScore(tx,ty){
    // Scoring in 5x5 (radius 2): zählt "Baum-ähnliche" Deko/World-Objekte
    let score = 0;
    const r = 2;
    for (let yy=ty-r; yy<=ty+r; yy++) for (let xx=tx-r; xx<=tx+r; xx++) {
      if (!insideTile(xx,yy)) continue;
      // Wasser-Tiles zählen nicht
      if (isWater(xx,yy)) continue;

      // 1) GameMap.hasTree(tx,ty)
      const GM = window.GameMap;
      try{
        if (GM && typeof GM.hasTree === 'function') {
          if (GM.hasTree(xx,yy)) score += 2;
          continue;
        }
      }catch(e){}

      // 2) GameMap.getDecoAt(tx,ty) -> array/obj; name includes 'tree'
      try{
        if (GM && typeof GM.getDecoAt === 'function') {
          const d = GM.getDecoAt(xx,yy);
          if (d){
            const arr = Array.isArray(d) ? d : [d];
            for (const it of arr){
              const name = (it?.name || it?.id || it?.key || '').toString().toLowerCase();
              if (name.includes('tree') || name.includes('pine') || name.includes('fir')) score += 2;
            }
          }
          continue;
        }
      }catch(e){}

      // 3) Fallback: keine Deko-API → wir können nicht scoren
    }
    return score;
  }

  // ------------------------------------------------------------
  // DIR MAPPING (Master: N→NE→E→SE→S→SW→W→NW)
  // ------------------------------------------------------------
  function vecToDir8(dx,dy){
    const eps = 0.00001;
    if (Math.abs(dx)<eps && Math.abs(dy)<eps) return 0; // N (egal) – bleibt stabil

    // Bildschirm-Koordinaten: +x rechts, +y runter.
    // atan2 -> 0 = E, 90° = S, 180° = W, 270° = N
    const ang = Math.atan2(dy, dx); // -pi..pi
    let idxE = Math.round(ang / (Math.PI/4)); // -4..4
    idxE = ((idxE % 8) + 8) % 8;             // 0..7 (0=E,1=SE,...,6=N,7=NE)

    // Umrechnung in N-Order: (idxE+2)%8 → 0=N,1=NE,2=E,...
    return (idxE + 2) % 8;
  }

  // ------------------------------------------------------------
  // ANIMAL FACTORY
  // ------------------------------------------------------------
  function makeAnimal(kind, x, y){
    const k = KIND[kind] || KIND.deer;
    const a = {
      id: 'a_' + Math.random().toString(36).slice(2,9),
      kind,
      x, y,
      vx:0, vy:0,
      tx: x, ty: y,     // target world
      dir:0,
      animT:0,
      animI:0,
      nextRetarget: rand(CFG.retargetSecMin, CFG.retargetSecMax),
    };
    // initial target
    pickNewTarget(a);
    return a;
  }

  function rand(a,b){ return a + Math.random()*(b-a); }

  function pickNewTarget(a){
    // Ziel in der Nähe suchen – aber nicht aufs Wasser
    const ts = State.tileSize||64;

    for (let i=0;i<30;i++){
      const rx = a.x + rand(-220, 220);
      const ry = a.y + rand(-220, 220);
      const t = worldToTile(rx, ry);
      if (!insideTile(t.tx,t.ty)) continue;
      if (isWater(t.tx,t.ty)) continue;
      const w = tileToWorldCenter(t.tx,t.ty);
      a.tx = w.x; a.ty = w.y;
      return;
    }
    // Fallback: stehen bleiben
    a.tx = a.x; a.ty = a.y;
  }

  // ------------------------------------------------------------
  // SPAWN SELECTION
  // ------------------------------------------------------------
  function chooseSpawnBase(){
    // 1) Wenn HQ bekannt ist → grob in der Nähe (aber wir wollen ja "waldiger")
    try{
      const b = window.Game?.buildings?.list?.find?.(x=>x?.id==='b.hq' || x?.key==='b.hq' || x?.type==='b.hq');
      if (b && typeof b.x === 'number' && typeof b.y === 'number') return {x:b.x, y:b.y};
    }catch(e){}

    // 2) Map-Mitte (sicher)
    const cx = (State.cols*State.tileSize)*0.5;
    const cy = (State.rows*State.tileSize)*0.5;
    return {x:cx,y:cy};
  }

  function findForestishPoint(){
    const base = chooseSpawnBase();
    const ts = State.tileSize||64;

    let best = null;
    let bestScore = -1;

    for (let i=0;i<CFG.spawnSearchTries;i++){
      const rx = base.x + rand(-CFG.spawnRadiusFromCenter, CFG.spawnRadiusFromCenter);
      const ry = base.y + rand(-CFG.spawnRadiusFromCenter, CFG.spawnRadiusFromCenter);
      const t = worldToTile(rx, ry);
      if (!insideTile(t.tx,t.ty)) continue;
      if (isWater(t.tx,t.ty)) continue;

      const s = treeScore(t.tx,t.ty);
      if (s > bestScore){
        bestScore = s;
        best = {tx:t.tx, ty:t.ty, score:s};
      }
      if (s >= CFG.spawnPreferTreesMin) break;
    }

    // fallback: wenn scoring nicht möglich war → nehmen wir zumindest ein land-tile
    if (!best){
      for (let i=0;i<200;i++){
        const rx = base.x + rand(-CFG.spawnRadiusFromCenter, CFG.spawnRadiusFromCenter);
        const ry = base.y + rand(-CFG.spawnRadiusFromCenter, CFG.spawnRadiusFromCenter);
        const t = worldToTile(rx, ry);
        if (!insideTile(t.tx,t.ty)) continue;
        if (isWater(t.tx,t.ty)) continue;
        best = {tx:t.tx, ty:t.ty, score:0};
        break;
      }
    }

    if (!best){
      // absolute last resort: tile 0,0 (wird später geklemmt)
      best = {tx:0,ty:0,score:0};
    }

    const w = tileToWorldCenter(best.tx,best.ty);
    return {x:w.x,y:w.y, score:bestScore};
  }

  // ------------------------------------------------------------
  // RESET / INIT
  // ------------------------------------------------------------
  function reset(){
    State.animals.length = 0;
    State.dead.length = 0;
    State._t = 0;
    State.ready = true;

    const base = findForestishPoint();

    const add = (kind, n, radius)=>{
      for (let i=0;i<n;i++){
        // kleine Random-Cloud um base
        const rx = base.x + rand(-radius, radius);
        const ry = base.y + rand(-radius, radius);
        const t = worldToTile(rx,ry);
        if (!insideTile(t.tx,t.ty)) { i--; continue; }
        if (isWater(t.tx,t.ty)) { i--; continue; }
        const w = tileToWorldCenter(t.tx,t.ty);
        State.animals.push(makeAnimal(kind, w.x, w.y));
        if (State.animals.length >= CFG.maxTotal) return;
      }
    };

    add('deer',   CFG.spawn.deer,   320);
    add('fox',    CFG.spawn.fox,    360);
    add('boar',   CFG.spawn.boar,   360);
    add('rabbit', CFG.spawn.rabbit, 380);

    LOG('Animals loaded:', State.animals.length, 'baseScore=', base.score);
  }

  // ------------------------------------------------------------
  // TICK + DRAW
  // ------------------------------------------------------------
  function tick(dt){
    if (!CFG.enabled || !State.ready) return;

    const speed = CFG.movePxPerSec;
    const fps   = CFG.animFps;

    // simple movement
    for (const a of State.animals){
      a.nextRetarget -= dt;
      if (a.nextRetarget <= 0){
        a.nextRetarget = rand(CFG.retargetSecMin, CFG.retargetSecMax);
        pickNewTarget(a);
      }

      const dx = a.tx - a.x;
      const dy = a.ty - a.y;
      const dist = Math.hypot(dx,dy);

      if (dist > 2){
        const nx = dx / dist;
        const ny = dy / dist;

        // next step
        const step = speed * dt;
        const nxw = a.x + nx*step;
        const nyw = a.y + ny*step;

        // water-block: check next tile
        const t = worldToTile(nxw,nyw);
        if (insideTile(t.tx,t.ty) && !isWater(t.tx,t.ty)){
          a.x = nxw; a.y = nyw;
          a.dir = vecToDir8(nx, ny);
        } else {
          // retarget wenn blockiert
          a.nextRetarget = 0;
        }
      }

      // anim
      a.animT += dt;
      const fi = Math.floor(a.animT * fps) % 8; // default 8 frames
      a.animI = fi;
    }
  }

  function draw(ctx){
    if (!CFG.enabled || !State.ready) return;
    const Assets = window.Assets;
    if (!Assets || typeof Assets.drawAtlasFrame !== 'function') return;

    for (const a of State.animals){
      const k = KIND[a.kind] || KIND.deer;
      const dirLabel = CFG.dirLabels[a.dir] || 'S';
      const frameName = `${k.prefix}${dirLabel}_walk_${a.animI}`;

      // Scale wird jetzt wirklich angewendet!
      Assets.drawAtlasFrame(ctx, k.atlas, frameName, a.x, a.y, {
        scale: k.scale,
        // align: 'pivot' (default)
      });
    }
  }

  // ------------------------------------------------------------
  // HOOKS (engine integration)
  // ------------------------------------------------------------
  // Wir hängen uns an euren globalYSort()-Mechanismus, wenn vorhanden.
  function installDrawHook(){
    const GM = window.GameMap;
    if (GM && typeof GM.globalYSort === 'function'){
      // wir registrieren eine Draw-Function als "Drawable"
      try{
        GM.globalYSort('animals', (ctx,dt)=>{ tick(dt); draw(ctx); });
        return true;
      }catch(e){}
    }

    // Fallback: cb:render (wenn vorhanden)
    window.addEventListener('cb:render', (ev)=>{
      const d = ev?.detail || {};
      const ctx = d.ctx;
      const dt = (typeof d.dt==='number') ? d.dt : 0.016;
      if (!ctx) return;
      tick(dt);
      draw(ctx);
    });
    return false;
  }

  // ------------------------------------------------------------
  // EVENTS
  // ------------------------------------------------------------
  window.addEventListener('cb:map:ready', (ev)=>{
    const d = ev?.detail || {};
    State.mapId    = d.mapId || null;
    State.cols     = d.cols || d.w || d.width  || State.cols;
    State.rows     = d.rows || d.h || d.height || State.rows;
    State.tileSize = d.tileSize || State.tileSize;

    if (!State.cols || !State.rows){
      WARN('map:ready ohne cols/rows – spawn verschoben');
      return;
    }
    reset();
  });

  window.addEventListener('cb:game:start', ()=>{
    if (State.cols && State.rows) reset();
  });

  // ------------------------------------------------------------
  // BOOT
  // ------------------------------------------------------------
  installDrawHook();
  LOG('module loaded', 'v26.01.04-animals-hotfix-nobug-scale-dir');
})();
