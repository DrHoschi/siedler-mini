// boot.js
// ------------------------------------------------------------
// UI, Debug, Kamera/Zoom, Start-Flow, einfacher Renderer
// (zeichnet entweder die echte Map oder ein Grid-Fallback)

import { loadAndPrepareMap } from './tools/map-runtime.js';

// ---------- DOM ----------
const canvas   = document.getElementById('game');
const ctx      = canvas.getContext('2d');
const debugEl  = document.getElementById('debug');
const btnDbgT  = document.getElementById('debugToggle');
const hudMini  = document.getElementById('hudMini');

const btnStart = document.getElementById('btnStart');
const btnReload= document.getElementById('btnReload');
const selMap   = document.getElementById('selMap');

// ---------- State ----------
let DPR = Math.max(1, Math.round(devicePixelRatio || 1));
let W = 0, H = 0;                  // Canvas-Size in CSS-Pixeln
let running = false;
let lastTS = 0;

let world = null;                  // { map, tileset, tilesetImage }
let cam = { x: 0, y: 0, zoom: 1 }; // Weltkoordinaten (Tile-Grid)
const zoomMin = 0.5, zoomMax = 4;

let debugVisible = true;
const logBuffer = [];
const logMax = 4000;

// ---------- Utils ----------
function log(type, msg) {
  const t = new Date();
  const hh = t.getHours().toString().padStart(2,'0');
  const mm = t.getMinutes().toString().padStart(2,'0');
  const ss = t.getSeconds().toString().padStart(2,'0');
  const line = `[${hh}:${mm}:${ss}] ${type}: ${msg}`;
  logBuffer.push(line);
  if (logBuffer.join('\n').length > logMax) logBuffer.shift();
  if (debugVisible) debugEl.textContent = logBuffer.join('\n');
}
const boot = (m)=>log('boot', m);
const game = (m)=>log('game', m);
const net  = (m)=>log('net',  m);
const diag = (m)=>log('diag', m);
const atlas= (m)=>log('atlas',m);

function setDebugVisible(v){
  debugVisible = !!v;
  debugEl.style.display = debugVisible ? 'block' : 'none';
  if (debugVisible) debugEl.textContent = logBuffer.join('\n');
}

// Query-Params lesen (map & v=Bust)
function getParams() {
  const p = new URLSearchParams(location.search);
  return {
    map: p.get('map') || '',
    v:   p.get('v')   || ''
  };
}

// Kartenliste initialisieren
function initMapSelector(initial) {
  const presets = [
    'assets/maps/map-pro.json',
    'assets/maps/map-demo.json'
  ];
  selMap.innerHTML = '';
  for (const url of presets) {
    const opt = document.createElement('option');
    opt.value = url; opt.textContent = url;
    selMap.appendChild(opt);
  }
  if (initial) {
    // wenn die URL nicht in Presets ist, fügen wir sie oben ein
    if (![...selMap.options].some(o=>o.value===initial)) {
      const opt = document.createElement('option');
      opt.value = initial; opt.textContent = initial;
      selMap.insertBefore(opt, selMap.firstChild);
    }
    selMap.value = initial;
  }
}

