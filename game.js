/* ============================================================
   game.js • v1.16
   Neu:
   - Trampelpfad-System (path0..9) mit Auto‑Ausbau über Nutzung
   - Laufgeschwindigkeit pro Pfad‑Stufe
   - Rendering: Terrain → River → Paths → Road → Units → Buildings → HUD
   - Schützt Gebäude-Tiles: River/Path/Road werden dort nicht gemalt
   Pfade: assets/tex/path/topdown_path0.PNG ... topdown_path9.PNG
   ============================================================ */

(function(global){
  'use strict';

  const TILE = 64;
  const BootUI = global.BootUI || (global.BootUI = {});
  BootUI.dbg = BootUI.dbg || function(){ console.log('[DBG]', ...arguments); };

  const clamp = (v,min,max)=> Math.max(min, Math.min(max, v));
  const key = (x,y)=> `${x},${y}`;

  const Game = {
    ctx:null, canvas:null,
    cam:{x:0,y:0,z:1},
    running:false,
    map:null,
    hud:{wood:1000,stone:1000,food:1000,pop:1000},
    activeTool:'hut',
    buildCosts:{
      road:{wood:1,stone:0,food:0,pop:0},
      hut:{wood:10,stone:2,food:0,pop:1},
      lumberjack_wood:{wood:12,stone:0,food:0,pop:2},
      stonebraker_wood:{wood:8,stone:6,food:0,pop:2},
      farm_wood:{wood:12,stone:4,food:0,pop:2},
      baeckerei_wood:{wood:14,stone:6,food:0,pop:2},
      fischer_wood1:{wood:12,stone:4,food:0,pop:2},
      wassermuehle_wood:{wood:16,stone:8,food:0,pop:3},
      windmuehle_wood:{wood:16,stone:6,food:0,pop:3},
      depot_wood:{wood:14,stone:4,food:0,pop:1},
      depot_wood_ug:{wood:24,stone:8,food:0,pop:2},
      hq_wood:{wood:40,stone:10,food:0,pop:5},
      hq_wood_ug1:{wood:60,stone:20,food:0,pop:8},
      haeuser_wood1:{wood:10,stone:2,food:0,pop:2},
      haeuser_wood1_ug1:{wood:14,stone:4,food:0,pop:3},
      haeuser_wood2:{wood:12,stone:3,food:0,pop:3},
    },
    setActiveTool(t){ Game.activeTool=t; },
  };
  global.Game = Game;

  // ---------- Assets ----------
  const Img = {
    terrainPng:'./assets/tiles/tileset.terrain.png',
    road: {
      straight_v:'./assets/tex/road/road_atlas.png#0',
      straight_h:'./assets/tex/road/road_atlas.png#1',
      curve_NE:'./assets/tex/road/road_atlas.png#2',
      curve_SE:'./assets/tex/road/road_atlas.png#3',
      curve_SW:'./assets/tex/road/road_atlas.png#4',
      curve_NW:'./assets/tex/road/road_atlas.png#5',
      T_up:'./assets/tex/road/road_atlas.png#6',
      T_right:'./assets/tex/road/road_atlas.png#7',
      T_down:'./assets/tex/road/road_atlas.png#8',
      T_left:'./assets/tex/road/road_atlas.png#9',
      cross:'./assets/tex/road/road_atlas.png#10',
    },
    river:{
      straight_v:'./assets/tex/river/topdown_river_straight_vertical.png',
      straight_h:'./assets/tex/river/topdown_river_straight_horizontal.png',
      curve_NE:'./assets/tex/river/topdown_river_curve_NE.png',
      curve_SE:'./assets/tex/river/topdown_river_curve_SE.png',
      curve_SW:'./assets/tex/river/topdown_river_curve_SW.png',
      curve_NW:'./assets/tex/river/topdown_river_curve_NW.png',
      T_up:'./assets/tex/river/topdown_river_T_up.png',
      T_right:'./assets/tex/river/topdown_river_T_right.png',
      T_down:'./assets/tex/river/topdown_river_T_down.png',
      T_left:'./assets/tex/river/topdown_river_T_left.png',
      cross:'./assets/tex/river/topdown_river_cross.png',
    },
    path:(n)=>`./assets/tex/path/topdown_path${n}.PNG`
  };

  const Sprites = {
    terrain:null,
    road:{}, river:{}, path:[],
    placeholderTile:null
  };

  async function loadOptional(urls){
    for(const u of Array.isArray(urls)?urls:[urls]){
      try{ const img=await Asset.loadImage(u,u); return img; }catch{}
    }
    return null;
  }

  async function makePlaceholderTile(){
    const c=document.createElement('canvas'); c.width=c.height=TILE;
    const x=c.getContext('2d');
    x.fillStyle='#2b3442'; x.fillRect(0,0,TILE,TILE);
    x.fillStyle='#3e4b61'; for(let i=0;i<TILE;i+=8){ x.fillRect(i,0,1,TILE); x.fillRect(0,i,TILE,1); }
    x.fillStyle='#ff5560aa'; x.fillRect(0,0,8,8);
    const img=new Image(); img.src=c.toDataURL(); await img.decode().catch(()=>{});
    return img;
  }

  async function loadAllSprites(){
    Sprites.placeholderTile = await makePlaceholderTile();
    Sprites.terrain = await loadOptional(Img.terrainPng);

    for(const [k,u] of Object.entries(Img.road)) Sprites.road[k] = await loadOptional(u.split('#')[0]) || Sprites.placeholderTile;
    for(const [k,u] of Object.entries(Img.river)) Sprites.river[k] = await loadOptional(u) || Sprites.placeholderTile;
    for(let i=0;i<=9;i++) Sprites.path[i] = await loadOptional(Img.path(i)) || Sprites.placeholderTile;

    Asset.markTexturesReady(true);
  }

  // ---------- Map / Loader ----------
  const GameLoader = {
    async start(mapUrl){
      BootUI.dbg('GameLoader.start', mapUrl);
      await initCanvas();
      await loadAllSprites();
      const map = await fetch(mapUrl).then(r=>r.json());
      prepareMap(map); Game.map=map;
      Game.running=true; BootUI.dbg('Game started'); loop();
    },
    async continueFrom(snap){ const url=snap?.mapUrl || './assets/maps/map-mini.json'; return this.start(url); }
  };
  global.GameLoader = GameLoader;

  function prepareMap(map){
    map.w = map.w|0 || 32; map.h = map.h|0 || 18;
    if(!Array.isArray(map.ground)){
      map.ground=[]; for(let y=0;y<map.h;y++){ const row=[]; for(let x=0;x<map.w;x++) row.push(0); map.ground.push(row); }
    }
    map.road = new Set();
    map.river = new Set();
    map.path = new Map();      // key -> {count:number, level:0..9}
    map.buildings = [];
    map.blocked = new Set();   // Gebäude blockieren Auto-Tiler
  }

  // ---------- Helpers ----------
  function hasBuildingAt(x,y){ return Game.map.blocked.has(key(x,y)); }

  // bitmask NESW
  const maskNESW = (hasFn,x,y)=>{
    let m=0; if(hasFn(x,y-1))m|=1; if(hasFn(x+1,y))m|=2; if(hasFn(x,y+1))m|=4; if(hasFn(x-1,y))m|=8; return m;
  };

  const isRoad = (x,y)=> Game.map.road.has(key(x,y));
  const isRiver= (x,y)=> Game.map.river.has(key(x,y));
  const hasPath= (x,y)=> Game.map.path.has(key(x,y));

  // ---------- Path System ----------
  // Aufwertungs-Schwellen je Stufe (min. zusätzliche Schritte bis nächste Stufe)
  const PATH_THRESH = [1,2,5,10,15,20,30,45,65]; // für 0→1, 1→2, ... 8→9
  const PATH_SPEED  = [1.00,1.05,1.08,1.12,1.17,1.22,1.28,1.35,1.43,1.52]; // Stufe 0..9

  Game.pathSpeedForLevel = (lvl)=> PATH_SPEED[Math.max(0,Math.min(9,lvl|0))];

  // Bei jedem Schritt eines Trägers/Bauers rufen:
  Game.registerStep = function(tx,ty){
    if(hasBuildingAt(tx,ty) || isRoad(tx,ty)) return; // keine Pfade über Gebäude/echte Straßen
    const k = key(tx,ty);
    let p = Game.map.path.get(k);
    if(!p){ p={count:0, level:0}; Game.map.path.set(k,p); }
    p.count++;
    // Level-Aufstieg prüfen
    let need=0;
    for(let n=0;n<p.level && n<PATH_THRESH.length;n++) need += PATH_THRESH[n];
    // nächster Schwellenwert:
    const nextNeed = need + PATH_THRESH[Math.min(p.level, PATH_THRESH.length-1)];
    if(p.count >= nextNeed && p.level < 9){ p.level++; BootUI.dbg('Path upgrade', {x:tx,y:ty,level:p.level,count:p.count}); }
  };

  // ---------- Place/Build ----------
  Game.placeRoad = function(x,y){ if(!hasBuildingAt(x,y)) Game.map.road.add(key(x,y)); };
  Game.placeRiver= function(x,y){ if(!hasBuildingAt(x,y)) Game.map.river.add(key(x,y)); };
  Game.placeBuilding = function(type,x,y){
    const k=key(x,y);
    Game.map.buildings.push({type,x,y});
    Game.map.blocked.add(k);
  };

  // ---------- Mask → Sprite (Road/River) ----------
  function roadMaskAt(x,y){ return maskNESW(isRoad,x,y); }
  function riverMaskAt(x,y){ return maskNESW(isRiver,x,y); }

  function roadSpriteFor(m){
    switch(m){
      case 0b0101:return Sprites.road.straight_v;
      case 0b1010:return Sprites.road.straight_h;
      case 0b0011:return Sprites.road.curve_NE;
      case 0b0110:return Sprites.road.curve_SE;
      case 0b1100:return Sprites.road.curve_SW;
      case 0b1001:return Sprites.road.curve_NW;
      case 0b0111:return Sprites.road.T_right;
      case 0b1110:return Sprites.road.T_down;
      case 0b1101:return Sprites.road.T_left;
      case 0b1011:return Sprites.road.T_up;
      case 0b1111:return Sprites.road.cross;
      case 0b0001:return Sprites.road.straight_v;
      case 0b0010:return Sprites.road.straight_h;
      case 0b0100:return Sprites.road.straight_v;
      case 0b1000:return Sprites.road.straight_h;
      default:return Sprites.road.straight_v;
    }
  }
  function riverSpriteFor(m){
    switch(m){
      case 0b0101:return Sprites.river.straight_v;
      case 0b1010:return Sprites.river.straight_h;
      case 0b0011:return Sprites.river.curve_NE;
      case 0b0110:return Sprites.river.curve_SE;
      case 0b1100:return Sprites.river.curve_SW;
      case 0b1001:return Sprites.river.curve_NW;
      case 0b0111:return Sprites.river.T_right;
      case 0b1110:return Sprites.river.T_down;
      case 0b1101:return Sprites.river.T_left;
      case 0b1011:return Sprites.river.T_up;
      case 0b1111:return Sprites.river.cross;
      case 0b0001:return Sprites.river.straight_v;
      case 0b0010:return Sprites.river.straight_h;
      case 0b0100:return Sprites.river.straight_v;
      case 0b1000:return Sprites.river.straight_h;
      default:return Sprites.river.straight_v;
    }
  }

  // ---------- Render ----------
  function loop(){ if(!Game.running) return; render(); requestAnimationFrame(loop); }

  function render(){
    const ctx=Game.ctx, c=Game.canvas, m=Game.map;
    ctx.clearRect(0,0,c.width,c.height);

    ctx.save();
    ctx.translate(-Game.cam.x,-Game.cam.y);
    ctx.scale(Game.cam.z, Game.cam.z);

    drawGround(ctx,m);
    drawRiver(ctx,m);
    drawPaths(ctx,m);     // NEU: vor Straße
    drawRoad(ctx,m);
    drawUnits(ctx,m);
    drawBuildings(ctx,m);

    ctx.restore();
  }

  function drawGround(ctx,m){
    ctx.fillStyle='#3e572f';
    for(let y=0;y<m.h;y++) for(let x=0;x<m.w;x++)
      ctx.fillRect(x*TILE,y*TILE,TILE,TILE);
    ctx.strokeStyle='rgba(0,0,0,.15)'; ctx.lineWidth=1;
    for(let x=0;x<=m.w;x++){ ctx.beginPath(); ctx.moveTo(x*TILE,0); ctx.lineTo(x*TILE,m.h*TILE); ctx.stroke(); }
    for(let y=0;y<=m.h;y++){ ctx.beginPath(); ctx.moveTo(0,y*TILE); ctx.lineTo(m.w*TILE,y*TILE); ctx.stroke(); }
  }
  function drawOverlay(ctx,img,x,y){ ctx.drawImage(img,x*TILE,y*TILE,TILE,TILE); }

  function drawRiver(ctx,m){
    m.river.forEach(k=>{
      const [xs,ys]=k.split(','); const x=+xs,y=+ys;
      const ms = riverMaskAt(x,y);
      drawOverlay(ctx, riverSpriteFor(ms), x,y);
    });
  }

  function drawPaths(ctx,m){
    m.path.forEach((p,kstr)=>{
      const [xs,ys]=kstr.split(','); const x=+xs,y=+ys;
      const lvl = (p?.level|0); const img = Sprites.path[clamp(lvl,0,9)];
      drawOverlay(ctx,img,x,y);
    });
  }

  function drawRoad(ctx,m){
    m.road.forEach(k=>{
      const [xs,ys]=k.split(','); const x=+xs,y=+ys;
      const ms = roadMaskAt(x,y);
      drawOverlay(ctx, roadSpriteFor(ms), x,y);
    });
  }

  function drawUnits(){ /* (später) */ }

  function drawBuildings(ctx,m){
    m.buildings.forEach(b=>{
      ctx.fillStyle='#c9a97a'; const px=b.x*TILE, py=b.y*TILE;
      ctx.fillRect(px+8,py+16,TILE-16,TILE-24);
      ctx.fillStyle='#8b5e34'; ctx.fillRect(px+16,py+8,TILE-32,12);
    });
  }

  // ---------- HUD Bridge ----------
  function updateHUD(){
    const s=(id,v)=>{ const el=document.getElementById(id); if(el) el.textContent=String(v|0); };
    s('res-wood',Game.hud.wood); s('res-stone',Game.hud.stone); s('res-food',Game.hud.food); s('res-pop',Game.hud.pop);
  }

  // ---------- Canvas/Input ----------
  async function initCanvas(){
    const cvs=document.getElementById('stage'); const dpr=clamp(global.devicePixelRatio||1,1,3);
    const resize=()=>{ const w=global.innerWidth|0, h=global.innerHeight|0;
      cvs.width=Math.floor(w*dpr); cvs.height=Math.floor(h*dpr);
      cvs.style.width=w+'px'; cvs.style.height=h+'px';
      Game.ctx=cvs.getContext('2d'); Game.ctx.setTransform(dpr,0,0,dpr,0,0);
      BootUI.dbg('Canvas',w+'x'+h,'dpr:'+dpr);
    };
    resize(); global.addEventListener('resize',resize,{passive:true});

    // Panning
    let drag=false,lx=0,ly=0;
    cvs.addEventListener('pointerdown',e=>{drag=true;lx=e.clientX;ly=e.clientY;cvs.setPointerCapture(e.pointerId);});
    cvs.addEventListener('pointerup',()=>{drag=false;});
    cvs.addEventListener('pointermove',e=>{ if(!drag) return; Game.cam.x -= (e.clientX-lx); Game.cam.y -= (e.clientY-ly); lx=e.clientX; ly=e.clientY; });

    // Einfaches Platzieren:
    cvs.addEventListener('pointerdown',e=>{
      const r=cvs.getBoundingClientRect();
      const gx = Math.floor(((e.clientX-r.left)+Game.cam.x)/(TILE*Game.cam.z));
      const gy = Math.floor(((e.clientY-r.top )+Game.cam.y)/(TILE*Game.cam.z));

      const tool=Game.activeTool||'hut';
      if(tool==='road') Game.placeRoad(gx,gy);
      else if(tool==='river') Game.placeRiver(gx,gy);
      else Game.placeBuilding(tool,gx,gy);

      // Demo: registriere Schritt → Pfad wächst (als ob jemand darüber lief)
      Game.registerStep(gx,gy);

      updateHUD();
    });

    BootUI.dbg('HUD init', JSON.stringify(Game.hud)); updateHUD();
  }

})(window);
