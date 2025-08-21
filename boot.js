// boot.js  — Siedler‑Mini  • Kamera/Zoom feinjustiert • Debug bleibt
// ------------------------------------------------------------------

// Canvas & Context
const canvas = document.getElementById('gameCanvas') || (()=> {
  const c = document.createElement('canvas');
  c.id = 'gameCanvas';
  document.body.appendChild(c);
  return c;
})();
const ctx = canvas.getContext('2d', { alpha: false });

// UI
const btnStart   = document.getElementById('btnStart');
const btnReload  = document.getElementById('btnReload');
const btnDebug   = document.getElementById('btnDebug');
const selMap     = document.getElementById('selMap');

// Debug Overlay
let showOverlay = true;
document.addEventListener('keydown', (e)=>{ if(e.key==='F2'){ showOverlay=!showOverlay; }});

// Kamera/Map
const cam   = { x:0, y:0, zoom:1 };
const zoomMin = 0.5, zoomMax = 6;

// Steuerungs‑Tuning
const INPUT = {
  wheelStepExp: 0.0015,
  panSpeed:     0.60,
  pinchExpo:    0.65
};

// Runtime‑State
let running = false;
let assetsLoaded = false;
let mapJSON = null;

// Utilities
function clamp(v,a,b){ return Math.max(a, Math.min(b, v)); }
function tileSize(){ return 64; }
function resize(){
  canvas.width  = Math.floor(window.innerWidth  * devicePixelRatio);
  canvas.height = Math.floor(window.innerHeight * devicePixelRatio);
  ctx.setTransform(1,0,0,1,0,0);
  ctx.scale(devicePixelRatio, devicePixelRatio);
}
window.addEventListener('resize', resize);
resize();

function toWorld(cx, cy){
  const rect = canvas.getBoundingClientRect();
  const x = (cx - rect.left);
  const y = (cy - rect.top);
  return {
    x: (x / cam.zoom) + cam.x,
    y: (y / cam.zoom) + cam.y
  };
}
function distance(a,b){ const dx=a.clientX-b.clientX, dy=a.clientY-b.clientY; return Math.hypot(dx,dy); }

// Map‑/Asset‑Loader Hooks (bleiben kompatibel zu deiner Struktur)
async function loadAll(){
  // tileset.json/tileset.png werden von game.js → assets.js gezogen
  // map wird via map-runtime.js (Query oder Auswahl) geliefert
  assetsLoaded = true;
}

// Rendering (Dummy‑Grid wenn keine Karte)
function render(dt){
  ctx.fillStyle = '#0f1b28';
  ctx.fillRect(0,0,canvas.width/devicePixelRatio, canvas.height/devicePixelRatio);

  ctx.save();
  ctx.translate(-cam.x*cam.zoom, -cam.y*cam.zoom);
  ctx.scale(cam.zoom, cam.zoom);

  // Hier ruft dein game.js normalerweise die Map‑/Tile‑Renderer auf.
  // Fallback‑Grid:
  const s = 64;
  ctx.strokeStyle = 'rgba(255,255,255,0.05)';
  for (let x = -2000; x <= 2000; x += s){
    ctx.beginPath(); ctx.moveTo(x,-2000); ctx.lineTo(x,2000); ctx.stroke();
  }
  for (let y = -2000; y <= 2000; y += s){
    ctx.beginPath(); ctx.moveTo(-2000,y); ctx.lineTo(2000,y); ctx.stroke();
  }

  ctx.restore();

  if (showOverlay) drawOverlay(dt);
}

function drawOverlay(dt){
  const pad = 10, line = 18;
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(12,12, 260, 104);
  ctx.fillStyle = '#d9f5ff';
  ctx.font = '12px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
  let y = 30;
  ctx.fillText(`Cam: x=${cam.x.toFixed(1)}  y=${cam.y.toFixed(1)}  zoom=${cam.zoom.toFixed(2)}`, 18, y); y+=line;
  const dpr = Number.isFinite(devicePixelRatio)? devicePixelRatio.toFixed(2):'-';
  ctx.fillText(`DPR=${dpr}    Size=${Math.round(canvas.width/devicePixelRatio)}x${Math.round(canvas.height/devicePixelRatio)}`, 18, y); y+=line;
  ctx.fillText(`Map: ${running?'aktiv':'—'}   /   Assets: ${assetsLoaded?'aktiv':'—'}`, 18, y);
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

// Controls — Panning
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
  const base  = tileSize()/64;
  const speed = INPUT.panSpeed;
  cam.x = panStart.cx - (dx * speed) / (cam.zoom * base);
  cam.y = panStart.cy - (dy * speed) / (cam.zoom * base);
});
canvas.addEventListener('pointerup',   ()=>{ isPanning=false; });
canvas.addEventListener('pointercancel',()=>{ isPanning=false; });

// Mouse‑Wheel Zoom (sanft, zum Cursor)
canvas.addEventListener('wheel', (ev)=>{
  ev.preventDefault();
  const factor = Math.exp(ev.deltaY * INPUT.wheelStepExp);
  const before = toWorld(ev.clientX, ev.clientY);
  cam.zoom = clamp(cam.zoom / factor, zoomMin, zoomMax);
  const after  = toWorld(ev.clientX, ev.clientY);
  cam.x += (before.x - after.x);
  cam.y += (before.y - after.y);
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
  pinchCenter0= { x:(e.touches[0].clientX + e.touches[1].clientX)/2,
                  y:(e.touches[0].clientY + e.touches[1].clientY)/2 };
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
}
function pinchEnd(e){ pinchDist0 = 0; pinchCenter0 = null; }

// Buttons
btnDebug?.addEventListener('click', ()=>{ showOverlay = !showOverlay; });
btnReload?.addEventListener('click', ()=>{ location.reload(); });
btnStart ?.addEventListener('click', async ()=>{
  running = true;
  if (!assetsLoaded) await loadAll();
});

// Optionale Karten‑Auswahl (wenn vorhanden)
selMap?.addEventListener('change', ()=>{
  const v = selMap.value;
  // hier könnte map-runtime.js angestoßen werden; wir lassen es „no‑op“,
  // da dein Loader bereits via Query/Default lädt.
});

// Initial info
console.log('[boot] preGameInit OK');
