/* game.js — Siedler‑Mini DEV (Pfad‑Tex, Gebäudetex, Debug, Touch)
   - benutzt Assets.preload() mit deiner Dateistruktur (inkl. .PNG groß)
   - zeigt Terrain (grass/dirt/water), Pfadspuren topdown_path0..9
   - Gebäude-Icons aus assets/tex/building/wood/*.PNG
   - verschiebbares Debug, Zoom/Drag fix für iOS Safari
*/

import { Assets } from "./assets.js";

const TILE = 40;                         // Logik‑Tile
const DPR  = Math.max(1, Math.min(3, window.devicePixelRatio || 1));

const state = {
  // Canvas
  canvas: null, ctx: null,
  w: 0, h: 0,

  // Kamera
  camX: 0, camY: 0, zoom: 1, zMin: 0.5, zMax: 2.5,

  // Eingabe
  tool: "pointer",                       // pointer | road | hq | depot | woodcutter | erase
  panning: false, sx:0, sy:0, cx:0, cy:0,

  // Welt
  terrain: [],                           // 2D map (tile types)
  paths: [],                             // Pfadintensität (0..9)
  roads: [],                             // explicit roads (derzeit ungenutzt – auskommentierbar)
  buildings: [],                         // {type,x,y}

  // Preload‑Status
  ready: false
};

// === Textur‑Schlüssel nach deiner Struktur/Benennung ===
// Terrain:
const TEX_TERRAIN = {
  grass:  "topdown_grass",               // probiert .png/.PNG + Basispfade
  dirt:   "topdown_dirt",
  water:  "topdown_water",
  forest: "topdown_forest",
};

// Pfad‑Spuren 0..9 (topdown_path0.PNG ... topdown_path9.PNG)
const TEX_PATHS = Array.from({length:10}, (_,i)=>"topdown_path"+i);

// Gebäude (Holz‑Variante)
const TEX_BUILD = {
  hq:         "hq_wood",                 // assets/tex/building/wood/hq_wood.PNG
  depot:      "depot_wood",
  woodcutter: "lumberjack_wood",
  farm:       "farm_wood",
  stone:      "stonebraker_wood",        // (Rechtschreibung wie Datei!)
  mill:       "windmuehle_wood",
  watermill:  "wassermuehle_wood",
  bakery:     "baeckerei_wood",
  fisher:     "fischer_wood1",
  house1:     "haeuser_wood1",
  house1_up:  "haeuser_wood1_ug1",
  house2:     "haeuser_wood2",
  hq_up:      "hq_wood_ug1",
  depot_up:   "depot_wood_ug",
};

// ====== Init & Resize ======
function qs(sel){ return document.querySelector(sel); }

function attachCanvas() {
  const c = qs("#game");
  state.canvas = c;
  state.ctx = c.getContext("2d");
  resize();
  addInput();
}

function resize() {
  const c = state.canvas;
  const r = c.getBoundingClientRect();
  const w = Math.max(1, Math.floor(r.width * DPR));
  const h = Math.max(1, Math.floor(r.height* DPR));
  if (c.width!==w || c.height!==h) {
    c.width=w; c.height=h; state.w=w; state.h=h;
  }
}

// ====== Welt erzeugen (kleine Demo-Map) ======
function buildDemoMap(cols=48, rows=32) {
  state.terrain = Array.from({length:rows},()=>Array(cols).fill("grass"));
  state.paths   = Array.from({length:rows},()=>Array(cols).fill(0));

  // ein Fleck Dirt + etwas Water für Demo
  for (let y=12; y<22; y++) for (let x=8; x<18; x++) state.terrain[y][x]="dirt";
  for (let y=5; y<8; y++) for (let x=28; x<42; x++) state.terrain[y][x]="water";

  // Gebäude initial
  state.buildings = [
    {type:"hq", x: 20*TILE, y: 18*TILE},
    {type:"depot", x: 26*TILE, y: 18*TILE},
    {type:"woodcutter", x: 26*TILE, y: 14*TILE},
  ];

  // ein paar Pfadwerte (Demo)
  const trail = [[20,18],[21,18],[22,18],[23,18],[24,18],[25,18],[26,18],[26,17],[26,16],[26,15],[26,14]];
  trail.forEach(([x,y],i)=>{ state.paths[y][x] = Math.min(9, i); });
}

