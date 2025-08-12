// main.js
import { IM, loadAllAssets } from './core/assets.js';
import { createWorld, T } from './core/world.js';
import {
  makeCanvas, resizeCanvas, Camera,
  drawMap, screenToWorld, worldToCell, cellToWorld,
  clientToCanvasXY, worldToScreen, TILE
} from './core/render.js';

// --- UI ---
const btnRoad    = document.getElementById('tool-road');
const btnHQ      = document.getElementById('tool-hq');
const btnLumber  = document.getElementById('tool-lumber');
const btnDepot   = document.getElementById('tool-depot');
const btnPointer = document.getElementById('tool-pointer');
const statWood   = document.getElementById('stat-wood');
const statStone  = document.getElementById('stat-stone');
const statFood   = document.getElementById('stat-food');
const statGold   = document.getElementById('stat-gold');
const statCar    = document.getElementById('stat-carriers');

const { canvas, ctx } = makeCanvas();
const cam = new Camera(0, 0);
let dpr = resizeCanvas(cam, canvas);
window.addEventListener('resize', () => { dpr = resizeCanvas(cam, canvas); });

let world = null;
let running = false;
let tool = 'pointer';

function setTool(t) {
  tool = t;
  document.querySelectorAll('[data-tool]').forEach(b => b.classList.toggle('active', b.dataset.tool === t));
}
btnPointer.onclick = () => setTool('pointer');
btnRoad.onclick    = () => setTool('road');
btnHQ.onclick      = () => setTool('hq');
btnLumber.onclick  = () => setTool('lumber');
btnDepot.onclick   = () => setTool('depot');

function updateHUD() {
  statWood.textContent  = Math.floor(world.res.wood);
  statStone.textContent = Math.floor(world.res.stone);
  statFood.textContent  = Math.floor(world.res.food);
  statGold.textContent  = Math.floor(world.res.gold);
  statCar.textContent   = world.carriers.length;
}

// --- Welt aufbauen ---
async function boot() {
  await loadAllAssets();
  world = createWorld(128, 128); // feste Größe

  // HQ (Stein) in die Mitte
  const cx = Math.floor(world.W / 2), cy = Math.floor(world.H / 2);
  world.placeHQ(cx, cy, 'stone');

  // Kamera auf HQ zentrieren
  const { wx, wy } = cellToWorld(cx, cy);
  cam.x = wx; cam.y = wy; cam.z = 1.25;

  updateHUD();
  running = true;
  requestAnimationFrame(loop);
}
boot();

// --- Pointer / Touch Eingabe ---
let isPanning = false;
let lastTouchDist = 0;
let panStart = { x: 0, y: 0, cx: 0, cy: 0, camx: 0, camy: 0 };

canvas.addEventListener('pointerdown', (ev) => {
  canvas.setPointerCapture(ev.pointerId);
});

canvas.addEventListener('pointerup', (ev) => {
  // kurzer Tap ⇒ bauen (nur wenn Tool != pointer)
  if (tool !== 'pointer' && !isPanning) {
    buildAtEvent(ev);
  }
  isPanning = false;
});

canvas.addEventListener('pointermove', (ev) => {
  // auf Desktop ignorieren – wir fokussieren Mobile
});

canvas.addEventListener('touchstart', (ev) => {
  if (ev.touches.length === 1) {
    isPanning = true;
    const { cx, cy } = clientToCanvasXY(canvas, ev);
    panStart.cx = cx; panStart.cy = cy; panStart.camx = cam.x; panStart.camy = cam.y;
  } else if (ev.touches.length === 2) {
    isPanning = true;
    lastTouchDist = touchDist(ev);
    const mid = touchMid(ev);
    panStart.cx = mid.cx; panStart.cy = mid.cy; panStart.camx = cam.x; panStart.camy = cam.y;
  }
}, { passive: false });

