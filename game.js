// game.js  •  v11
// ES‑Modul: Characters laden + Canvas‑Stage + Kamera + Map‑Loader + UI‑Wireup

import { Characters } from './js/characters.js';

// ---------- Stage/Context ----------
const canvas = document.getElementById('stage');
const ctx     = canvas.getContext('2d', { alpha:false });

// DPR anpassen
function fitCanvas() {
  const dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
  const w = Math.floor(canvas.clientWidth  * dpr);
  const h = Math.floor(canvas.clientHeight * dpr);
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w; canvas.height = h;
  }
}
fitCanvas();
addEventListener('resize', fitCanvas);

// ---------- Welt/Kamera ----------
const camera = {
  x: 0, y: 0, zoom: 1,
  min: 0.5, max: 3.5,
  setZoom(z)   { this.zoom = Math.max(this.min, Math.min(this.max, z)); },
  setPosition(x,y){ this.x = x; this.y = y; },
};

// ---------- Map‑State ----------
let currentMapUrl = null;
let mapData = null;      // { rows, cols, tile, layers: [...] } – minimal erwartet
let tileSize = 64;

// ---------- Debug‑HUD ----------
const hud = document.getElementById('hud');
let debugOn = false;
function updateHUD() {
  if (!debugOn) { hud.classList.remove('on'); return; }
  hud.classList.add('on');
  const dpr = Math.round((window.devicePixelRatio || 1)*100)/100;
  const rows = mapData?.rows ?? "-";
  const cols = mapData?.cols ?? "-";
  const tile = mapData?.tile ?? tileSize;
  hud.textContent =
`Cam:  x=${camera.x.toFixed(1)}  y=${camera.y.toFixed(1)}  zoom=${camera.zoom.toFixed(2)}
Map:  ${currentMapUrl || "—"}
rows=${rows}  cols=${cols}  tile=${tile}
DPR=${dpr}  Size=${canvas.width}x${canvas.height}`;
}

// ---------- Input: Pan/Zoom nur auf Canvas ----------
let panDrag = null;

canvas.addEventListener('pointerdown', (e) => {
  canvas.setPointerCapture(e.pointerId);
  panDrag = { id:e.pointerId, sx:e.clientX, sy:e.clientY, ox:camera.x, oy:camera.y };
});

canvas.addEventListener('pointermove', (e) => {
  if (!panDrag || panDrag.id !== e.pointerId) return;
  const dx = (e.clientX - panDrag.sx) / camera.zoom;
  const dy = (e.clientY - panDrag.sy) / camera.zoom;
  camera.setPosition(panDrag.ox - dx, panDrag.oy - dy);
});

addEventListener('pointerup', (e) => { if (panDrag && panDrag.id === e.pointerId) panDrag = null; });

canvas.addEventListener('wheel', (e) => {
  // Zoom zum Cursor – innerhalb des Canvas, UI unaffected
  e.preventDefault();
  const prev = camera.zoom;
  const factor = (e.deltaY < 0) ? 1.1 : 0.9;
  camera.setZoom(prev * factor);

  // Zoom zur Maus fokussieren
  const rect = canvas.getBoundingClientRect();
  const mx = (e.clientX - rect.left);
  const my = (e.clientY - rect.top);
  const k = (1/prev - 1/camera.zoom);
  camera.x += k * mx;
  camera.y += k * my;
}, { passive:false });

// ---------- Simple Renderer (Grid + Demo‑Unit) ----------
function worldToScreen(px, py) { return { x: (px - camera.x) * camera.zoom, y: (py - camera.y) * camera.zoom }; }

function drawGrid() {
  const step = tileSize * camera.zoom;
  if (step < 16) return;
  const cols = Math.ceil(canvas.width / step) + 2;
  const rows = Math.ceil(canvas.height/ step) + 2;
  const ox = -((camera.x*camera.zoom) % step);
  const oy = -((camera.y*camera.zoom) % step);

  ctx.strokeStyle = 'rgba(255,255,255,0.06)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i=0;i<cols;i++){ const x = ox + i*step; ctx.moveTo(x,0); ctx.lineTo(x,canvas.height); }
  for (let j=0;j<rows;j++){ const y = oy + j*step; ctx.moveTo(0,y); ctx.lineTo(canvas.width,y); }
  ctx.stroke();
}