// ====== Drawing ======
function toScreen(wx,wy){
  return {
    x: (wx - state.camX) * state.zoom * DPR + state.w/2,
    y: (wy - state.camY) * state.zoom * DPR + state.h/2
  };
}
function toWorld(sx,sy){
  return {
    x: (sx - state.w/2) / (state.zoom*DPR) + state.camX,
    y: (sy - state.h/2) / (state.zoom*DPR) + state.camY
  };
}

function draw() {
  const ctx = state.ctx;
  ctx.clearRect(0,0,state.w,state.h);
  if (!state.ready) { drawGrid(ctx); return; }
  drawTerrain(ctx);
  drawPaths(ctx);
  drawRoads(ctx);
  drawBuildings(ctx);
  drawGrid(ctx, 0.15);
}

function drawGrid(ctx, alpha=0.08){
  ctx.save();
  ctx.strokeStyle = `rgba(207,227,255,${alpha})`;
  ctx.lineWidth = 1;
  const step = TILE*state.zoom*DPR;
  const ox = (state.w/2 - (state.camX*state.zoom)*DPR) % step;
  const oy = (state.h/2 - (state.camY*state.zoom)*DPR) % step;
  ctx.beginPath();
  for (let x=ox; x<=state.w; x+=step){ ctx.moveTo(x,0); ctx.lineTo(x,state.h); }
  for (let y=oy; y<=state.h; y+=step){ ctx.moveTo(0,y); ctx.lineTo(state.w,y); }
  ctx.stroke();
  ctx.restore();
}

function drawTerrain(ctx){
  const rows = state.terrain.length;
  const cols = state.terrain[0].length;
  for (let y=0; y<rows; y++){
    for (let x=0; x<cols; x++){
      const kind = state.terrain[y][x];
      const img = Assets.get(TEX_TERRAIN[kind]);
      const wx = x*TILE + TILE/2, wy = y*TILE + TILE/2;
      blitTile(ctx, img, wx, wy, TILE, TILE);
    }
  }
}

function drawPaths(ctx){
  const rows = state.paths.length;
  const cols = state.paths[0].length;
  for (let y=0; y<rows; y++){
    for (let x=0; x<cols; x++){
      const v = state.paths[y][x]|0;
      if (v<=0) continue;
      const key = TEX_PATHS[Math.min(9,v)];
      const img = Assets.get(key);
      if (!img) continue;
      const wx = x*TILE + TILE/2, wy = y*TILE + TILE/2;
      blitTile(ctx, img, wx, wy, TILE, TILE);
    }
  }
}

function drawRoads(ctx){
  ctx.save();
  ctx.strokeStyle = "#78d9a8";
  ctx.lineWidth = 3 * state.zoom * DPR;
  ctx.lineCap = "round";
  for (const r of state.roads) {
    const a = toScreen(r.x1, r.y1), b = toScreen(r.x2, r.y2);
    ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y); ctx.stroke();
  }
  ctx.restore();
}

function drawBuildings(ctx){
  for (const b of state.buildings) {
    const img = Assets.get(TEX_BUILD[b.type]) || null;
    const w = TILE*2, h = TILE*2;
    if (img) blitTile(ctx, img, b.x, b.y, w, h);
    else {
      // Fallback‑Klotz + Label
      const p = toScreen(b.x, b.y);
      ctx.save();
      ctx.fillStyle = "rgba(67,170,98,.85)";
      ctx.fillRect(p.x - w/2*state.zoom*DPR, p.y - h/2*state.zoom*DPR, w*state.zoom*DPR, h*state.zoom*DPR);
      ctx.fillStyle = "#cfe3ff";
      ctx.font = `${Math.round(12*DPR)}px system-ui,-apple-system`;
      ctx.textAlign="center";
      ctx.fillText(b.type.toUpperCase(), p.x, p.y - (h/2*state.zoom*DPR) - 6);
      ctx.restore();
    }
  }
}

function blitTile(ctx, img, wx, wy, tw, th){
  const p = toScreen(wx, wy);
  const sw = tw*state.zoom*DPR, sh = th*state.zoom*DPR;
  if (img) ctx.drawImage(img, p.x - sw/2, p.y - sh/2, sw, sh);
}

