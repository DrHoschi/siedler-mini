/* game.js — Terrain integriert (PNG/JPEG), flexible Namen
   V15.2‑terrain
*/
import { Assets } from './assets.js?v=15.2t';

export const game = (() => {
  // ===== Welt/Render =====
  const TILE = 64;                             // Terrain‑Tilegröße (passt zu deinen 64x64)
  const GRID_COLOR = "rgba(46,60,84,.35)";

  // ===== State =====
  const state = {
    running:false,
    canvas:null, ctx:null,
    DPR:1, width:0, height:0,
    camX:0, camY:0, zoom:1,
    minZoom:.5, maxZoom:3,

    // Eingabe
    pointerTool:"pointer",
    isPanning:false, panStartX:0, panStartY:0, camStartX:0, camStartY:0,

    // Welt
    cols: 80, rows: 60,       // feste Map (kannst du später ändern)
    terrain: [],              // int‑Codes pro Zelle
    textures: {},             // name->Image
    texById: {},              // id -> Image/Canvas
    // simple Building/Road (wie gehabt)
    roads: [],
    buildings: [],

    // HUD callback
    onHUD:(k,v)=>{},
    debug:false
  };

  // Terrain‑IDs (du kannst das frei mappen)
  const T = {
    GRASS:0, DIRT:1, WATER:2, SHORE:3, ROCK:4, SAND:5, PATH:6
  };

  // Welche Schlüssel wir zu laden versuchen -> flexible Dateinamen!
  const TEX_KEYS = {
    grass: ["grass","grass0","path0","topdown_grass"],
    dirt:  ["dirt","mud","ground","topdown_dirt"],
    water: ["water","water0","lake","topdown_water"],
    shore: ["shore","beach","coast","topdown_shore","sandshore"],
    rock:  ["rock","rocky","stone","topdown_rock","stones"],
    sand:  ["sand","desert","topdown_sand"],
    path:  ["path","path0","road_dirt","track"], // dein „Pfad“ (Trampelpfad)
  };

  // ===== Utils =====
  const clamp = (v,a,b)=>Math.max(a,Math.min(b,v));
  const toWorld = (sx,sy) => ({
    x: (sx/state.DPR - state.width/2)/state.zoom + state.camX,
    y: (sy/state.DPR - state.height/2)/state.zoom + state.camY
  });
  const toScreen = (wx,wy) => ({
    x: (wx - state.camX) * state.zoom + state.width/2,
    y: (wy - state.camY) * state.zoom + state.height/2
  });

  // ===== Init =====
  async function startGame({canvas, onHUD}){
    if (state.running) return;
    state.canvas = canvas;
    state.ctx = canvas.getContext("2d");
    state.DPR = Math.max(1, Math.min(3, window.devicePixelRatio||1));
    state.onHUD = onHUD || state.onHUD;

    resizeCanvas();
    // Startkamera in Mitte der Map
    state.camX = (state.cols*TILE)/2;
    state.camY = (state.rows*TILE)/2;
    state.zoom = 1.0;
    writeHUD("Zoom", `${state.zoom.toFixed(2)}x`);
    writeHUD("Tool", "Zeiger");

    // Terrain anlegen + Texturen laden
    buildTerrain();
    await loadTerrainTextures();

    addInput();
    state.running = true;
    requestAnimationFrame(tick);
  }

  function writeHUD(k,v){ state.onHUD?.(k,v); }

  // einfache Map (Grass mit etwas Wasser/Sand/Stein gemischt)
  function buildTerrain(){
    state.terrain = new Array(state.rows * state.cols).fill(T.GRASS);
    // Streue ein paar Flecken
    const rnd = mulberry32(12345);
    const blobs = (type, count, radius)=>{
      for (let n=0;n<count;n++){
        const cx = Math.floor(rnd()*state.cols);
        const cy = Math.floor(rnd()*state.rows);
        for (let y=-radius;y<=radius;y++){
          for (let x=-radius;x<=radius;x++){
            if (x*x+y*y<=radius*radius){
              const gx = clamp(cx+x,0,state.cols-1);
              const gy = clamp(cy+y,0,state.rows-1);
              state.terrain[gy*state.cols+gx] = type;
            }
          }
        }
      }
    };
    blobs(T.WATER, 6, 4);
    blobs(T.SAND, 10, 3);
    blobs(T.ROCK, 6, 3);
    blobs(T.DIRT, 8, 3);
    // Ufer umranden (WATER Nachbarn -> SHORE)
    for (let y=0;y<state.rows;y++){
      for (let x=0;x<state.cols;x++){
        const i=y*state.cols+x;
        if (state.terrain[i]!==T.WATER) continue;
        for (let dy=-1;dy<=1;dy++){
          for (let dx=-1;dx<=1;dx++){
            if (!dx && !dy) continue;
            const nx=x+dx, ny=y+dy;
            if (nx<0||ny<0||nx>=state.cols||ny>=state.rows) continue;
            const ni=ny*state.cols+nx;
            if (state.terrain[ni]!==T.WATER) state.terrain[ni]=T.SHORE;
          }
        }
      }
    }
  }

  async function loadTerrainTextures(){
    // Wir versuchen mehrere Kandidaten pro Kategorie; bei Erfolg merken wir uns genau 1 Image
    async function loadOne(keyArray, fallbackLabel){
      for (const nm of keyArray){
        const img = await Assets.loadTextures({keys:[nm]}).then(()=>Assets.getTexture(nm));
        if (img) return img;
      }
      // Platzhalter
      return Assets.placeholder64(fallbackLabel);
    }

    const grass = await loadOne(TEX_KEYS.grass, "GRASS");
    const dirt  = await loadOne(TEX_KEYS.dirt,  "DIRT");
    const water = await loadOne(TEX_KEYS.water, "WATER");
    const shore = await loadOne(TEX_KEYS.shore, "SHORE");
    const rock  = await loadOne(TEX_KEYS.rock,  "ROCK");
    const sand  = await loadOne(TEX_KEYS.sand,  "SAND");
    const path  = await loadOne(TEX_KEYS.path,  "PATH");

    state.textures = {grass,dirt,water,shore,rock,sand,path};
    // Mapping ID -> Bild
    state.texById = {
      [T.GRASS]: grass,
      [T.DIRT ]: dirt,
      [T.WATER]: water,
      [T.SHORE]: shore,
      [T.ROCK ]: rock,
      [T.SAND ]: sand,
      [T.PATH ]: path
    };
  }

  // ===== Input =====
  function addInput(){
    const el = state.canvas;
    el.addEventListener("pointerdown", onPointerDown, {passive:false});
    el.addEventListener("pointermove", onPointerMove, {passive:false});
    el.addEventListener("pointerup",   onPointerUp,   {passive:false});
    el.addEventListener("pointercancel", onPointerUp, {passive:false});
    el.addEventListener("wheel", onWheel, {passive:false});

    window.addEventListener("resize", resizeCanvas);
    window.addEventListener("orientationchange", ()=>setTimeout(resizeCanvas, 250));
    document.addEventListener("fullscreenchange", resizeCanvas);
    document.addEventListener("webkitfullscreenchange", resizeCanvas);
  }

  function onWheel(e){
    e.preventDefault();
    const dz = -Math.sign(e.deltaY) * 0.1;
    const before = state.zoom;
    state.zoom = clamp(state.zoom + dz, state.minZoom, state.maxZoom);
    if (state.zoom !== before) writeHUD("Zoom", `${state.zoom.toFixed(2)}x`);
  }

  function onPointerDown(e){
    if (e.button!==0 && e.pointerType!=="touch") return;
    try{ state.canvas.setPointerCapture(e.pointerId); }catch{}
    if (state.pointerTool==="pointer"){
      state.isPanning = true;
      state.panStartX = e.clientX; state.panStartY = e.clientY;
      state.camStartX = state.camX; state.camStartY = state.camY;
    } else {
      // Bau‑Aktionen (hier nur Demo: HQ platzieren)
      const w = toWorld(e.clientX*state.DPR, e.clientY*state.DPR);
      if (state.pointerTool==="hq"){
        state.buildings.push({type:"hq", x: snap(w.x,TILE), y: snap(w.y,TILE), w:TILE*2, h:TILE*2});
      }
      if (state.pointerTool==="erase"){
        eraseAt(w.x,w.y);
      }
    }
  }
  function onPointerMove(e){
    if (state.isPanning && state.pointerTool==="pointer"){
      e.preventDefault();
      const dx = (e.clientX - state.panStartX)/state.zoom;
      const dy = (e.clientY - state.panStartY)/state.zoom;
      state.camX = state.camStartX - dx;
      state.camY = state.camStartY - dy;
    }
  }
  function onPointerUp(e){
    state.isPanning = false;
    try{ state.canvas.releasePointerCapture(e.pointerId); }catch{}
  }

  // ===== Zeichnen =====
  function tick(){
    draw();
    requestAnimationFrame(tick);
  }

  function draw(){
    const ctx = state.ctx;
    ctx.save();
    ctx.clearRect(0,0,state.width, state.height);

    // Sichtfenster in Kacheln berechnen
    const left   = Math.floor((state.camX - state.width/(2*state.zoom)) / TILE);
    const top    = Math.floor((state.camY - state.height/(2*state.zoom)) / TILE);
    const right  = Math.ceil ((state.camX + state.width/(2*state.zoom)) / TILE);
    const bottom = Math.ceil ((state.camY + state.height/(2*state.zoom)) / TILE);

    for (let gy=top; gy<bottom; gy++){
      if (gy<0||gy>=state.rows) continue;
      for (let gx=left; gx<right; gx++){
        if (gx<0||gx>=state.cols) continue;
        const id = state.terrain[gy*state.cols + gx] ?? T.GRASS;
        const img = state.texById[id] || state.textures.grass;

        const wx = gx*TILE + TILE/2;
        const wy = gy*TILE + TILE/2;
        const p  = toScreen(wx,wy);
        const size = TILE*state.zoom*state.DPR;

        // zeichne 64x64 Bild skaliert auf TILE
        ctx.drawImage(img, Math.round((p.x - TILE/2*state.zoom)*state.DPR),
                           Math.round((p.y - TILE/2*state.zoom)*state.DPR),
                           Math.round(size), Math.round(size));
      }
    }

    // optional Raster
    drawGrid(ctx);

    // Gebäude (einfach als Boxen)
    for (const b of state.buildings){
      drawBuilding(ctx,b);
    }

    if (state.debug){
      ctx.fillStyle = "rgba(0,0,0,.5)";
      ctx.fillRect(6*state.DPR, (state.height-70*state.DPR), 320*state.DPR, 64*state.DPR);
      ctx.fillStyle = "#cfe3ff";
      ctx.font = `${12*state.DPR}px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`;
      ctx.fillText(`cam=(${state.camX.toFixed(1)}, ${state.camY.toFixed(1)}) zoom=${state.zoom.toFixed(2)} DPR=${state.DPR}`, 12*state.DPR, (state.height-48*state.DPR));
      ctx.fillText(`tiles=${state.cols}x${state.rows}  visible=${Math.max(0,(right-left)*(bottom-top))}`, 12*state.DPR, (state.height-28*state.DPR));
    }

    ctx.restore();
  }

  function drawGrid(ctx){
    ctx.save();
    ctx.lineWidth = 1;
    ctx.strokeStyle = GRID_COLOR;
    const step = TILE * state.zoom * state.DPR;
    const ox = (state.width/2 - (state.camX*state.zoom)*state.DPR) % step;
    const oy = (state.height/2 - (state.camY*state.zoom)*state.DPR) % step;
    ctx.beginPath();
    for (let x=ox; x<=state.width; x+=step){ ctx.moveTo(x,0); ctx.lineTo(x,state.height); }
    for (let y=oy; y<=state.height; y+=step){ ctx.moveTo(0,y); ctx.lineTo(state.width,y); }
    ctx.stroke();
    ctx.restore();
  }

  function drawBuilding(ctx,b){
    const p = toScreen(b.x,b.y);
    const w = b.w*state.zoom*state.DPR;
    const h = b.h*state.zoom*state.DPR;
    ctx.save();
    ctx.fillStyle = b.type==="hq" ? "#3aa56d" : "#5f8cff";
    ctx.fillRect((p.x*state.DPR - w/2), (p.y*state.DPR - h/2), w, h);
    ctx.restore();
  }

  // ===== Helpers =====
  function resizeCanvas(){
    const c = state.canvas;
    const rect = c.getBoundingClientRect();
    state.width  = Math.max(1, Math.floor(rect.width  * state.DPR));
    state.height = Math.max(1, Math.floor(rect.height * state.DPR));
    if (c.width!==state.width || c.height!==state.height){
      c.width = state.width; c.height = state.height;
    }
  }
  function snap(v, s){ return Math.round(v/s)*s; }

  function eraseAt(wx,wy){
    for (let i=state.buildings.length-1;i>=0;i--){
      const b=state.buildings[i];
      const x0=b.x-b.w/2, x1=b.x+b.w/2, y0=b.y-b.h/2, y1=b.y+b.h/2;
      if (wx>=x0 && wx<=x1 && wy>=y0 && wy<=y1){ state.buildings.splice(i,1); return; }
    }
  }

  // Mini RNG
  function mulberry32(a){ return function(){ let t=a+=0x6D2B79F5; t=Math.imul(t^t>>>15, t|1); t^=t+Math.imul(t^t>>>7, t|61); return ((t^t>>>14)>>>0)/4294967296; } }

  // ===== API =====
  function setTool(name){
    state.pointerTool = name;
    writeHUD("Tool", name==='pointer'?'Zeiger':
                    name==='road'?'Straße':
                    name==='hq'?'HQ':
                    name==='woodcutter'?'Holzfäller':
                    name==='depot'?'Depot':'Abriss');
  }
  function center(){
    state.camX = (state.cols*TILE)/2;
    state.camY = (state.rows*TILE)/2;
  }
  function toggleDebug(){ state.debug = !state.debug; }

  return { startGame, setTool, center, toggleDebug };
})();