// Canvas an DPI anpassen
function fitCanvas() {
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

// HUD oben links
function writeHudMini(dt) {
  const mapName = world?.map ? 'aktiv' : '–';
  const assets  = world?.tilesetImage ? 'aktiv' : '–';
  const txt = `Frames:  ${frameCount}   dt=${(dt||0).toFixed(2)}ms
Cam: x=${cam.x.toFixed(1)}   y=${cam.y.toFixed(1)}   zoom=${cam.zoom.toFixed(2)}
Map: ${mapName}   /   Assets: ${assets}
DPR=${DPR.toFixed(2)}   Size=${W}x${H}`;
  hudMini.textContent = txt;
}

// ------- Interaktion: Pan/Zoom nur auf dem Canvas -------
let isPanning = false;
let panStart = { x:0, y:0, cx:0, cy:0 };
let pinchDist0 = 0;
let camZoom0 = 1;

function toWorld(px, py){
  // Bildschirm → Weltkoordinaten (Tile‑Space)
  const sx = (px * DPR), sy = (py * DPR);
  const z = cam.zoom * DPR;
  const wx = cam.x + (sx - canvas.width/2) / (z * tileSize());
  const wy = cam.y + (sy - canvas.height/2) / (z * tileSize());
  return {x:wx, y:wy};
}

function tileSize(){
  // Basisgröße (aus Tileset oder Default 64)
  if (world?.tileset?.tileSize) return world.tileset.tileSize|0;
  return 64;
}

canvas.addEventListener('pointerdown', (ev)=>{
  canvas.setPointerCapture(ev.pointerId);
  if (ev.isPrimary) {
    isPanning = true;
    panStart = { x: ev.clientX, y: ev.clientY, cx: cam.x, cy: cam.y };
  }
});
canvas.addEventListener('pointermove', (ev)=>{
  if (isPanning) {
    const dx = (ev.clientX - panStart.x);
    const dy = (ev.clientY - panStart.y);
    const scale = 1 / (cam.zoom);
    cam.x = panStart.cx - dx * scale / (tileSize()/64);
    cam.y = panStart.cy - dy * scale / (tileSize()/64);
  }
});
canvas.addEventListener('pointerup', (ev)=>{
  isPanning = false;
  canvas.releasePointerCapture(ev.pointerId);
});
canvas.addEventListener('wheel', (ev)=>{
  ev.preventDefault();
  const dir = Math.sign(ev.deltaY);
  const factor = 1 + 0.15 * dir;
  const before = toWorld(ev.clientX, ev.clientY);
  cam.zoom = clamp(cam.zoom / factor, zoomMin, zoomMax);
  const after = toWorld(ev.clientX, ev.clientY);
  // Zoom zur Maus positionieren: Kamera verschieben
  cam.x += (before.x - after.x);
  cam.y += (before.y - after.y);
}, { passive: false });

// (Optional) sehr einfache Zwei‑Finger‑Pinch‑Erkennung
let touches = new Map();
canvas.addEventListener('touchstart', (e)=>{ if (e.touches.length===2){ pinchStart(e); } }, {passive:false});
canvas.addEventListener('touchmove',  (e)=>{ if (e.touches.length===2){ pinchMove(e); } }, {passive:false});
function pinchStart(e){
  e.preventDefault();
  pinchDist0 = distance(e.touches[0], e.touches[1]);
  camZoom0 = cam.zoom;
}
function pinchMove(e){
  e.preventDefault();
  const d = distance(e.touches[0], e.touches[1]);
  const f = d / Math.max(1, pinchDist0);
  cam.zoom = clamp(camZoom0 * f, zoomMin, zoomMax);
}
function distance(a,b){ const dx=a.clientX-b.clientX, dy=a.clientY-b.clientY; return Math.hypot(dx,dy); }
function clamp(v,a,b){ return Math.max(a, Math.min(b, v)); }

// ---------- Start-Flow ----------
btnDbgT.addEventListener('click', (e)=>{
  e.preventDefault(); e.stopPropagation();
  setDebugVisible(!debugVisible);
});
window.addEventListener('keydown', (e)=>{ if (e.key==='F2') setDebugVisible(!debugVisible); });

btnReload.addEventListener('click', ()=>{
  const u = new URL(location.href);
  u.searchParams.set('bust', Date.now());
  location.href = u.toString();
});

btnStart.addEventListener('click', async ()=>{
  await startGame();
});

async function startGame(){
  const params = getParams();
  const page = location.href;
  diag(`page=${page}`);
  boot('Debug‑Overlay aktiv (non‑blocking). F2 toggelt Overlay.');
  fitCanvas();
  initMapSelector(params.map);
  boot('preGameInit OK • V14.7‑hf2');

  try{
    const mapUrl = selMap.value || params.map || 'assets/maps/map-pro.json';
    const result = await loadAndPrepareMap(mapUrl, {
      onNet: (url, code, ms)=> net(`${code} ${url} (${ms}ms)`),
      onAtlas: (k,v)=> atlas(`[atlas] ${k}=${v}`),
      log: (t,m)=> log(t,m),
    });

    world = result;

    // Kamera zentrieren (falls wir Maße haben)
    const ts = tileSize();
    const rows = world?.map?.rows || 32;
    const cols = world?.map?.cols || 32;
    cam.x = cols/2;
    cam.y = rows/2;
    cam.zoom = 1;

    game(`Karte geladen: ${new URL(mapUrl, location.href).toString()}`);
    running = true; lastTS = 0;
    requestAnimationFrame(loop);
  } catch(err){
    const msg = (err?.message || String(err));
    game(`Karte konnte nicht geladen werden: ${msg}`);
    debugEl.textContent += `\n==== FEHLER beim Laden der Karte ====\n${msg}\n=====================================\n`;
    setDebugVisible(true);
    // Fallback-Loop weiterlaufen lassen
    running = true; lastTS = 0;
    requestAnimationFrame(loop);
  }
}

// ---------- Renderer ----------
let frameCount = 0;

function loop(ts){
  if (!running) return;
  if (!lastTS) lastTS = ts;
  const dt = ts - lastTS;
  lastTS = ts;

  fitCanvas();
  render(dt);
  writeHudMini(dt);

  frameCount++;
  requestAnimationFrame(loop);
}

function render(dt){
  // Welt-Transform: UI bleibt statisch
  ctx.setTransform(1,0,0,1,0,0);
  ctx.clearRect(0,0,canvas.width,canvas.height);

  const tsz = tileSize();
  const z = cam.zoom * DPR;
  ctx.translate(canvas.width/2, canvas.height/2);
  ctx.scale(z, z);
  ctx.translate(-cam.x * tsz, -cam.y * tsz);

  if (world && world.map && world.tileset && world.tilesetImage) {
    renderMap(world, tsz);
  } else {
    renderGridFallback(tsz);
  }
}

function renderGridFallback(tsz){
  const cols = 64, rows = 64;
  for (let y=0; y<rows; y++){
    for (let x=0; x<cols; x++){
      ctx.fillStyle = ((x+y)&1) ? '#16324a' : '#0f2538';
      ctx.fillRect(x*tsz, y*tsz, tsz, tsz);
      ctx.strokeStyle = '#102a42';
      ctx.strokeRect(x*tsz+0.5, y*tsz+0.5, tsz-1, tsz-1);
    }
  }
}

function renderMap(w, tsz){
  const map   = w.map;
  const atlas = w.tileset;
  const img   = w.tilesetImage;
  const frames = atlas.frames || {};
  const layers = (map.layers && Array.isArray(map.layers)) ? map.layers : [];

  // einfache Annahme: erste(n) Layer besitzen grid (2D oder 1D)
  for (const layer of layers) {
    const g = layer.grid;
    if (!g) continue;

    // grid kann als 2D-Array oder als 1D mit rows/cols kommen
    const rows = Array.isArray(g[0]) ? g.length : (map.rows || layer.rows || 0);
    const cols = Array.isArray(g[0]) ? g[0].length : (map.cols || layer.cols || 0);

    for (let y=0; y<rows; y++){
      for (let x=0; x<cols; x++){
        const key = Array.isArray(g[0]) ? (g[y][x] || '') : (g[y*cols + x] || '');
        const fr = frames[key];
        if (!fr) {
          // unbekannt → leichter Checker
          ctx.fillStyle = ((x+y)&1) ? '#1f3b58' : '#0f2538';
          ctx.fillRect(x*tsz, y*tsz, tsz, tsz);
          continue;
        }
        const {x:fx=0,y:fy=0,w:fw=tsz,h:fh=tsz} = fr;
        ctx.drawImage(img, fx, fy, fw, fh, x*tsz, y*tsz, tsz, tsz);
      }
    }
  }
}

// ---------- Boot ----------
addEventListener('load', ()=>{
  boot('asset.js: OK');
  boot('map-runtime.js: OK');
  boot('boot.js: OK');
  setDebugVisible(true);
  fitCanvas();

  // Auto-Start NICHT erzwingen – auf Klick warten.
  // Wer per URL laden will: ?map=assets/maps/map-pro.json
  const p = getParams();
  initMapSelector(p.map);
});