// ====== Input ======
function addInput(){
  const el = state.canvas;

  el.addEventListener("pointerdown", (e)=>{
    if (e.button!==0 && e.button!==undefined) return;
    el.setPointerCapture?.(e.pointerId);
    state.panning = (state.tool === "pointer");
    state.sx = e.clientX; state.sy = e.clientY;
    state.cx = state.camX; state.cy = state.camY;

    if (!state.panning) {
      // Bauen per Tap – auf Kacheln snappen
      const {x,y} = toWorld(e.clientX*DPR, e.clientY*DPR);
      const gx = Math.round(x / TILE) * TILE;
      const gy = Math.round(y / TILE) * TILE;
      if (state.tool === "hq" || state.tool==="depot" || state.tool==="woodcutter"){
        state.buildings.push({type:state.tool, x:gx, y:gy});
      }
    }
  }, {passive:false});

  el.addEventListener("pointermove", (e)=>{
    if (!state.panning) return;
    e.preventDefault();
    const dx = (e.clientX - state.sx) / (state.zoom);
    const dy = (e.clientY - state.sy) / (state.zoom);
    state.camX = state.cx - dx;
    state.camY = state.cy - dy;
  }, {passive:false});

  el.addEventListener("pointerup", ()=>{
    state.panning = false;
  });

  // Wheel‑Zoom (Desktop) – auf iOS ignoriert Safari wheel, ist ok
  el.addEventListener("wheel", (e)=>{
    e.preventDefault();
    const dz = -Math.sign(e.deltaY)*0.1;
    const z0 = state.zoom;
    state.zoom = clamp(z0 + dz, state.zMin, state.zMax);
    writeHUD();
  }, {passive:false});

  // Buttons (falls vorhanden)
  qs("#btnDebug")?.addEventListener("click", ()=>toggleDebug());
  qs("#btnCenter")?.addEventListener("click", ()=>center());
  qs("#btnFull")  ?.addEventListener("click", ()=>requestFullscreen());
  qs("#btnToolPointer")?.addEventListener("click", ()=>setTool("pointer"));
  qs("#btnToolHQ")     ?.addEventListener("click", ()=>setTool("hq"));
  qs("#btnToolDepot")  ?.addEventListener("click", ()=>setTool("depot"));
  qs("#btnToolWC")     ?.addEventListener("click", ()=>setTool("woodcutter"));
}

function clamp(v,a,b){ return Math.max(a, Math.min(b,v)); }

function requestFullscreen(){
  const el = document.documentElement;
  const req = el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen;
  if (req) req.call(el);
}

function setTool(t){ state.tool = t; writeHUD(); }
function center(){ state.camX=0; state.camY=0; }

function writeHUD(){
  const el = qs("#hudZoom"); if (el) el.textContent = state.zoom.toFixed(2)+"x";
  const tl = qs("#hudTool"); if (tl) tl.textContent =
     state.tool==="pointer" ? "Zeiger" :
     state.tool==="hq" ? "HQ" :
     state.tool==="depot" ? "Depot" :
     state.tool==="woodcutter" ? "Holzfäller" : state.tool;
}

// ====== Debug ======
let debugOn = true;  // standardmäßig an, damit Fehler sofort sichtbar sind
function toggleDebug(){
  debugOn = !debugOn;
  if (debugOn) Assets.print("Debug ON"); else Assets.print("Debug OFF");
}

// ====== Loop ======
function loop(){
  draw();
  requestAnimationFrame(loop);
}

// ====== Boot ======
async function boot(){
  attachCanvas();
  window.addEventListener("resize", resize);
  window.addEventListener("orientationchange", ()=>setTimeout(resize,250));

  // Preload: Terrain, Pfade, Gebäude (nur Keys, Loader probiert Pfade+Endungen)
  const manifest = [
    ...Object.values(TEX_TERRAIN),
    ...TEX_PATHS,
    ...Object.values(TEX_BUILD),
  ];

  Assets.print("Lade Texturen …");
  await Assets.preload(manifest, (i,n,k)=>{
    if ((i===n) && debugOn) Assets.print(`OK: ${n} Texturen geladen`);
  });

  Assets.printErrors(); // listet fehlende Keys explizit auf

  buildDemoMap();
  state.ready = true;
  writeHUD();
  loop();
}

boot();
