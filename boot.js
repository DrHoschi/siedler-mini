// boot.js — sanftes Zoom/Pan • Weltgröße aus Runtime • Fit & 1:1
import { loadAndPrepareMap, renderView } from './tools/map-runtime.js';

// ---------- DOM ----------
const canvas   = document.getElementById('game');
const ctx      = canvas.getContext('2d', { alpha:false });
const debugEl  = document.getElementById('debug');
const btnDbgT  = document.getElementById('debugToggle');
const hudMini  = document.getElementById('hudMini');

const btnStart = document.getElementById('btnStart');
const btnReload= document.getElementById('btnReload');
const selMap   = document.getElementById('selMap');
const btnFit   = document.getElementById('btnFit');
const btnOne   = document.getElementById('btnOne');

// ---------- Steuerungs‑Tuning ----------
const INPUT = {
  wheelStepExp: 0.00045, // kleiner = ruhigeres Rad‑Zoom
  panSpeed:     0.35,    // kleiner = langsameres Panning
  pinchExpo:    0.50     // kleiner = sanfteres Pinch‑Zoom
};

// ---------- State ----------
let DPR = Math.max(1, devicePixelRatio || 1);
let W = 0, H = 0;                  // CSS‑Pixel der Fläche
let running = false;
let lastTS = 0;

let world = null;                  // Ergebnis aus map-runtime
let cam = { x: 0, y: 0, zoom: 1 }; // Welt‑Koord. in Pixeln
let zoomMin = 0.1, zoomMax = 6;    // clamp

// Weltgröße (Pixel) kommt aus Runtime (view.width/height)
const WORLD = { w: 1024, h: 1024, pad: 0 };

// ---------- Debug ----------
let debugVisible = true;
const logBuffer = [];
const logMax = 6000;
function log(tag, msg) {
  const t = new Date();
  const hh = t.getHours().toString().padStart(2,'0');
  const mm = t.getMinutes().toString().padStart(2,'0');
  const ss = t.getSeconds().toString().padStart(2,'0');
  const line = `[${hh}:${mm}:${ss}] ${tag}: ${msg}`;
  logBuffer.push(line);
  while (logBuffer.join('\n').length > logMax) logBuffer.shift();
  if (debugVisible) debugEl.textContent = logBuffer.join('\n');
}
const boot = (m)=>log('boot', m);
const game = (m)=>log('game', m);
const net  = (m)=>log('net ', m);
const diag = (m)=>log('diag', m);
const atlas= (m)=>log('atlas',m);

function setDebugVisible(v){
  debugVisible = !!v;
  debugEl.style.display = debugVisible ? 'block' : 'none';
  if (debugVisible) debugEl.textContent = logBuffer.join('\n');
}

// ---------- Helpers ----------
function fitCanvas(){
  const r = canvas.getBoundingClientRect();
  W = Math.max(1, r.width|0);
  H = Math.max(1, r.height|0);
  DPR = Math.max(1, devicePixelRatio || 1);
  const w = (W * DPR) | 0;
  const h = (H * DPR) | 0;
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w; canvas.height = h;
  }
  ctx.setTransform(1,0,0,1,0,0);
  ctx.clearRect(0,0,canvas.width,canvas.height);
}
addEventListener('resize', ()=>{ fitCanvas(); recomputeZoomMin(); clampCam(); });

function toWorld(px, py){
  const rect = canvas.getBoundingClientRect();
  const sx = (px - rect.left) * DPR;
  const sy = (py - rect.top ) * DPR;
  const z  = cam.zoom * DPR;
  const wx = cam.x + sx / z;
  const wy = cam.y + sy / z;
  return { x:wx, y:wy };
}

