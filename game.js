/* =====================================================================
   game.js  —  Siedler-Mini Core
   Version: v1.13  (2025-08-24)
   Author: Siedler 2020 – Integration Build
   ---------------------------------------------------------------------
   WICHTIG:
   - Pfade sind auf deine Struktur abgestimmt (assets/...).
   - Debug-Logs laufen über BootUI.dbg (Inspector-Leiste).
   - Dieses File stellt GameLoader + Game bereit (global).
   - Terrain: TexturePacker-JSON (assets/tiles/tileset.terrain.json)
   - Roads:   libGDX .atlas      (assets/tex/road/road_atlas.atlas)
   - Buildings (Epoche Holz):    assets/tex/building/wood/*.PNG
   - Units (Builder/Carrier):    assets/characters/*.png
   - Neu v1.13:
     * Road-Overlay-Layer inkl. Auto-Tiler (N/E/S/W-Maske → Atlas-Index)
     * Render-Reihenfolge: Tiles → Roads → Units → Buildings → HUD
     * Road-Bau blockiert auf belegten (Gebäude-)Tiles
   ===================================================================== */

/* ============================== Utilities ============================== */
const DBG = (...a)=> (window.BootUI?.dbg ? BootUI.dbg(...a) : console.log('[DBG]',...a));
const clamp = (v,lo,hi)=>Math.max(lo,Math.min(hi,v));
const dist  = (a,b)=> Math.hypot(a.x-b.x,a.y-b.y);

/* Device pixel ratio aware canvas resize */
function fitCanvas(canvas){
  const dpr = window.devicePixelRatio||1;
  const rect = canvas.getBoundingClientRect();
  const w = Math.floor(rect.width  * dpr);
  const h = Math.floor(rect.height * dpr);
  if(canvas.width!==w || canvas.height!==h){
    canvas.width=w; canvas.height=h;
  }
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr,0,0,dpr,0,0); // UI coords = CSS px
  return {dpr,w,h,rect,ctx};
}

/* Fetch helpers */
async function loadJSON(url){ const res=await fetch(url); if(!res.ok) throw new Error('HTTP '+res.status+' '+url); return res.json(); }
async function loadText(url){ const res=await fetch(url); if(!res.ok) throw new Error('HTTP '+res.status+' '+url); return res.text(); }
async function loadImg(url){ try{ const img = await Asset.loadImage(url,url); return img; }catch(e){ throw e; }}

/* ============================== Paths/Assets ============================== */
const PATHS = {
  terrainJSON: './assets/tiles/tileset.terrain.json',  // TexturePacker JSON (+ meta.image PNG)
  roadAtlas:   './assets/tex/road/road_atlas.atlas',   // libGDX .atlas (+ png in 1. Zeile)
  buildings:   './assets/tex/building/wood/',          // einzelne PNGs
  unitBuilder: './assets/characters/builder.png',
  unitCarrier: './assets/characters/carrier.png'
};