canvas.addEventListener('touchmove', (ev) => {
  if (!isPanning) return;
  ev.preventDefault();

  if (ev.touches.length === 1) {
    // Pan
    const { cx, cy } = clientToCanvasXY(canvas, ev);
    const dx = (cx - panStart.cx) / cam.z;
    const dy = (cy - panStart.cy) / cam.z;
    cam.x = panStart.camx - dx;
    cam.y = panStart.camy - dy;
  } else if (ev.touches.length === 2) {
    // Pinch‑Zoom um Midpoint
    const midNow = touchMid(ev);
    const dist = touchDist(ev);
    const scale = Math.max(0.6, Math.min(2.5, cam.z * (dist / Math.max(1, lastTouchDist))));
    zoomAt(midNow.cx, midNow.cy, scale);
    lastTouchDist = dist;

    // gleichzeitiges Panning: Midpoint‑Verschiebung
    const dx = (midNow.cx - panStart.cx) / cam.z;
    const dy = (midNow.cy - panStart.cy) / cam.z;
    cam.x = panStart.camx - dx;
    cam.y = panStart.camy - dy;
  }
}, { passive: false });

canvas.addEventListener('touchend', () => { isPanning = false; }, { passive: true });

// Hilfen Touch
function touchDist(ev) {
  const a = ev.touches[0], b = ev.touches[1];
  const dx = a.clientX - b.clientX, dy = a.clientY - b.clientY;
  return Math.hypot(dx, dy);
}
function touchMid(ev) {
  const a = ev.touches[0], b = ev.touches[1];
  const cx = (a.clientX + b.clientX) * 0.5;
  const cy = (a.clientY + b.clientY) * 0.5;
  const rect = canvas.getBoundingClientRect();
  return { cx: cx - rect.left, cy: cy - rect.top };
}

// Zoom auf Cursor/Touchpunkt
function zoomAt(cx, cy, newZ) {
  const pre = screenToWorld(cam, cx, cy);
  cam.z = newZ;
  const post = screenToWorld(cam, cx, cy);
  // Kamera so verschieben, dass der Punkt „stehen bleibt“
  cam.x += pre.wx - post.wx;
  cam.y += pre.wy - post.wy;
}

// Bauen am Event‑Ort (Fix: richtige Zelle!)
function buildAtEvent(ev) {
  const { cx, cy } = clientToCanvasXY(canvas, ev);
  const { wx, wy } = screenToWorld(cam, cx, cy);
  const { i, j } = worldToCell(wx, wy);

  if (i < 0 || j < 0 || i >= world.W || j >= world.H) return;

  if (tool === 'road') {
    world.placeRoad(i, j);
  } else if (tool === 'hq') {
    world.placeHQ(i, j, 'wood');
  } else if (tool === 'lumber') {
    world.placeLumber(i, j);
  } else if (tool === 'depot') {
    world.placeDepot(i, j);
  }
}

// --- Game‑Loop ---
let last = performance.now();
function loop(ts) {
  if (!running) return;
  const dt = Math.min(0.05, (ts - last) / 1000); last = ts;

  world.tick(dt);
  updateHUD();

  drawMap(ctx, cam, world, IM);
  drawBuildings();
  drawCarriers();

  requestAnimationFrame(loop);
}

// Gebäude und Deko
function drawBuildings() {
  for (const b of world.buildings) {
    const { wx, wy } = cellToWorld(b.i, b.j);
    const { sx, sy } = worldToScreen(cam, wx, wy);
    const img = pickBuilding(b.kind);
    if (!img) continue;
    const w = TILE * 1.8, h = TILE * 1.6;
    ctx.drawImage(img, sx - w / 2, sy - h + TILE * 0.6, w, h);
  }
}

function pickBuilding(kind) {
  switch (kind) {
    case 'hq-stone': return IM.hq_stone || IM.hq || null;
    case 'hq-wood':  return IM.hq_wood  || IM.hq || null;
    case 'lumber':   return IM.lumber   || null;
    case 'depot':    return IM.depot    || null;
    default: return null;
  }
}

// einfache Träger‑Darstellung (Animation tickt in world.tick)
function drawCarriers() {
  if (!IM.carrier) return;
  for (const c of world.carriers) {
    const { sx, sy } = worldToScreen(cam, c.x, c.y);
    const size = 28;
    ctx.drawImage(IM.carrier, sx - size / 2, sy - size + 6, size, size);
  }
}