function recomputeZoomMin(){
  // min so, dass die komplette Karte (plus pad) in den View passt
  const vw = canvas.width  / DPR;
  const vh = canvas.height / DPR;
  const minX = vw / Math.max(1, WORLD.w + WORLD.pad*2);
  const minY = vh / Math.max(1, WORLD.h + WORLD.pad*2);
  zoomMin = Math.max(0.05, Math.min(1, Math.min(minX, minY)));
  cam.zoom = clamp(cam.zoom, zoomMin, zoomMax);
}
function clamp(v,a,b){ return Math.max(a, Math.min(b, v)); }
function clampCam(){
  const vw = canvas.width  / (cam.zoom * DPR);
  const vh = canvas.height / (cam.zoom * DPR);
  const minX = -WORLD.pad;
  const minY = -WORLD.pad;
  const maxX = WORLD.w + WORLD.pad - vw;
  const maxY = WORLD.h + WORLD.pad - vh;
  cam.x = clamp(cam.x, minX, Math.max(minX, maxX));
  cam.y = clamp(cam.y, minY, Math.max(minY, maxY));
}
function autoFit(){
  recomputeZoomMin();
  cam.zoom = zoomMin;
  // mittig einpassen
  const vw = canvas.width  / (cam.zoom * DPR);
  const vh = canvas.height / (cam.zoom * DPR);
  cam.x = (WORLD.w - vw) * 0.5;
  cam.y = (WORLD.h - vh) * 0.5;
  clampCam();
}
function setOneToOne(){
  // 1:1 = 1 Gerätelogisches Pixel = 1 Weltpixel
  cam.zoom = 1;
  clampCam();
}

// ---------- UI ----------
btnDbgT.addEventListener('click', (e)=>{ e.preventDefault(); setDebugVisible(!debugVisible); });
addEventListener('keydown', (e)=>{ if (e.key==='F2') setDebugVisible(!debugVisible); });
btnReload.addEventListener('click', ()=>{
  const u = new URL(location.href);
  u.searchParams.set('v', Date.now().toString());
  location.href = u.toString();
});
btnFit.addEventListener('click', ()=> autoFit());
btnOne.addEventListener('click', ()=> setOneToOne());

btnStart.addEventListener('click', async ()=>{
  await startGame();
});

function initMapSelector(initial){
  const opts = [
    'assets/maps/map-pro.json',
    'assets/maps/map-demo.json'
  ];
  selMap.innerHTML = '';
  for (const url of opts) {
    const o = document.createElement('option');
    o.value = url; o.textContent = url; selMap.appendChild(o);
  }
  if (initial && !opts.includes(initial)) {
    const o = document.createElement('option');
    o.value = initial; o.textContent = initial; selMap.insertBefore(o, selMap.firstChild);
  }
  selMap.value = initial || opts[0];
}

// ---------- Start & Laden ----------
async function startGame(){
  const urlParam = new URL(location.href).searchParams.get('map');
  const mapUrl = selMap.value || urlParam || 'assets/maps/map-pro.json';

  fitCanvas();
  try{
    game(`Lade Karte:\n${new URL(mapUrl, location.href).toString()}`);
    const result = await loadAndPrepareMap(mapUrl, {
      onNet: (u, code, ms)=> net(`${code} ${u} (${ms}ms)`),
      onAtlas: (k,v)=> atlas(`${k}=${v}`),
      log: (t,m)=> log(t,m),
    });
    world = result;

    // >>> Weltgröße aus Runtime übernehmen
    if (world?.view?.width && world?.view?.height) {
      WORLD.w = world.view.width;
      WORLD.h = world.view.height;
      WORLD.pad = 0; // kein zusätzlicher Rand nötig für Karten
    }
    autoFit(); // direkt passend einzoomen/zentrieren

    running = true; lastTS = 0;
    requestAnimationFrame(loop);

    game('Karte geladen.');
  } catch(err){
    const msg = err?.message || String(err);
    log('game', `Karte konnte nicht geladen werden: ${msg}`);
    setDebugVisible(true);
    running = true; lastTS = 0;
    requestAnimationFrame(loop); // Fallback läuft weiter
  }
}

// ---------- Render‑Loop ----------
let frame = 0;
function loop(ts){
  if (!running) return;
  if (!lastTS) lastTS = ts;
  const dt = ts - lastTS; lastTS = ts;

  fitCanvas(); // hält DPI & Größe aktuell
  draw(dt);
  writeHud(dt);

  frame++;
  requestAnimationFrame(loop);
}

function draw(dt){
  // Hintergrund
  ctx.setTransform(1,0,0,1,0,0);
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.fillStyle = '#0b1621';
  ctx.fillRect(0,0,canvas.width,canvas.height);

  // Welt mittels Runtime‑Renderer zeichnen (mit Grid darunter)
  if (world?.view) {
    // Wir zeichnen das Grid im renderView() direkt mit (liegt unter der Karte)
    renderView(canvas, world.view, cam);
  } else {
    // Fallback: schlichtes Grid
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    const s = 64 * DPR;
    for (let x=s; x<canvas.width; x+=s){ ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,canvas.height); ctx.stroke(); }
    for (let y=s; y<canvas.height;y+=s){ ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(canvas.width,y); ctx.stroke(); }
  }
}