/* ============================== GameLoader ============================== */
window.GameLoader = {
  _world: null,

  async start(mapURL){
    DBG('GameLoader.start', mapURL);
    const canvas = document.getElementById('stage');

    const view = fitCanvas(canvas);
    DBG(`Canvas ${Math.round(view.rect.width)}x${Math.round(view.rect.height)} dpr:${(window.devicePixelRatio||1)}`);

    const map = await this._loadMap(mapURL);
    const assets = await this._loadCoreAssets();

    this._world = Game.create(canvas, map, assets);
    Game.start(this._world);

    Asset.markTexturesReady(true);
    DBG('Game started');
  },

  async continueFrom(snapshot){
    DBG('Continue from snapshot...');
    const canvas = document.getElementById('stage');
    const view = fitCanvas(canvas);
    DBG(`Canvas ${Math.round(view.rect.width)}x${Math.round(view.rect.height)} dpr:${(window.devicePixelRatio||1)}`);

    const map = snapshot.map || await this._loadMap(PATHS.defaultMap || './assets/maps/map-mini.json');
    const assets = await this._loadCoreAssets();
    this._world = Game.create(canvas, map, assets);
    Object.assign(this._world.res, snapshot.res||{});
    this._world.entities = snapshot.entities||[];
    Game.start(this._world);
    Asset.markTexturesReady(true);
    DBG('Continue OK');
  },

  async _loadMap(url){
    try{
      const res = await fetch(url);
      const j = await res.json();
      DBG('Map start', url);
      const W = j.width|0, H = j.height|0, TS = j.tileSize|0 || 64;
      const tiles = (j.tiles && j.tiles.length===W*H) ? new Uint16Array(j.tiles) : new Uint16Array(W*H);
      return { width:W, height:H, tileSize:TS, tileset:j.tileset||PATHS.terrainJSON, tiles };
    }catch(e){
      DBG('Map FAIL → demo', e?.message||String(e));
      const W=24,H=14,TS=64; const tiles=new Uint16Array(W*H).fill(0);
      return { width:W, height:H, tileSize:TS, tileset:PATHS.terrainJSON, tiles };
    }
  },

  async _loadCoreAssets(){
    // ---- Terrain (TexturePacker JSON) ----
    let terrain = null;
    try{
      const tj = await loadJSON(PATHS.terrainJSON);
      const base = new URL(PATHS.terrainJSON, location.href);
      const imgURL = new URL(tj.meta?.image||'tileset.terrain.png', base).toString();
      const img = await loadImg(imgURL);
      const frames = Object.entries(tj.frames||{})
        .map(([name,f])=>({name, x:f.x|0, y:f.y|0, w:f.w|0, h:f.h|0}));
      terrain = {img, frames, imageURL:imgURL, size:tj.meta?.size||{w:img.width,h:img.height}};
      DBG('Terrain OK', {frames:frames.length});
    }catch(e){
      DBG('No atlas → placeholders');
      terrain = null;
    }

    // ---- Road-Atlas (libGDX .atlas) ----
    let roads = null;
    try{
      const txt = await loadText(PATHS.roadAtlas);
      const lines = txt.replace(/\r/g,'').split('\n');
      let imageURL = null;
      const frames=[];
      for(let i=0;i<lines.length;i++){
        const L = lines[i].trim(); if(!L) continue;
        if(i===0 && L.endsWith('.png')){ imageURL = new URL(L, new URL(PATHS.roadAtlas, location.href)).toString(); continue; }
        if(!L.includes(':')){ frames.push({name:L}); continue; }
        const cur = frames[frames.length-1]; if(!cur) continue;
        const [k,raw]=L.split(':').map(s=>s.trim()); const v=raw.split(',').map(s=>s.trim());
        if(k==='xy'){ cur.x=parseInt(v[0],10); cur.y=parseInt(v[1],10); }
        if(k==='size'){ cur.w=parseInt(v[0],10); cur.h=parseInt(v[1],10); }
      }
      frames.forEach(f=>{ f.w=f.w||64; f.h=f.h||64; });
      const img = await loadImg(imageURL);

      // Map Namen → Indexe gemäß road_ids.txt
      const wantOrder = [
        'road_straight_vertical',   // 0
        'road_straight_horizontal', // 1
        'road_curve_NE',            // 2
        'road_curve_SE',            // 3
        'road_curve_SW',            // 4
        'road_curve_NW',            // 5
        'road_T_up',                // 6
        'road_T_right',             // 7
        'road_T_down',              // 8
        'road_T_left',              // 9
        'road_cross'                // 10
      ];
      const nameToIndex = Object.fromEntries(frames.map((f,i)=>[f.name,i]));
      const ids = wantOrder.map((n)=> nameToIndex[n] ?? 0);

      roads = {img, frames, ids, imageURL};
      DBG('Road atlas OK', {frames:frames.length, ids});
    }catch(e){
      DBG('Road atlas FAIL', e?.message||String(e));
      roads = null;
    }

    // ---- Units ----
    let builderImg=null, carrierImg=null;
    try{ builderImg = await loadImg(PATHS.unitBuilder); }catch{ DBG('Unit sprite missing → dot (builder)'); }
    try{ carrierImg = await loadImg(PATHS.unitCarrier); }catch{ DBG('Unit sprite missing → dot (carrier)'); }

    return { terrain, roads, builderImg, carrierImg };
  }
};

