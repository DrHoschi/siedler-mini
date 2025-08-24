/* ============================================================
   game.js • v1.15
   Changes:
   - RiverOverlay (Auto-Tiling für Wasser/Fluss)
   - Render-Reihenfolge: Terrain → River → Road → Units → Buildings → HUD
   - Sicher: malt niemals River/Road auf Gebäude-Tiles
   Notes:
   - Lädt River-Sprites aus ./assets/tex/river/…  (Einzel-PNGs)
     oder nutzt Fallback-Placeholders, wenn etwas fehlt.
   - Straßen-Mapping bleibt erhalten (v1.13).
   ============================================================ */

(function(global){
  'use strict';

  // ------------------------------
  // Basis
  // ------------------------------
  const TILE = 64;

  const BootUI = global.BootUI || (global.BootUI = {});
  BootUI.dbg = BootUI.dbg || function(){ console.log('[DBG]', ...arguments); };

  // kleines Helferlein
  const clamp = (v,min,max)=> Math.max(min, Math.min(max, v));

  // ------------------------------
  // Map/State
  // ------------------------------
  const Game = {
    ctx: null,
    canvas: null,
    map: null,           // { w,h, ground[][], buildings[], roadsSet, riverSet, etc. }
    cam: { x:0, y:0, z:1 },
    hud: { wood:1000, stone:1000, food:1000, pop:1000 },
    running: false,
    buildCosts: {
      // vorhandene Tools aus vorherigen Versionen
      road: { wood:1,  stone:0, food:0, pop:0 },
      hut:  { wood:10, stone:2, food:0, pop:1 },
      lumber: { wood:6, stone:0, food:0, pop:1 },
      mason:  { wood:4, stone:6, food:0, pop:1 },

      // Holz-Epoche (Baumenü)
      hq_wood:       { wood:40, stone:10, food:0, pop:5 },
      hq_wood_ug1:   { wood:60, stone:20, food:0, pop:8 },
      depot_wood:    { wood:14, stone:4,  food:0, pop:1 },
      depot_wood_ug: { wood:24, stone:8,  food:0, pop:2 },
      lumberjack_wood: { wood:12, stone:0, food:0, pop:2 },
      stonebraker_wood:{ wood:8,  stone:6, food:0, pop:2 },
      farm_wood:       { wood:12, stone:4, food:0, pop:2 },
      baeckerei_wood:  { wood:14, stone:6, food:0, pop:2 },
      fischer_wood1:   { wood:12, stone:4, food:0, pop:2 },
      wassermuehle_wood:{ wood:16, stone:8, food:0, pop:3 },
      windmuehle_wood:  { wood:16, stone:6, food:0, pop:3 },
      haeuser_wood1:    { wood:10, stone:2, food:0, pop:2 },
      haeuser_wood1_ug1:{ wood:14, stone:4, food:0, pop:3 },
      haeuser_wood2:    { wood:12, stone:3, food:0, pop:3 },
    },
    setActiveTool(tool){ Game.activeTool = tool; },
  };
  global.Game = Game;

  // ------------------------------
  // Asset-Refs
  // ------------------------------
  const Img = {
    // Terrain-Atlas (bereits in Projekt)
    terrainPng: './assets/tiles/tileset.terrain.png',
    // Straßen-Atlas: IDs 0..10 gem. road_ids.txt
    roadAtlas: {
      straight_v:   './assets/tex/road/road_atlas.png#0',
      straight_h:   './assets/tex/road/road_atlas.png#1',
      curve_NE:     './assets/tex/road/road_atlas.png#2',
      curve_SE:     './assets/tex/road/road_atlas.png#3',
      curve_SW:     './assets/tex/road/road_atlas.png#4',
      curve_NW:     './assets/tex/road/road_atlas.png#5',
      T_up:         './assets/tex/road/road_atlas.png#6',
      T_right:      './assets/tex/road/road_atlas.png#7',
      T_down:       './assets/tex/road/road_atlas.png#8',
      T_left:       './assets/tex/road/road_atlas.png#9',
      cross:        './assets/tex/road/road_atlas.png#10',
    },
    // RIVER: Einzelsprites (Dateien laut neuem Ordner assets/tex/river)
    river: {
      straight_v: './assets/tex/river/topdown_river_straight_vertical.png',
      straight_h: './assets/tex/river/topdown_river_straight_horizontal.png',
      curve_NE:   './assets/tex/river/topdown_river_curve_NE.png',
      curve_SE:   './assets/tex/river/topdown_river_curve_SE.png',
      curve_SW:   './assets/tex/river/topdown_river_curve_SW.png',
      curve_NW:   './assets/tex/river/topdown_river_curve_NW.png',
      T_up:       './assets/tex/river/topdown_river_T_up.png',
      T_right:    './assets/tex/river/topdown_river_T_right.png', // Achtung: falls „rigth“ im Repo, Fallback unten
      T_down:     './assets/tex/river/topdown_river_T_down.png',
      T_left:     './assets/tex/river/topdown_river_T_left.png',
      cross:      './assets/tex/river/topdown_river_cross.png',
    }
  };

  // ------------------------------
  // Loader Utils
  // ------------------------------
  async function loadOptional(pathList){
    // Lädt erstes existierendes Bild aus der Liste (Fallback-Kette)
    for(const p of pathList){
      try{
        const img = await Asset.loadImage(p, p);
        return img;
      }catch(e){
        BootUI.dbg('IMG missing →', p);
      }
    }
    return null;
  }

  // Cache für einzelne fertige Sprites
  const Sprites = {
    terrain: null,  // komplettes PNG für Boden (vereinfachtes Rendering)
    road: {},       // key -> Image (hier: wir nutzen Road als Vollkachel-PNG; #id im Pfad wird ignoriert u. nur geloggt)
    river: {},      // key -> Image
    placeholderTile: null
  };

  async function loadAllSprites(){
    // Terrain (nur PNG nötig; Tiling in Map ground erledigt)
    Sprites.terrain = await loadOptional([Img.terrainPng]);

    // Placeholder (kleines kariertes Ding)
    Sprites.placeholderTile = await makePlaceholderTile();

    // Road – wir verwenden den Atlas als fertige 64x64 Kacheln (wenn du später Frames schneidest, ersetze hier)
    for(const [k, url] of Object.entries(Img.roadAtlas)){
      // einfach das PNG laden (das #index dient nur dem Log/Mapping)
      const clean = url.split('#')[0];
      Sprites.road[k] = await loadOptional([clean]) || Sprites.placeholderTile;
    }

    // River – mit Fallback auf „rigth“-Schreibfehler
    Sprites.river.straight_v = await loadOptional([Img.river.straight_v]) || Sprites.placeholderTile;
    Sprites.river.straight_h = await loadOptional([Img.river.straight_h]) || Sprites.placeholderTile;
    Sprites.river.curve_NE   = await loadOptional([Img.river.curve_NE])   || Sprites.placeholderTile;
    Sprites.river.curve_SE   = await loadOptional([Img.river.curve_SE])   || Sprites.placeholderTile;
    Sprites.river.curve_SW   = await loadOptional([Img.river.curve_SW])   || Sprites.placeholderTile;
    Sprites.river.curve_NW   = await loadOptional([Img.river.curve_NW])   || Sprites.placeholderTile;
    Sprites.river.T_up       = await loadOptional([Img.river.T_up])       || Sprites.placeholderTile;
    Sprites.river.T_right    = await loadOptional([Img.river.T_right, './assets/tex/river/topdown_river_T_rigth.png']) || Sprites.placeholderTile;
    Sprites.river.T_down     = await loadOptional([Img.river.T_down])     || Sprites.placeholderTile;
    Sprites.river.T_left     = await loadOptional([Img.river.T_left])     || Sprites.placeholderTile;
    Sprites.river.cross      = await loadOptional([Img.river.cross])      || Sprites.placeholderTile;

    Asset.markTexturesReady(true);
  }

  async function makePlaceholderTile(){
    const c=document.createElement('canvas'); c.width=c.height=TILE;
    const x=c.getContext('2d');
    x.fillStyle='#2b3442'; x.fillRect(0,0,TILE,TILE);
    x.fillStyle='#3e4b61';
    for(let i=0;i<TILE;i+=8){ x.fillRect(i,0,1,TILE); x.fillRect(0,i,TILE,1); }
    x.fillStyle='#ff5560aa';
    x.fillRect(0,0,8,8);
    const img=new Image(); img.src=c.toDataURL(); await img.decode().catch(()=>{});
    return img;
  }

  // ------------------------------
  // Map Loading / minimaler Loader
  // ------------------------------
  const GameLoader = {
    async start(mapUrl){
      BootUI.dbg('GameLoader.start', mapUrl);
      await initCanvas();
      await loadAllSprites();

      const map = await fetch(mapUrl).then(r=>r.json());
      prepareMap(map);
      Game.map = map;

      Game.running = true;
      BootUI.dbg('Game started');
      loop();
    },
    async continueFrom(snapshot){
      // Platzhalter – Snapshot wiederherstellen (später)
      const url = snapshot?.mapUrl || './assets/maps/map-mini.json';
      return this.start(url);
    }
  };
  global.GameLoader = GameLoader;

  function prepareMap(map){
    // Erwartet: map.w, map.h, map.ground (2D/IDs) – falls nicht da, füllen
    map.w = map.w|0 || 32;
    map.h = map.h|0 || 18;

    if(!Array.isArray(map.ground)){
      map.ground = [];
      for(let y=0;y<map.h;y++){
        const row=[]; for(let x=0;x<map.w;x++) row.push(0);
        map.ground.push(row);
      }
    }

    // Overlays als Sets/Maps
    map.road = new Set();   // key "x,y"
    map.river = new Set();  // key "x,y"
    map.buildings = [];     // {x,y,type}

    map.blocked = new Set(); // Gebäude blockieren Tiles (für Auto-Tiler)
  }

  // ------------------------------
  // Input (sehr minimal)
  // ------------------------------
  function toKey(x,y){ return `${x},${y}`; }
  function hasBuildingAt(x,y){ return Game.map.blocked.has(toKey(x,y)); }

  // ------------------------------
  // River Auto-Tiler
  // ------------------------------
  // Bitmaske NESW → 1,2,4,8
  function riverMaskAt(x,y){
    const m=Game.map;
    const W=m.w, H=m.h;
    const isRiver=(tx,ty)=> (tx>=0&&ty>=0&&tx<W&&ty<H && m.river.has(toKey(tx,ty)));
    let mask=0;
    if(isRiver(x, y-1)) mask|=1; // N
    if(isRiver(x+1,y))  mask|=2; // E
    if(isRiver(x, y+1)) mask|=4; // S
    if(isRiver(x-1,y))  mask|=8; // W
    return mask;
  }

  function riverSpriteFor(mask){
    switch(mask){
      case 0b0000: return Sprites.river.straight_v; // isolierter Tümpel -> vertikal als Default
      case 0b0101: // N+S
        return Sprites.river.straight_v;
      case 0b1010: // W+E
        return Sprites.river.straight_h;
      case 0b0011: // N+E
        return Sprites.river.curve_NE;
      case 0b0110: // E+S
        return Sprites.river.curve_SE;
      case 0b1100: // S+W
        return Sprites.river.curve_SW;
      case 0b1001: // W+N
        return Sprites.river.curve_NW;
      case 0b0111: // N+E+S
        return Sprites.river.T_right;
      case 0b1110: // E+S+W
        return Sprites.river.T_down;
      case 0b1101: // S+W+N
        return Sprites.river.T_left;
      case 0b1011: // W+N+E
        return Sprites.river.T_up;
      case 0b1111: // Kreuz
        return Sprites.river.cross;
      // Endkappen: eine Richtung
      case 0b0001: return Sprites.river.straight_v;
      case 0b0010: return Sprites.river.straight_h;
      case 0b0100: return Sprites.river.straight_v;
      case 0b1000: return Sprites.river.straight_h;
      default: return Sprites.river.straight_v;
    }
  }

  // ------------------------------
  // Road (bestehend) – einfache Variante
  // ------------------------------
  function roadMaskAt(x,y){
    const m=Game.map, W=m.w, H=m.h;
    const isRoad=(tx,ty)=> (tx>=0&&ty>=0&&tx<W&&ty<H && m.road.has(toKey(tx,ty)));
    let mask=0;
    if(isRoad(x, y-1)) mask|=1; // N
    if(isRoad(x+1,y))  mask|=2; // E
    if(isRoad(x, y+1)) mask|=4; // S
    if(isRoad(x-1,y))  mask|=8; // W
    return mask;
  }

  function roadSpriteFor(mask){
    switch(mask){
      case 0b0101: return Sprites.road.straight_v; // N+S
      case 0b1010: return Sprites.road.straight_h; // W+E
      case 0b0011: return Sprites.road.curve_NE;
      case 0b0110: return Sprites.road.curve_SE;
      case 0b1100: return Sprites.road.curve_SW;
      case 0b1001: return Sprites.road.curve_NW;
      case 0b0111: return Sprites.road.T_right;
      case 0b1110: return Sprites.road.T_down;
      case 0b1101: return Sprites.road.T_left;
      case 0b1011: return Sprites.road.T_up;
      case 0b1111: return Sprites.road.cross;
      case 0b0001: return Sprites.road.straight_v;
      case 0b0010: return Sprites.road.straight_h;
      case 0b0100: return Sprites.road.straight_v;
      case 0b1000: return Sprites.road.straight_h;
      default: return Sprites.road.straight_v;
    }
  }

  // ------------------------------
  // Build/Place API (vereinfacht)
  // ------------------------------
  Game.placeRoad = function(x,y){
    if(hasBuildingAt(x,y)) return; // niemals über Gebäude
    Game.map.road.add(toKey(x,y));
  };
  Game.placeRiver = function(x,y){
    if(hasBuildingAt(x,y)) return; // niemals über Gebäude
    Game.map.river.add(toKey(x,y));
  };
  Game.placeBuilding = function(type, x,y){
    const key=toKey(x,y);
    Game.map.buildings.push({type,x,y});
    Game.map.blocked.add(key); // blockiert Auto-Tiler
  };

  // ------------------------------
  // Render
  // ------------------------------
  function loop(){
    if(!Game.running) return;
    render();
    requestAnimationFrame(loop);
  }

  function render(){
    const ctx = Game.ctx, c = Game.canvas, m=Game.map;
    ctx.clearRect(0,0,c.width,c.height);

    const scale = Game.cam.z;
    ctx.save();
    ctx.translate(-Game.cam.x, -Game.cam.y);
    ctx.scale(scale, scale);

    // 1) GROUND (einfarbig / Terrain – Placeholder)
    drawGround(ctx,m);

    // 2) RIVER OVERLAY (Auto-Tiler)
    drawRiver(ctx,m);

    // 3) ROAD OVERLAY
    drawRoad(ctx,m);

    // 4) UNITS (Platzhalter als Kreise)
    drawUnits(ctx,m);

    // 5) BUILDINGS (Sprites – simple)
    drawBuildings(ctx,m);

    ctx.restore();
  }

  function drawGround(ctx,m){
    ctx.fillStyle = '#3e572f';
    for(let y=0;y<m.h;y++){
      for(let x=0;x<m.w;x++){
        ctx.fillRect(x*TILE, y*TILE, TILE, TILE);
      }
    }
    // Grid leicht
    ctx.strokeStyle='rgba(0,0,0,.15)';
    ctx.lineWidth=1;
    for(let x=0;x<=m.w;x++){ ctx.beginPath(); ctx.moveTo(x*TILE,0); ctx.lineTo(x*TILE,m.h*TILE); ctx.stroke(); }
    for(let y=0;y<=m.h;y++){ ctx.beginPath(); ctx.moveTo(0,y*TILE); ctx.lineTo(m.w*TILE,y*TILE); ctx.stroke(); }
  }

  function drawOverlayTile(ctx, img, x,y){
    ctx.drawImage(img, x*TILE, y*TILE, TILE, TILE);
  }

  function drawRiver(ctx,m){
    m.river.forEach(key=>{
      const [xs,ys] = key.split(','); const x=+xs, y=+ys;
      const mask = riverMaskAt(x,y);
      const img = riverSpriteFor(mask);
      drawOverlayTile(ctx, img, x,y);
    });
  }

  function drawRoad(ctx,m){
    m.road.forEach(key=>{
      const [xs,ys] = key.split(','); const x=+xs, y=+ys;
      const mask = roadMaskAt(x,y);
      const img = roadSpriteFor(mask);
      drawOverlayTile(ctx, img, x,y);
    });
  }

  function drawUnits(ctx,m){
    // Platzhalter: ein paar wandernde Punkte an HQ-Positionen?
    // (Hier leer – Units kommen aus älterem System)
  }

  function drawBuildings(ctx,m){
    m.buildings.forEach(b=>{
      // einfache Formen als Platzhalter
      ctx.fillStyle = '#c9a97a';
      const px=b.x*TILE, py=b.y*TILE;
      ctx.fillRect(px+8, py+16, TILE-16, TILE-24);
      ctx.fillStyle='#8b5e34';
      ctx.fillRect(px+16, py+8, TILE-32, 12);
    });
  }

  // ------------------------------
  // UI Bridge (HUD/Res)
  // ------------------------------
  function updateHUD(){
    try{
      const set = (id,val)=>{ const el=document.getElementById(id); if(el) el.textContent = String(val|0); };
      set('res-wood', Game.hud.wood);
      set('res-stone',Game.hud.stone);
      set('res-food', Game.hud.food);
      set('res-pop',  Game.hud.pop);
    }catch{}
  }

  // ------------------------------
  // Canvas Setup
  // ------------------------------
  async function initCanvas(){
    const cvs = document.getElementById('stage');
    const dpr = clamp(global.devicePixelRatio || 1, 1, 3);
    const resize = ()=>{
      const w = Math.floor(global.innerWidth);
      const h = Math.floor(global.innerHeight);
      cvs.width  = Math.floor(w*dpr);
      cvs.height = Math.floor(h*dpr);
      cvs.style.width  = w+'px';
      cvs.style.height = h+'px';
      Game.ctx = cvs.getContext('2d');
      Game.ctx.setTransform(dpr,0,0,dpr,0,0);
      BootUI.dbg('Canvas', w,'x',h,'dpr:'+dpr);
    };
    resize();
    global.addEventListener('resize', resize, {passive:true});

    // simple Pan Gesten
    let dragging=false, lx=0, ly=0;
    cvs.addEventListener('pointerdown', (e)=>{ dragging=true; lx=e.clientX; ly=e.clientY; cvs.setPointerCapture(e.pointerId); });
    cvs.addEventListener('pointerup', ()=>{ dragging=false; });
    cvs.addEventListener('pointermove', (e)=>{
      if(!dragging) return;
      Game.cam.x -= (e.clientX-lx);
      Game.cam.y -= (e.clientY-ly);
      lx=e.clientX; ly=e.clientY;
      BootUI.dbg('Pan', {x:Game.cam.x,y:Game.cam.y,z:Game.cam.z});
    });

    // Live-Paint Demo: mit Alt = River, mit Shift = Road, sonst Gebäude „Hütte“
    cvs.addEventListener('pointerdown', (e)=>{
      const rect=cvs.getBoundingClientRect();
      const gx = Math.floor( ( (e.clientX-rect.left) + Game.cam.x ) / (TILE*Game.cam.z) );
      const gy = Math.floor( ( (e.clientY-rect.top)  + Game.cam.y ) / (TILE*Game.cam.z) );
      if(e.altKey){
        Game.placeRiver(gx,gy); BootUI.dbg('Paint River', gx,gy);
      }else if(e.shiftKey){
        Game.placeRoad(gx,gy); BootUI.dbg('Paint Road', gx,gy);
      }else{
        // aktives Tool bevorzugen
        const t = Game.activeTool || 'hut';
        if(t==='road'){ Game.placeRoad(gx,gy); BootUI.dbg('Road',gx,gy); }
        else { Game.placeBuilding(t,gx,gy); BootUI.dbg('Build',t,gx,gy); }
      }
      updateHUD();
    });

    BootUI.dbg('HUD init', JSON.stringify(Game.hud));
    updateHUD();
  }

})(window);