function writeHud(dt){
  const txt =
`Frames: ${frame}   dt=${dt.toFixed(2)}ms
Cam: x=${cam.x.toFixed(1)}  y=${cam.y.toFixed(1)}  zoom=${cam.zoom.toFixed(3)}
World: ${WORLD.w}×${WORLD.h}
View:  ${Math.round(canvas.width/DPR)}×${Math.round(canvas.height/DPR)}  DPR=${DPR.toFixed(2)}
ZoomMin=${zoomMin.toFixed(3)}  ZoomMax=${zoomMax.toFixed(2)}`;
  hudMini.textContent = txt;
}

// ---------- Input: Pan & Zoom ----------
let isPanning = false;
const panStart = { x:0, y:0, cx:0, cy:0 };

canvas.addEventListener('pointerdown', (ev)=>{
  canvas.setPointerCapture(ev.pointerId);
  isPanning = true;
  panStart.x  = ev.clientX;
  panStart.y  = ev.clientY;
  panStart.cx = cam.x;
  panStart.cy = cam.y;
});
canvas.addEventListener('pointermove', (ev)=>{
  if (!isPanning) return;
  const dx = (ev.clientX - panStart.x);
  const dy = (ev.clientY - panStart.y);
  const speed = INPUT.panSpeed;
  cam.x = panStart.cx - (dx * speed) / cam.zoom;
  cam.y = panStart.cy - (dy * speed) / cam.zoom;
  clampCam();
});
canvas.addEventListener('pointerup',   (ev)=>{ isPanning=false; canvas.releasePointerCapture(ev.pointerId); });
canvas.addEventListener('pointercancel',( )=>{ isPanning=false; });

canvas.addEventListener('wheel', (ev)=>{
  ev.preventDefault();
  const factor = Math.exp(ev.deltaY * INPUT.wheelStepExp);
  const before = toWorld(ev.clientX, ev.clientY);
  cam.zoom = clamp(cam.zoom / factor, zoomMin, zoomMax);
  const after  = toWorld(ev.clientX, ev.clientY);
  cam.x += (before.x - after.x);
  cam.y += (before.y - after.y);
  clampCam();
}, { passive:false });

// Pinch
let pinchDist0 = 0, camZoom0 = 1, pinchCenter0 = null;
canvas.addEventListener('touchstart', (e)=>{
  if (e.touches.length===2) pinchStart(e);
},{passive:false});
canvas.addEventListener('touchmove', (e)=>{
  if (e.touches.length===2) pinchMove(e);
},{passive:false});
canvas.addEventListener('touchend', (e)=>{
  if (e.touches.length<2) pinchEnd(e);
},{passive:false});

function pinchStart(e){
  e.preventDefault();
  pinchDist0  = distance(e.touches[0], e.touches[1]);
  camZoom0    = cam.zoom;
  pinchCenter0= {
    x:(e.touches[0].clientX + e.touches[1].clientX)/2,
    y:(e.touches[0].clientY + e.touches[1].clientY)/2
  };
}
function pinchMove(e){
  e.preventDefault();
  const d = distance(e.touches[0], e.touches[1]);
  const f = Math.pow(d / Math.max(1, pinchDist0), INPUT.pinchExpo);
  const before = toWorld(pinchCenter0.x, pinchCenter0.y);
  cam.zoom = clamp(camZoom0 * f, zoomMin, zoomMax);
  const after  = toWorld(pinchCenter0.x, pinchCenter0.y);
  cam.x += (before.x - after.x);
  cam.y += (before.y - after.y);
  clampCam();
}
function pinchEnd(){ pinchDist0 = 0; pinchCenter0 = null; }

function distance(a,b){ const dx=a.clientX-b.clientX, dy=a.clientY-b.clientY; return Math.hypot(dx,dy); }

// ---------- Init ----------
addEventListener('load', ()=>{
  const qMap = new URL(location.href).searchParams.get('map') || 'assets/maps/map-pro.json';
  initMapSelector(qMap);
  setDebugVisible(true);
  fitCanvas();
  recomputeZoomMin();
});