/* ============================== Game Core ============================== */
const Game = (function(){

  /* --------------------------- Build-Kosten --------------------------- */
  const buildCosts = {
    road:   { wood:1,  stone:0, food:0, pop:0 },
    hut:    { wood:10, stone:2, food:0, pop:1 },
    lumber: { wood:6,  stone:0, food:0, pop:1 },
    mason:  { wood:4,  stone:6, food:0, pop:1 },

    hq_wood:         { wood:60,  stone:20, food:10, pop:5 },
    hq_wood_ug1:     { wood:90,  stone:50, food:20, pop:5 },
    depot_wood:      { wood:20,  stone:6,  food:0,  pop:1 },
    depot_wood_ug:   { wood:30,  stone:12, food:0,  pop:1 },
    lumberjack_wood: { wood:18,  stone:4,  food:0,  pop:1 },
    stonebraker_wood:{ wood:12,  stone:10, food:0,  pop:1 },
    farm_wood:       { wood:22,  stone:6,  food:0,  pop:2 },
    baeckerei_wood:  { wood:14,  stone:8,  food:0,  pop:1 },
    fischer_wood1:   { wood:16,  stone:4,  food:0,  pop:1 },
    wassermuehle_wood:{wood:18,  stone:10, food:0,  pop:1 },
    windmuehle_wood: { wood:20,  stone:8,  food:0,  pop:1 },
    haeuser_wood1:   { wood:12,  stone:4,  food:0,  pop:2 },
    haeuser_wood1_ug1:{wood:18,  stone:8,  food:0,  pop:2 },
    haeuser_wood2:   { wood:16,  stone:6,  food:0,  pop:3 },
  };

  /* --------------------------- Building Sprites --------------------------- */
  const buildingSpriteFile = {
    hq_wood: 'hq_wood.PNG',
    hq_wood_ug1: 'hq_wood_ug1.PNG',
    depot_wood: 'depot_wood.PNG',
    depot_wood_ug: 'depot_wood_ug.PNG',
    lumberjack_wood: 'lumberjack_wood.PNG',
    stonebraker_wood: 'stonebraker_wood.PNG',
    farm_wood: 'farm_wood.PNG',
    baeckerei_wood: 'baeckerei_wood.PNG',
    fischer_wood1: 'fischer_wood1.PNG',
    wassermuehle_wood: 'wassermuehle_wood.PNG',
    windmuehle_wood: 'windmuehle_wood.PNG',
    haeuser_wood1: 'haeuser_wood1.PNG',
    haeuser_wood1_ug1: 'haeuser_wood1_ug1.PNG',
    haeuser_wood2: 'haeuser_wood2.PNG',
  };

  /* --------------------------- World Factory --------------------------- */
  function create(canvas, map, assets){
    const ctx = canvas.getContext('2d');

    const world = {
      canvas, ctx, map,
      camX: 0, camY: 0, zoom: 1,
      dpr: window.devicePixelRatio||1,
      running: false,

      /* Ressourcen (Startwert hoch zum Testen) */
      res: { wood:1000, stone:1000, food:1000, pop:1000 },

      /* Entities: buildings & units */
      entities: [],

      /* Assets */
      terrain: assets.terrain, roads: assets.roads,
      builderImg: assets.builderImg, carrierImg: assets.carrierImg,

      /* Tiles cached pointer */
      tiles: map.tiles,

      /* Overlays: Roads (Map & ausgewählter Atlas-Frame je Zelle) */
      roadMap: new Uint8Array(map.width*map.height),            // 0/1: Straße vorhanden
      roadFrames: new Int16Array(map.width*map.height).fill(-1),// Index ins roads.ids (→ frames[])

      /* Interaction */
      activeTool: 'road',
      hoverTile: null,

      /* Time */
      t: 0, dt: 0, last: performance.now(),

      /* HUD updaters */
      updateHUD(){ 
        const q = s=>document.getElementById(s);
        q('res-wood').textContent = this.res.wood|0;
        q('res-stone').textContent= this.res.stone|0;
        q('res-food').textContent = this.res.food|0;
        q('res-pop').textContent  = this.res.pop|0;
      },

      /* Tables */
      buildCosts,

      /* Sprites */
      buildingSprites: {},
    };

    // Kamera grob passend
    world.camX = 0; world.camY = 0; world.zoom = clamp( (canvas.width/world.map.width)/world.map.tileSize, 0.5, 2 );

    // Input
    bindInput(world);

    // Lazy: building sprites async laden
    preloadBuildingSprites(world);

    return world;
  }

  /* --------------------------- Preload Building Sprites --------------------------- */
  async function preloadBuildingSprites(w){
    for(const [name,file] of Object.entries(buildingSpriteFile)){
      try{
        const img = await loadImg(PATHS.buildings + file);
        w.buildingSprites[name]=img;
      }catch(e){
        DBG('Building sprite missing → shape', name);
      }
    }
  }

  /* --------------------------- Start/Loop --------------------------- */
  function start(world){
    world.running = true;
    world.updateHUD();

    const resize = ()=> fitCanvas(world.canvas);
    window.addEventListener('resize', resize);
    resize();

    requestAnimationFrame(function tick(now){
      if(!world.running) return;
      world.dt = Math.min(0.05, (now - world.last)/1000);
      world.t  = now/1000;
      world.last = now;

      update(world, world.dt);
      render(world);

      requestAnimationFrame(tick);
    });
  }

  /* --------------------------- Update --------------------------- */
  function update(w, dt){
    for(const e of w.entities){
      if(e.kind==='unit'){
        updateUnit(w, e, dt);
      }else if(e.kind==='building'){
        // Produktion
        if(e.produces && (w.t - (e._lastProd||0)) > e.prodEvery){
          e._lastProd = w.t;
          const dep = findClosest(w, e.tx, e.ty, b=> b.kind==='building' && (b.type==='depot_wood'||b.type==='hq_wood'||b.type==='hq_wood_ug1'));
          if(dep){ spawnCarrier(w, e, dep, e.produces.kind, e.produces.amount); }
          else { w.res[e.produces.kind] = (w.res[e.produces.kind]||0) + e.produces.amount; DBG('HUD deliver', JSON.stringify(w.res)); }
          w.updateHUD();
        }
      }
    }
  }

  /* --------------------------- Render --------------------------- */
  function render(w){
    const ctx = w.ctx;
    const {width:W,height:H,tileSize:TS} = w.map;
    const view = fitCanvas(w.canvas);
    ctx.clearRect(0,0,view.rect.width,view.rect.height);

    // Kamera
    ctx.save();
    ctx.scale(w.zoom, w.zoom);
    ctx.translate(-w.camX, -w.camY);

    // === 1) Terrain ===
    if(w.terrain){
      const img = w.terrain.img;
      for(let y=0;y<H;y++){
        for(let x=0;x<W;x++){
          const idx = w.tiles[W*y+x]|0;
          const f = w.terrain.frames[idx];
          if(f) ctx.drawImage(img, f.x, f.y, f.w, f.h, x*TS, y*TS, TS, TS);
          else { ctx.fillStyle = (x+y)%2? '#314d25' : '#2c4721'; ctx.fillRect(x*TS, y*TS, TS, TS); }
        }
      }
    }else{
      ctx.fillStyle='#294224'; ctx.fillRect(0,0,W*TS,H*TS);
      ctx.strokeStyle='#335027';
      for(let y=0;y<=H;y++){ ctx.beginPath(); ctx.moveTo(0,y*TS); ctx.lineTo(W*TS,y*TS); ctx.stroke(); }
      for(let x=0;x<=W;x++){ ctx.beginPath(); ctx.moveTo(x*TS,0); ctx.lineTo(x*TS,H*TS); ctx.stroke(); }
    }

    // === 2) Roads Overlay ===
    if(w.roads){
      const img = w.roads.img;
      const frames = w.roads.frames;
      const ids = w.roads.ids;
      for(let y=0;y<H;y++){
        for(let x=0;x<W;x++){
          const fidx = w.roadFrames[W*y+x];
          if(fidx>=0){
            const atlasIndex = ids[fidx] ?? ids[0];
            const fr = frames[atlasIndex];
            if(fr) ctx.drawImage(img, fr.x, fr.y, fr.w, fr.h, x*TS, y*TS, TS, TS);
          }
        }
      }
    }

    // === 3) Units (unter Gebäuden) ===
    for(const u of w.entities){
      if(u.kind!=='unit') continue;
      const px = u.x*TS, py=u.y*TS;
      const img = (u.type==='builder')? w.builderImg : w.carrierImg;
      if(img) ctx.drawImage(img, px, py, TS, TS);
      else { ctx.fillStyle= (u.type==='builder')? '#ffd33d' : '#66ccff'; ctx.beginPath(); ctx.arc(px+TS/2, py+TS/2, 4, 0, Math.PI*2); ctx.fill(); }
    }

    // === 4) Buildings (immer zuletzt, verdecken Units nie) ===
    for(const b of w.entities){
      if(b.kind!=='building') continue;
      const px = b.tx*TS, py=b.ty*TS;
      const img = w.buildingSprites[b.type];
      if(img) ctx.drawImage(img, px, py, TS, TS);
      else { ctx.fillStyle='#6b4d2a88'; ctx.fillRect(px+4,py+4,TS-8,TS-8); ctx.strokeStyle='#8b6b3a'; ctx.strokeRect(px+4,py+4,TS-8,TS-8); }
    }

    // Hover
    if(w.hoverTile){
      ctx.strokeStyle='#ffffffaa'; ctx.lineWidth=2/w.zoom;
      ctx.strokeRect(w.hoverTile.tx*TS+1, w.hoverTile.ty*TS+1, TS-2, TS-2);
    }

    ctx.restore();
  }

  /* --------------------------- Input (Pan/Zoom/Build) --------------------------- */
  function bindInput(w){
    const c = w.canvas;
    let dragging=false, last={x:0,y:0};
    c.addEventListener('pointerdown', e=>{ dragging=true; last={x:e.clientX,y:e.clientY}; c.setPointerCapture(e.pointerId); });
    c.addEventListener('pointerup',   e=>{ dragging=false; c.releasePointerCapture(e.pointerId); });
    c.addEventListener('pointerleave',()=> dragging=false);
    c.addEventListener('pointermove', e=>{
      const rect = c.getBoundingClientRect();
      const px = (e.clientX-rect.left), py = (e.clientY-rect.top);
      const cx = px/w.zoom + w.camX, cy = py/w.zoom + w.camY;
      const tx = Math.floor(cx/w.map.tileSize), ty = Math.floor(cy/w.map.tileSize);
      if(tx>=0&&ty>=0&&tx<w.map.width&&ty<w.map.height) w.hoverTile={tx,ty}; else w.hoverTile=null;

      if(dragging && (e.buttons&1)){ // Pan
        const dx = (e.clientX-last.x)/w.zoom;
        const dy = (e.clientY-last.y)/w.zoom;
        w.camX -= dx; w.camY -= dy;
        last={x:e.clientX,y:e.clientY};
        DBG('Pan', JSON.stringify({x:Math.round(w.camX),y:Math.round(w.camY),z:+w.zoom.toFixed(2)}));
      }
    }, {passive:true});

    // Wheel → Zoom
    c.addEventListener('wheel', e=>{
      e.preventDefault();
      const dir = Math.sign(e.deltaY);
      w.zoom = clamp( w.zoom * (dir>0?0.9:1.1), 0.4, 3.0 );
    }, {passive:false});

    // Click → Build
    c.addEventListener('click', e=>{
      if(!w.hoverTile) return;
      buildAt(w, w.activeTool, w.hoverTile.tx, w.hoverTile.ty);
    });

    // Double-Tap → Reset View
    let lastTap=0;
    c.addEventListener('pointerdown', ()=>{
      const t=performance.now(); if(t-lastTap<280){ w.camX=0; w.camY=0; w.zoom=1; }
      lastTap=t;
    });
  }

  /* --------------------------- Public API --------------------------- */
  function setActiveTool(name){
    if(!buildCosts[name]){ DBG('Tool unknown', name); return; }
    this._world.activeTool = name;
  }

  /* --------------------------- Build Logic --------------------------- */
  function canAfford(w, cost){
    return (w.res.wood>=cost.wood && w.res.stone>=cost.stone && w.res.food>=cost.food && w.res.pop>=cost.pop);
  }
  function pay(w, cost){
    const before = {...w.res};
    w.res.wood -= cost.wood; w.res.stone -= cost.stone; w.res.food -= cost.food; w.res.pop -= cost.pop;
    w.updateHUD();
    DBG('HUD build', JSON.stringify(w.res));
    return before;
  }

  function buildAt(w, tool, tx, ty){
    const cost = buildCosts[tool];
    if(!cost){ DBG('Build FAIL → no cost', tool); return; }
    if(!canAfford(w,cost)){ DBG('Build FAIL → no resources', tool); return; }

    if(tool==='road'){
      // Keine Straße auf Gebäude-Tile
      if(tileBlockedByBuilding(w,tx,ty)){ DBG('Road blocked by building', {tx,ty}); return; }
      setRoadTile(w, tx, ty);
      pay(w, cost);
      DBG('Build OK', JSON.stringify({tool, tx, ty, cost}));
      return;
    }

    // Gebäude mit Builder
    const before = pay(w, cost);
    const b = { kind:'building', type:tool, tx, ty, placed:false };
    // Produktionsprofile
    if(tool==='lumberjack_wood'){ b.produces={kind:'wood', amount:8}; b.prodEvery=4.0; }
    if(tool==='stonebraker_wood'){ b.produces={kind:'stone', amount:6}; b.prodEvery=4.0; }
    if(tool==='farm_wood' || tool==='baeckerei_wood' || tool==='fischer_wood1' || tool==='wassermuehle_wood' || tool==='windmuehle_wood'){
      b.produces={kind:'food', amount:4}; b.prodEvery=6.0;
    }
    w.entities.push(b);

    // Builder los
    const base = findClosest(w, tx, ty, bb=> bb.kind==='building' && (bb.type==='hq_wood'||bb.type==='hq_wood_ug1'||bb.type==='hut'||bb.type==='depot_wood'));
    const start = base ? {x:base.tx, y:base.ty} : {x:0,y:w.map.height-1};
    const steps = Math.abs(start.x-tx)+Math.abs(start.y-ty);
    DBG('Build OK', JSON.stringify({tool, tx, ty, cost, before, after:{...w.res}}));
    spawnBuilder(w, start, {x:tx,y:ty}, steps, ()=>{ b.placed=true; DBG('Builder arrived', JSON.stringify({tx,ty})); });
  }

  /* --------------------------- Roads: Auto-Tiler --------------------------- */
  function isRoadAt(w,x,y){
    const W=w.map.width,H=w.map.height;
    if(x<0||y<0||x>=W||y>=H) return false;
    return w.roadMap[W*y+x]===1;
  }
  function maskNESW(w,tx,ty){
    // Bits: N=8, E=4, S=2, W=1
    const N=isRoadAt(w,tx,ty-1)?8:0;
    const E=isRoadAt(w,tx+1,ty)?4:0;
    const S=isRoadAt(w,tx,ty+1)?2:0;
    const Wt=isRoadAt(w,tx-1,ty)?1:0;
    return N|E|S|Wt;
  }
  function atlasIndexForMask(mask){
    // Rückgabe: Index 0..10 (siehe roads.ids)
    switch(mask){
      case 10: return 0;  // N+S → vertical
      case 5:  return 1;  // E+W → horizontal
      case 12: return 2;  // N+E
      case 6:  return 3;  // E+S
      case 3:  return 4;  // S+W
      case 9:  return 5;  // N+W
      case 13: return 6;  // T_up (N+E+W)
      case 14: return 7;  // T_right (N+E+S)
      case 7:  return 8;  // T_down (E+S+W)
      case 11: return 9;  // T_left (N+S+W)
      case 15: return 10; // cross
      default:
        // Einzelne Nachbarn / isoliert
        if(mask===8 || mask===2) return 0;  // nur N oder S → vertical
        if(mask===4 || mask===1) return 1;  // nur E oder W → horizontal
        return 0; // Fallback
    }
  }
  function setRoadTile(w, tx, ty){
    const W=w.map.width,H=w.map.height;
    if(tx<0||ty<0||tx>=W||ty>=H) return;
    const i = W*ty+tx;
    w.roadMap[i]=1;

    // eigene Maske + Nachbarn neu berechnen
    const recalc = (x,y)=>{
      if(x<0||y<0||x>=W||y>=H) return;
      if(!isRoadAt(w,x,y)) return;
      const m = maskNESW(w,x,y);
      const idx = atlasIndexForMask(m);
      w.roadFrames[W*y+x] = idx;
    };
    recalc(tx,ty);
    recalc(tx,ty-1); recalc(tx+1,ty); recalc(tx,ty+1); recalc(tx-1,ty);
  }

  /* --------------------------- Units --------------------------- */
  function spawnBuilder(w, from, to, steps, onArrive){
    const u = { kind:'unit', type:'builder', x:from.x, y:from.y, to, speed:2/ w.map.tileSize, t:0 };
    u.update = (dt)=>{
      const dx = Math.sign(to.x - u.x);
      const dy = Math.sign(to.y - u.y);
      if(u.x===to.x && u.y===to.y){ onArrive&&onArrive(); u.done=true; }
      else {
        if(u.x!==to.x) u.x += dx * dt*2;
        else if(u.y!==to.y) u.y += dy * dt*2;
      }
    };
    w.entities.push(u);
    DBG('Unit spawn', JSON.stringify({type:'builder', from, to, steps}));
  }

  function spawnCarrier(w, fromB, toB, kind, amount){
    const u = { kind:'unit', type:'carrier', x:fromB.tx, y:fromB.ty, phase:'toDepot',
                from:{x:fromB.tx,y:fromB.ty}, to:{x:toB.tx,y:toB.ty}, speed:2/ w.map.tileSize, payload:amount, resKind:kind };
    u.update = (dt)=>{
      const dest = (u.phase==='toDepot')? u.to : u.from;
      const dx = Math.sign(dest.x - u.x);
      const dy = Math.sign(dest.y - u.y);
      if(u.x===dest.x && u.y===dest.y){
        if(u.phase==='toDepot'){
          Game._world.res[kind] = (Game._world.res[kind]||0) + u.payload;
          Game._world.updateHUD();
          DBG('HUD deliver', JSON.stringify(Game._world.res));
          DBG('Carrier deliver', JSON.stringify({kind, amount:u.payload, at:{x:u.to.x,y:u.to.y}}));
          u.phase='toSource';
          DBG('Carrier load', JSON.stringify({kind, amount:u.payload, at:{x:u.from.x,y:u.from.y}}));
        }else{
          u.done=true;
        }
      }else{
        if(u.x!==dest.x) u.x += dx*dt*2;
        else if(u.y!==dest.y) u.y += dy*dt*2;
      }
    };
    Game._world.entities.push(u);
    DBG('Unit spawn', JSON.stringify({type:'carrier', kind, from:{x:fromB.tx,y:fromB.ty}, to:{x:toB.tx,y:toB.ty}, steps: Math.abs(u.to.x-u.from.x)+Math.abs(u.to.y-u.from.y), payload:amount}));
  }

  function updateUnit(w, u, dt){
    u.update && u.update(dt);
    if(u.done){
      const i = w.entities.indexOf(u);
      if(i>=0) w.entities.splice(i,1);
    }
  }

  /* --------------------------- Helpers --------------------------- */
  function findClosest(w, tx, ty, pred){
    let best=null, bestD=1e9;
    for(const e of w.entities){
      if(!pred(e)) continue;
      const d = Math.abs(e.tx-tx)+Math.abs(e.ty-ty);
      if(d<bestD){ bestD=d; best=e; }
    }
    return best;
  }
  function tileBlockedByBuilding(w,tx,ty){
    return w.entities.some(e=> e.kind==='building' && e.tx===tx && e.ty===ty);
  }

  /* --------------------------- Exposed API --------------------------- */
  return {
    create,
    start,
    setActiveTool,   // bound via Game.setActiveTool(...)
    buildCosts,      // used by index.html to check presence
    _world: null
  };

})();

/* Bind Game API to window for index.html handlers */
window.Game = Object.assign(window.Game||{}, Game);
