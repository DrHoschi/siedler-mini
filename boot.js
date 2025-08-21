// boot.js — Siedler‑Mini  • sanfter Zoom/Pan • Welt-Bounds + AutoFit • Debug bleibt

// Canvas
const canvas = document.getElementById('gameCanvas') || (() => {
  const c = document.createElement('canvas');
  c.id = 'gameCanvas';
  document.body.appendChild(c);
  return c;
})();
const ctx = canvas.getContext('2d', { alpha: false });

// UI
const btnStart  = document.getElementById('btnStart');
const btnReload = document.getElementById('btnReload');
const btnDebug  = document.getElementById('btnDebug');
const selMap    = document.getElementById('selMap');

// Debug Overlay
let showOverlay = true;
document.addEventListener('keydown', (e)=>{ if (e.key === 'F2') showOverlay = !showOverlay; });

// Kamera
const cam = { x: 0, y: 0, zoom: 1 };

// Welt (Pixel) – Default, bis echte Mapgröße bekannt ist.
// Später kann dein Loader window.__setMapSize(...) aufrufen (siehe unten).
const WORLD = {
  w: 1024,         // Default Breite
  h: 1024,         // Default Höhe
  pad: 64          // weicher Rand (in px Welt-Koordinaten)
};

// Zoom-Grenzen (min berechnen wir dynamisch aus WORLD & Viewport)
let zoomMin = 0.25;
let zoomMax = 8;

// Steuerungs‑Tuning (langsamer/sanfter als zuvor)
const INPUT = {
  wheelStepExp: 0.0007, // kleiner = ruhigeres Scrollrad‑Zoom
  panSpeed:     0.38,   // kleiner = langsameres Panning
  pinchExpo:    0.50    // kleiner = sanfteres Pinch‑Zoom
};

// Laufzeit
let running = false;
let assetsLoaded = false;

// Utils
function clamp(v,min,max){ return Math.max(min, Math.min(max, v)); }
function tileSize(){ return 64; }
function cssSize(){ return { w: canvas.width / devicePixelRatio, h: canvas.height / devicePixelRatio }; }
function toWorld(cx, cy){
  const rect = canvas.getBoundingClientRect();
  const x = (cx - rect.left), y = (cy - rect.top);
  return { x: (x / cam.zoom) + cam.x, y: (y / cam.zoom) + cam.y };
}
function distance(a,b){ const dx=a.clientX-b.clientX, dy=a.clientY-b.clientY; return Math.hypot(dx,dy); }

// Viewport + minZoom neu berechnen
function recomputeZoomMin(){
  const { w:vw, h:vh } = cssSize();
  // minZoom so, dass Welt vollständig (mit Pad) reinpasst
  const minX = vw / (WORLD.w + WORLD.pad*2);
  const minY = vh / (WORLD.h + WORLD.pad*2);
  zoomMin = Math.min(minX, minY);
  zoomMin = Math.max(0.05, Math.min(zoomMin, 1)); // guard rails
  cam.zoom = clamp(cam.zoom, zoomMin, zoomMax);
}
function clampCamToWorld(){
  const { w:vw, h:vh } = cssSize();
  const viewW = vw / cam.zoom;
  const viewH = vh / cam.zoom;
  const minX = -WORLD.pad;
  const minY = -WORLD.pad;
  const maxX = (WORLD.w + WORLD.pad) - viewW;
  const maxY = (WORLD.h + WORLD.pad) - viewH;
  cam.x = clamp(cam.x, minX, Math.max(minX, maxX));
  cam.y = clamp(cam.y, minY, Math.max(minY, maxY));
}
function autoFitToWorld(){
  recomputeZoomMin();
  cam.zoom = zoomMin;            // komplett sichtbar
  cam.x = -WORLD.pad;            // links anlegen (optional mittig setzen)
  cam.y = -WORLD.pad;            // oben anlegen
  clampCamToWorld();
}

// Resize
function resize(){
  canvas.width  = Math.floor(window.innerWidth  * devicePixelRatio);
  canvas.height = Math.floor(window.innerHeight * devicePixelRatio);
  ctx.setTransform(1,0,0,1,0,0);
  ctx.scale(devicePixelRatio, devicePixelRatio);
  recomputeZoomMin();
  clampCamToWorld();
}
window.addEventListener('resize', resize);
resize();

// Exponiere Hook: Loader/Game kann echte Größe setzen (Tiles * TilePx)
window.__setMapSize = function(widthPx, heightPx, padPx = WORLD.pad){
  if (Number.isFinite(widthPx) && Number.isFinite(heightPx) && widthPx > 0 && heightPx > 0){
    WORLD.w = Math.round(widthPx);
    WORLD.h = Math.round(heightPx);
  }
  if (Number.isFinite(padPx)) WORLD.pad = Math.max(0, Math.round(padPx));
  autoFitToWorld();
};

