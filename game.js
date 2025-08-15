// =====================
// game.js – Version 15
// =====================
/* Siedler‑Mini V15-tex1 (mobile)
   Neu: Textur-Lader, Boden-Tilemap, Straßen-Tiles (auto: straight/corner/t/cross).
   Achtung: Pfade nutzen .PNG (Großschreibung), passend zu deinen Uploads.
*/
export const game = (() => {
  // ======= Konstante Welt/Tile-Größe =======
  const TILE = 40;                            // Basis-Tilegröße in Weltkoordinaten
  const GRID_COLOR = "#162235";
  const ROAD_FALLBACK = "#78d9a8";
  const HQ_COLOR = "#43aa62";
  const WC_COLOR = "#3f8cff";
  const DEPOT_COLOR = "#d55384";
  const TEXT_COLOR = "#cfe3ff";

  // ======= Texturen =======
  const TEX_PATHS = {
    grass:  "assets/tex/topdown_grass.PNG",
    dirt:   "assets/tex/topdown_dirt.PNG",
    forest: "assets/tex/topdown_forest.PNG",
    water:  "assets/tex/topdown_water.PNG",
    r_straight: "assets/tex/topdown_road_straight.PNG",
    r_corner:   "assets/tex/topdown_road_corner.PNG",
    r_t:        "assets/tex/topdown_road_t.PNG",
    r_cross:    "assets/tex/topdown_road_cross.PNG",
  };
  const tex = {};
  let texturesReady = false;

  function loadTextures() {
    const entries = Object.entries(TEX_PATHS);
    let done = 0;
    return new Promise(res=>{
      entries.forEach(([k,src])=>{
        const img = new Image();
        img.onload = ()=>{ tex[k]=img; if(++done===entries.length){ texturesReady=true; res(); } };
        img.onerror = ()=>{ console.warn("Texture failed:", src); tex[k]=null; if(++done===entries.length){ texturesReady=true; res(); } };
        img.src = src;
      });
    });
  }

  // ======= State =======
  const state = {
    running:false,
    canvas:null, ctx:null,
    DPR:1, width:0, height:0,
    camX:0, camY:0, zoom:1, minZoom:0.5, maxZoom:2.5,
    tool:"pointer",
    isPanning:false, panStartX:0, panStartY:0, camStartX:0, camStartY:0,

    roads:[],       // Vektor-Segmente [{x1,y1,x2,y2}]
    buildings:[],   // [{type:"hq"|"woodcutter"|"depot", x,y,w,h}]

    // Raster (Tilemap) für Boden & Straßen
    mapW: 120, mapH: 80,
    ground:[],      // Uint8 (0=grass,1=dirt,2=forest,3=water)
    roadMask:[],    // 4-bit Nachbarschaftsmaske je Tile (N=1,E=2,S=4,W=8), 0=keine Straße

    onHUD:(k,v)=>{}
  };

  const G = { GRASS:0, DIRT:1, FOREST:2, WATER:3 };

  // ======= Utils =======
  const clamp = (v,a,b)=>Math.max(a,Math.min(b,v));
  const setHUD = (k,v)=>state.onHUD?.(k,v);
  const snap = v => Math.round(v / TILE) * TILE;

  const toWorld = (sx,sy)=>({
    x: (sx/state.DPR - state.width/2)/state.zoom + state.camX,
    y: (sy/state.DPR - state.height/2)/state.zoom + state.camY
  });
  const toScreen = (wx,wy)=>({
    x: (wx - state.camX) * state.zoom + state.width/2,
    y: (wy - state.camY) * state.zoom + state.height/2
  });

  // ======= Map init =======
  function initMap(){
    state.ground = new Uint8Array(state.mapW*state.mapH).fill(G.GRASS);
    state.roadMask = new Uint8Array(state.mapW*state.mapH).fill(0);

    // kleine Test-Patches (damit du sofort siehst, dass Texturen laden)
    ovalFill(20,22, 8,6, G.DIRT);
    ovalFill(35,16, 6,6, G.FOREST);
    ovalFill(50,14, 7,4, G.WATER);
  }

  function idx(x,y){ return y*state.mapW + x; }
  function inside(x,y){ return x>=0 && y>=0 && x<state.mapW && y<state.mapH; }

  function ovalFill(cx,cy, rx,ry, val){
    for(let y=cy-ry; y<=cy+ry; y++){
      for(let x=cx-rx; x<=cx+rx; x++){
        if(!inside(x,y)) continue;
        const dx=(x-cx)/rx, dy=(y-cy)/ry;
        if(dx*dx + dy*dy <= 1) state.ground[idx(x,y)] = val;
      }
    }
  }

  // ======= Straßen-Rasterisierung =======
  function clearRoadMask(){
    state.roadMask.fill(0);
  }

  function rasterizeAllRoads(){
    clearRoadMask();
    for(const r of state.roads) rasterizeSegment(r.x1,r.y1,r.x2,r.y2);
    recomputeRoadNeighbors();
  }

  function rasterizeSegment(x1,y1,x2,y2){
    // Bresenham über Tile-Koords
    const gx1 = Math.round(x1 / TILE), gy1 = Math.round(y1 / TILE);
    const gx2 = Math.round(x2 / TILE), gy2 = Math.round(y2 / TILE);
    let x=gx1, y=gy1;
    const dx=Math.abs(gx2-gx1), dy=Math.abs(gy2-gy1);
    const sx = gx1<gx2?1:-1, sy = gy1<gy2?1:-1;
    let err = (dx>dy?dx:-dy)/2;

    while(true){
      if(inside(x,y)) state.roadMask[idx(x,y)] |= 16; // 16 = „ist Straße“
      if(x===gx2 && y===gy2) break;
      const e2 = err;
      if(e2 > -dx){ err -= dy; x += sx; }
      if(e2 <  dy){ err += dx; y += sy; }
    }
  }

  function recomputeRoadNeighbors(){
    // aus „ist Straße“-Flag (bit 4) erzeugen wir NX/E/S/W Bits (0..15)
    for(let y=0;y<state.mapH;y++){
      for(let x=0;x<state.mapW;x++){
        const id = idx(x,y);
        if(!(state.roadMask[id] & 16)){ state.roadMask[id]=0; continue; }
        let m=0;
        if(inside(x,  y-1) && (state.roadMask[idx(x,y-1)]&16)) m|=1; // N
        if(inside(x+1,y  ) && (state.roadMask[idx(x+1,y)]&16)) m|=2; // E
        if(inside(x,  y+1) && (state.roadMask[idx(x,y+1)]&16)) m|=4; // S
        if(inside(x-1,y  ) && (state.roadMask[idx(x-1,y)]&16)) m|=8; // W
        state.roadMask[id] = m;
      }
    }
  }

  function roadSpriteForMask(m){
    // 0/1/2 Nachbarn = Straight (oder Ende); 2 orthogonal = Corner; 3 = T; 4 = Cross
    const n = ((m&1)?1:0)+((m&2)?1:0)+((m&4)?1:0)+((m&8)?1:0);
    if(n>=4) return {img:tex.r_cross, rot:0};

    // Ecke (zwei Nachbarn mit 90°)
    const isCorner = (m=== (1|2)) || (m=== (2|4)) || (m=== (4|8)) || (m=== (8|1));
    if(isCorner){
      if(m===(1|2)) return {img:tex.r_corner, rot:0};     // N+E
      if(m===(2|4)) return {img:tex.r_corner, rot:90};    // E+S
      if(m===(4|8)) return {img:tex.r_corner, rot:180};   // S+W
      if(m===(8|1)) return {img:tex.r_corner, rot:270};   // W+N
    }

    if(n===3){
      // T-Stück: offene Seite zeigt in Richtung ohne Nachbar
      if(!(m&1)) return {img:tex.r_t, rot:180}; // offen nach N -> T nach oben (rotiert 180)
      if(!(m&2)) return {img:tex.r_t, rot:270}; // offen nach E
      if(!(m&4)) return {img:tex.r_t, rot:0};   // offen nach S
      if(!(m&8)) return {img:tex.r_t, rot:90};  // offen nach W
    }

    // Gerade / Endstück (n 0..2 in Linie)
    // horizontale Linie: E oder W gesetzt, aber nicht N/S
    const horiz = (m&(2|8)) && !(m&(1|4));
    return {img:tex.r_straight, rot: horiz?90:0};
  }

  // ======= Zeichnen =======
  function resizeCanvas(){
    const rect = state.canvas.getBoundingClientRect();
    state.DPR = Math.max(1, Math.min(3, window.devicePixelRatio||1));
    const w = Math.max(1, Math.floor(rect.width * state.DPR));
    const h = Math.max(1, Math.floor(rect.height* state.DPR));
    if(state.canvas.width!==w) state.canvas.width=w;
    if(state.canvas.height!==h) state.canvas.height=h;
    state.width=w; state.height=h;
  }

  function writeZoomHUD(){ setHUD("Zoom", `${state.zoom.toFixed(2)}x`); }

  function drawGrid(ctx){
    ctx.save();
    ctx.strokeStyle = GRID_COLOR;
    ctx.lineWidth = 1;
    const step = TILE * state.zoom * state.DPR;
    const ox = (state.width/2 - (state.camX*state.zoom)*state.DPR) % step;
    const oy = (state.height/2 - (state.camY*state.zoom)*state.DPR) % step;
    ctx.beginPath();
    for(let x=ox; x<=state.width; x+=step){ ctx.moveTo(x,0); ctx.lineTo(x,state.height); }
    for(let y=oy; y<=state.height; y+=step){ ctx.moveTo(0,y); ctx.lineTo(state.width,y); }
    ctx.stroke();
    ctx.restore();
  }

  function drawGround(ctx){
    if(!texturesReady){ return; } // solange Texturen laden, nichts rischten (Fallback ist Grid)

    const sx0 = Math.floor((state.camX - (state.width/state.DPR/2)/state.zoom) / TILE) - 1;
    const sy0 = Math.floor((state.camY - (state.height/state.DPR/2)/state.zoom) / TILE) - 1;
    const sx1 = Math.ceil((state.camX + (state.width/state.DPR/2)/state.zoom) / TILE) + 1;
    const sy1 = Math.ceil((state.camY + (state.height/state.DPR/2)/state.zoom) / TILE) + 1;

    for(let gy=sy0; gy<=sy1; gy++){
      for(let gx=sx0; gx<=sx1; gx++){
        if(!inside(gx,gy)) continue;
        const w = TILE * state.zoom * state.DPR;
        const p = toScreen(gx*TILE, gy*TILE);
        const x = (p.x*state.DPR) - w/2;
        const y = (p.y*state.DPR) - w/2;

        const g = state.ground[idx(gx,gy)];
        const img =
          g===G.GRASS ? tex.grass :
          g===G.DIRT ? tex.dirt :
          g===G.FOREST ? tex.forest :
          tex.water;

        if(img) ctx.drawImage(img, x, y, w, w);

        // Straßen-Overlay
        const m = state.roadMask[idx(gx,gy)];
        if(m){
          const spr = roadSpriteForMask(m);
          if(spr && spr.img){
            ctx.save();
            ctx.translate(x+w/2, y+w/2);
            ctx.rotate(spr.rot * Math.PI/180);
            ctx.drawImage(spr.img, -w/2, -w/2, w, w);
            ctx.restore();
          }else{
            // Fallback: Linie
            ctx.save();
            ctx.strokeStyle = ROAD_FALLBACK;
            ctx.lineWidth = 3 * state.zoom * state.DPR;
            ctx.beginPath();
            ctx.moveTo(x, y); ctx.lineTo(x+w, y+w);
            ctx.stroke();
            ctx.restore();
          }
        }
      }
    }
  }

  function drawBuildings(ctx){
    for(const b of state.buildings){
      const p = toScreen(b.x,b.y);
      const pw = b.w * state.zoom * state.DPR;
      const ph = b.h * state.zoom * state.DPR;
      ctx.save();
      ctx.fillStyle =
        b.type==="hq" ? HQ_COLOR :
        b.type==="woodcutter" ? WC_COLOR : DEPOT_COLOR;
      ctx.fillRect((p.x*state.DPR)-pw/2, (p.y*state.DPR)-ph/2, pw, ph);
      ctx.fillStyle = TEXT_COLOR;
      ctx.font = `${Math.round(12*state.DPR*state.zoom)}px system-ui,-apple-system,Segoe UI`;
      ctx.textAlign="center"; ctx.textBaseline="bottom";
      ctx.fillText(
        b.type==="hq" ? "HQ" : (b.type==="woodcutter"?"Holzfäller":"Depot"),
        p.x*state.DPR, (p.y*state.DPR)-4*state.DPR
      );
      ctx.restore();
    }
  }

  function drawWorld(){
    const ctx = state.ctx;
    ctx.clearRect(0,0,state.width,state.height);
    drawGround(ctx);
    drawGrid(ctx);          // feines Raster darüber
    drawBuildings(ctx);
  }

  function tick(){
    if(!state.running){ drawWorld(); return requestAnimationFrame(tick); }
    drawWorld();
    requestAnimationFrame(tick);
  }

  // ======= Bauen / Löschen =======
  let roadStart = null;

  function placeOrFinishRoad(wx,wy){
    const gx = snap(wx), gy = snap(wy);
    if(!roadStart){ roadStart = {x:gx,y:gy}; return; }
    const seg = { x1: roadStart.x, y1: roadStart.y, x2: gx, y2: gy };
    if(Math.hypot(seg.x2-seg.x1, seg.y2-seg.y1) > 1){
      state.roads.push(seg);
      rasterizeAllRoads();
    }
    roadStart = null;
  }

  function placeBuilding(type, wx, wy){
    const b = { type, x: snap(wx), y: snap(wy), w: TILE*2, h: TILE*2 };
    state.buildings.push(b);
  }

  function tryErase(wx,wy){
    // Gebäude
    for(let i=state.buildings.length-1;i>=0;i--){
      const b = state.buildings[i];
      const x0=b.x-b.w/2, x1=b.x+b.w/2, y0=b.y-b.h/2, y1=b.y+b.h/2;
      if(wx>=x0 && wx<=x1 && wy>=y0 && wy<=y1){
        state.buildings.splice(i,1);
        return true;
      }
    }
    // Straßen (Raster + Segmente)
    const gx = Math.round(wx/TILE), gy = Math.round(wy/TILE);
    if(inside(gx,gy)){
      state.roadMask[idx(gx,gy)] = 0;
      // auch Segmente entfernen, die durch das Tile gehen (grobe Näherung)
      state.roads = state.roads.filter(r=>{
        const minx=Math.min(r.x1,r.x2), maxx=Math.max(r.x1,r.x2);
        const miny=Math.min(r.y1,r.y2), maxy=Math.max(r.y1,r.y2);
        return !(gx*TILE>=minx-1 && gx*TILE<=maxx+1 && gy*TILE>=miny-1 && gy*TILE<=maxy+1);
      });
      rasterizeAllRoads();
      return true;
    }
    return false;
  }

  // ======= Eingabe =======
  function addInput(){
    const el = state.canvas;
    el.addEventListener("pointerdown", onPointerDown, {passive:false});
    el.addEventListener("pointermove", onPointerMove, {passive:false});
    el.addEventListener("pointerup", onPointerUp, {passive:false});
    el.addEventListener("pointercancel", onPointerUp, {passive:false});
    el.addEventListener("wheel", onWheel, {passive:false});

    window.addEventListener("resize", resizeCanvas);
    window.addEventListener("orientationchange", ()=>setTimeout(resizeCanvas,250));
    document.addEventListener("fullscreenchange", resizeCanvas);
    document.addEventListener("webkitfullscreenchange", resizeCanvas);
  }

  function onWheel(e){
    if(state.tool!=="pointer") return; // Zoomen nur im Zeiger-Tool
    e.preventDefault();
    const delta = -Math.sign(e.deltaY)*0.1;
    const before = state.zoom;
    state.zoom = clamp(state.zoom + delta, state.minZoom, state.maxZoom);
    if(state.zoom!==before) writeZoomHUD();
  }

  function onPointerDown(e){
    // Capture
    try{ state.canvas.setPointerCapture(e.pointerId); }catch{}
    const {x,y} = toWorld(e.clientX*state.DPR, e.clientY*state.DPR);

    if(state.tool==="pointer"){
      state.isPanning=true;
      state.panStartX=e.clientX; state.panStartY=e.clientY;
      state.camStartX=state.camX; state.camStartY=state.camY;
    }else if(state.tool==="road"){
      placeOrFinishRoad(x,y);
    }else if(state.tool==="hq"){
      placeBuilding("hq",x,y);
    }else if(state.tool==="woodcutter"){
      placeBuilding("woodcutter",x,y);
    }else if(state.tool==="depot"){
      placeBuilding("depot",x,y);
    }else if(state.tool==="erase"){
      tryErase(x,y);
    }
  }

  function onPointerMove(e){
    if(state.isPanning && state.tool==="pointer"){
      e.preventDefault();
      const dx = (e.clientX - state.panStartX) / state.zoom;
      const dy = (e.clientY - state.panStartY) / state.zoom;
      state.camX = state.camStartX - dx;
      state.camY = state.camStartY - dy;
    }
  }

  function onPointerUp(e){
    state.isPanning=false;
    try{ state.canvas.releasePointerCapture(e.pointerId); }catch{}
  }

  // ======= API =======
  function setTool(name){
    state.tool = name;
    if(name!=="road") roadStart=null;
    setHUD("Tool",
      name==='pointer' ? 'Zeiger' :
      name==='road' ? 'Straße' :
      name==='hq' ? 'HQ' :
      name==='woodcutter' ? 'Holzfäller' :
      name==='depot' ? 'Depot' : 'Abriss'
    );
  }

  function center(){
    state.camX=0; state.camY=0;
  }

  function attachCanvas(canvas){
    state.canvas = canvas;
    state.ctx = canvas.getContext("2d");
    resizeCanvas();
  }

  function startGame(opts){
    if(state.running) return;

    state.onHUD = (k,v)=>{
      if(opts && typeof opts.onHUD === "function") opts.onHUD(k,v);
      if(k==="Zoom"){ const el=document.querySelector("#hudZoom"); if(el) el.textContent=v; }
      if(k==="Tool"){ const el=document.querySelector("#hudTool"); if(el) el.textContent=v; }
    };

    attachCanvas(opts.canvas);
    addInput();
    setTool("pointer");
    writeZoomHUD();
    initMap();

    // Texturen asynchron laden (ohne Blockieren)
    loadTextures().then(()=>{/*texturesReady=true*/});

    // erste Darstellung der existierenden (ggf. gespeicherten) Straßen
    rasterizeAllRoads();

    state.running = true;
    requestAnimationFrame(tick);
  }

  return {
    startGame, setTool, center,
    get state(){ return state; },
  };
})();