function render() {
  ctx.fillStyle = '#0b1a26';
  ctx.fillRect(0,0,canvas.width,canvas.height);

  drawGrid();

  // Demo‑Charakter (nur um zu sehen, dass Atlanten/Fallbacks funktionieren)
  if (mapData) {
    const center = { x: (mapData.cols*tileSize)/2, y: (mapData.rows*tileSize)/2 };
    const s = worldToScreen(center.x, center.y);
    const drawable = Characters.getDrawable({ role:'porter', state:'walk_empty' });
    ctx.save();
    ctx.translate(s.x, s.y);
    drawable.draw(ctx, 0, 0, tileSize * camera.zoom);
    ctx.restore();
  }

  updateHUD();
  requestAnimationFrame(render);
}

// ---------- Map‑Loader ----------
async function loadMap(url) {
  currentMapUrl = url;
  try {
    const res = await fetch(url + `?v=${window.BUILD_ID||''}`);
    if (!res.ok) throw new Error(`map ${url} ${res.status}`);
    mapData = await res.json();
    tileSize = mapData.tile || 64;

    // Kamera initial zentrieren
    const W = (mapData.cols||16)*tileSize;
    const H = (mapData.rows||16)*tileSize;
    camera.setPosition(W*0.5 - (canvas.width / 2)/camera.zoom,
                       H*0.5 - (canvas.height/2)/camera.zoom);

    console.log("[game] map loaded:", url, mapData);
  } catch (err) {
    console.warn("[game] map load failed:", err);
    mapData = null;
  }
}

// ---------- UI‑Verdrahtung ----------
const elStart   = document.getElementById('btnStart');
const elReload  = document.getElementById('btnReload');
const elDebug   = document.getElementById('btnDebug');
const elFS      = document.getElementById('btnFullscreen');
const elSelect  = document.getElementById('mapSelect');
const elAuto    = document.getElementById('autoStart');

function getSelectedMap() {
  return elSelect.value || 'assets/maps/map-demo.json';
}

elStart.addEventListener('click', async () => {
  elStart.disabled = true;
  await loadMap(getSelectedMap());
  setTimeout(()=> (elStart.disabled = false), 250);
});

elReload.addEventListener('click', async () => {
  await loadMap(getSelectedMap());
});

elDebug.addEventListener('click', () => {
  debugOn = !debugOn;
  updateHUD();
});

elFS.addEventListener('click', async () => {
  const docEl = document.documentElement;
  if (!document.fullscreenElement) {
    await docEl.requestFullscreen().catch(()=>{});
  } else {
    await document.exitFullscreen().catch(()=>{});
  }
});

// Query‑Param ?map=… auswerten
(function applyQueryParam() {
  const p = new URLSearchParams(location.search);
  const map = p.get('map');
  if (map) {
    elSelect.value = map;
    if (![...elSelect.options].some(o=>o.value===map)) {
      const opt = document.createElement('option');
      opt.value = map; opt.textContent = map.replace(/^.*\//,'');
      elSelect.appendChild(opt);
    }
  }
})();

// Auto‑Start, wenn gewünscht
if (elAuto.checked) {
  loadMap(getSelectedMap());
}

// ---------- Characters vorladen & Renderloop starten ----------
(async function init() {
  try {
    await Characters.loadAll();
  } catch (e) {
    console.warn("[characters] preload failed:", e);
  }
  render();
})();

// ---------- Öffentliche API (wie gewünscht) ----------
window.startGame  = async (mapUrl) => loadMap(mapUrl || getSelectedMap());
window.reloadGame = async (mapUrl) => loadMap(mapUrl || getSelectedMap());

window.game = {
  camera,
  get map() { return mapData; },
  get tileSize() { return tileSize; },
  get ctx() { return ctx; },
};

window.GameLoader = {
  start:  (mapUrl) => window.startGame?.(mapUrl),
  reload: (mapUrl) => window.reloadGame?.(mapUrl),
};
window.GameCamera = {
  setZoom:     (z)    => camera.setZoom(z),
  setPosition: (x,y)  => camera.setPosition(x,y),
};