// Dummy‑Loader (deine echten Assets lädt assets.js/game.js)
async function loadAll(){ assetsLoaded = true; }

// Render: zeigt Grid, falls Map‑Renderer nicht aufruft
function render(dt){
  const { w:vw, h:vh } = cssSize();
  ctx.fillStyle = '#0f1b28';
  ctx.fillRect(0,0,vw,vh);

  ctx.save();
  ctx.translate(-cam.x*cam.zoom, -cam.y*cam.zoom);
  ctx.scale(cam.zoom, cam.zoom);

  // Fallback‑Grid (damit man Zoom & Pan beurteilen kann)
  ctx.strokeStyle = 'rgba(255,255,255,0.05)';
  const step = 64;
  for (let x = -WORLD.pad; x <= WORLD.w + WORLD.pad; x += step){
    ctx.beginPath(); ctx.moveTo(x, -WORLD.pad); ctx.lineTo(x, WORLD.h + WORLD.pad); ctx.stroke();
  }
  for (let y = -WORLD.pad; y <= WORLD.h + WORLD.pad; y += step){
    ctx.beginPath(); ctx.moveTo(-WORLD.pad, y); ctx.lineTo(WORLD.w + WORLD.pad, y); ctx.stroke();
  }

  // Rand als Rahmen markieren
  ctx.strokeStyle = 'rgba(255,255,255,0.15)';
  ctx.strokeRect(0,0,WORLD.w, WORLD.h);

  ctx.restore();

  if (showOverlay) drawOverlay(dt);
}

function drawOverlay(dt){
  const { w:vw, h:vh } = cssSize();
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(12,12, 310, 122);
  ctx.fillStyle = '#d9f5ff';
  ctx.font = '12px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
  let y = 30;
  ctx.fillText(`Cam: x=${cam.x.toFixed(1)}  y=${cam.y.toFixed(1)}  zoom=${cam.zoom.toFixed(3)}`, 18, y); y+=18;
  ctx.fillText(`World: ${WORLD.w}x${WORLD.h}  pad=${WORLD.pad}`, 18, y); y+=18;
  ctx.fillText(`ZoomMin=${zoomMin.toFixed(3)}  ZoomMax=${zoomMax.toFixed(2)}`, 18, y); y+=18;
  const dpr = Number.isFinite(devicePixelRatio)? devicePixelRatio.toFixed(2):'-';
  ctx.fillText(`View: ${Math.round(vw)}x${Math.round(vh)}  DPR=${dpr}`, 18, y);
  ctx.restore();
}

// Loop
let last = performance.now();
function loop(t){
  const dt = Math.min(50, t-last); last = t;
  if (running) render(dt);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

// --- Input -----------------------------------------------------------

// Panning
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
  const base  = tileSize()/64;        // skaliert leicht mit deiner Tile‑Größe
  const speed = INPUT.panSpeed;
  cam.x = panStart.cx - (dx * speed) / (cam.zoom * base);
  cam.y = panStart.cy - (dy * speed) / (cam.zoom * base);
  clampCamToWorld();
});
canvas.addEventListener('pointerup',   ()=>{ isPanning=false; });
canvas.addEventListener('pointercancel',()=>{ isPanning=false; });

// Mouse‑Wheel Zoom (sanft, zum Cursor)
canvas.addEventListener('wheel', (ev)=>{
  ev.preventDefault();
  const factor = Math.exp(ev.deltaY * INPUT.wheelStepExp); // ~1.07 pro Raster
  const before = toWorld(ev.clientX, ev.clientY);
  cam.zoom = clamp(cam.zoom / factor, zoomMin, zoomMax);
  const after  = toWorld(ev.clientX, ev.clientY);
  cam.x += (before.x - after.x);
  cam.y += (before.y - after.y);
  clampCamToWorld();
}, { passive:false });

// Touch Pinch
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
  clampCamToWorld();
}
function pinchEnd(e){ pinchDist0 = 0; pinchCenter0 = null; }

// --- Buttons / Start -------------------------------------------------
btnDebug?.addEventListener('click', ()=>{ showOverlay = !showOverlay; });
btnReload?.addEventListener('click', ()=>{ location.reload(); });
btnStart ?.addEventListener('click', async ()=>{
  if (!assetsLoaded) await loadAll();
  running = true;
  autoFitToWorld();   // bei Start einmal auf komplette Karte einpassen
});

// Optionales Karten‑Select (keine Logik nötig – dein Loader macht das)
selMap?.addEventListener('change', ()=>{/* noop */});

// Initial
console.log('[boot] preGameInit OK');
