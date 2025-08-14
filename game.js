// V14.7 game.js – Render-Loop, Raster, Tools & Eingaben

let cvs, ctx, DPR = 1;
let w = 0, h = 0;

const camera = { x: 0, y: 0, z: 1 };
const grid = { size: 64 };

const buildings = [];
const roads = [];

let tool = 'pointer';
let isDragging = false;
let dragStart = {x:0,y:0, cx:0, cy:0};
let roadStart = null;

let onHUD = () => {};

export function startGame(opts) {
  cvs = opts.canvas;
  DPR = Math.max(1, opts.DPR || 1);
  onHUD = typeof opts.onHUD === 'function' ? opts.onHUD : ()=>{};

  ctx = cvs.getContext('2d', { alpha: false, desynchronized: true });
  if (!ctx) throw new Error('2D-Context nicht verfügbar');

  resize();
  installInput();
  placeInitialHQ();
  loop();

  return { setTool, center, resize };
}

export function exportState() {
  return {camera: {...camera}, buildings: buildings.slice(), roads: roads.slice()};
}

function resize() {
  const rect = cvs.getBoundingClientRect();
  w = Math.max(1, rect.width);
  h = Math.max(1, rect.height);
  cvs.width  = Math.round(w * DPR);
  cvs.height = Math.round(h * DPR);
  ctx.setTransform(DPR,0,0,DPR,0,0);
  onHUD('zoom', camera.z);
}
function setTool(t) { tool = t; onHUD('tool', t); }
function center() { camera.x = 0; camera.y = 0; camera.z = clamp(camera.z,0.5,2.5); }

function placeInitialHQ() {
  const {gx, gy} = worldToGrid(0,0);
  buildings.push({ type:'hq', x: gx, y: gy });
}

function loop() { requestAnimationFrame(loop); draw(); }

function draw() {
  ctx.fillStyle = '#0b1628';
  ctx.fillRect(0,0,w,h);

  ctx.save();
  ctx.translate(Math.floor(w/2), Math.floor(h/2));
  ctx.scale(camera.z, camera.z);
  ctx.translate(-camera.x, -camera.y);

  drawGrid();
  drawRoads();
  drawBuildings();

  ctx.restore();
}

function drawGrid() {
  const s = grid.size;
  const left   = camera.x - w/(2*camera.z) - s;
  const right  = camera.x + w/(2*camera.z) + s;
  const top    = camera.y - h/(2*camera.z) - s;
  const bottom = camera.y + h/(2*camera.z) + s;

  const x0 = Math.floor(left / s) * s;
  const y0 = Math.floor(top  / s) * s;

  ctx.strokeStyle = '#1c2a3f';
  ctx.lineWidth = 1 / camera.z;
  ctx.beginPath();
  for (let x = x0; x <= right; x += s) { ctx.moveTo(x, top); ctx.lineTo(x, bottom); }
  for (let y = y0; y <= bottom; y += s) { ctx.moveTo(left, y); ctx.lineTo(right, y); }
  ctx.stroke();
}

function drawBuildings() {
  for (const b of buildings) {
    const {sx, sy} = gridToWorld(b.x, b.y);
    const half = grid.size * 0.75;
    ctx.fillStyle = (b.type==='hq') ? '#29a35c' :
                    (b.type==='depot') ? '#c43c74' : '#3b82f6';
    ctx.fillRect(sx - half/2, sy - half/2, half, half);

    ctx.fillStyle = '#dbeafe';
    ctx.font = `${14/camera.z}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(b.type==='hq'?'HQ':(b.type==='woodcutter'?'Holzfäller':'Depot'),
                 sx, sy - (half/2) - (8/camera.z));
  }
}

function drawRoads() {
  if (!roads.length) return;
  ctx.strokeStyle = '#64d597';
  ctx.lineWidth = 4 / camera.z;
  for (const r of roads) {
    const A = gridToWorld(r.ax, r.ay);
    const B = gridToWorld(r.bx, r.by);
    ctx.beginPath();
    ctx.moveTo(A.sx, A.sy);
    ctx.lineTo(B.sx, B.sy);
    ctx.stroke();
  }
}

function installInput() {
  cvs.addEventListener('pointerdown', onPointerDown);
  cvs.addEventListener('pointermove', onPointerMove);
  cvs.addEventListener('pointerup', onPointerUp);
  cvs.addEventListener('pointercancel', onPointerUp);

  cvs.addEventListener('wheel', onWheel, {passive:false});
  cvs.addEventListener('gesturestart', e => e.preventDefault());
  cvs.addEventListener('gesturechange', e => e.preventDefault());
  cvs.addEventListener('gestureend', e => e.preventDefault());
}

function onPointerDown(e) {
  cvs.setPointerCapture(e.pointerId);
  const world = screenToWorld(e.clientX, e.clientY);
  dragStart = { x: e.clientX, y: e.clientY, cx: camera.x, cy: camera.y, world };
  isDragging = true;
}

function onPointerMove(e) {
  if (!isDragging) return;
  if (tool === 'pointer') {
    const dx = (e.clientX - dragStart.x) / camera.z;
    const dy = (e.clientY - dragStart.y) / camera.z;
    camera.x = dragStart.cx - dx;
    camera.y = dragStart.cy - dy;
  }
}

function onPointerUp(e) {
  if (!isDragging) return;
  isDragging = false;

  const moved = Math.hypot(e.clientX - dragStart.x, e.clientY - dragStart.y) > 6;
  if (moved && tool === 'pointer') return;

  const g = worldToGrid(screenToWorld(e.clientX, e.clientY).x,
                        screenToWorld(e.clientY, e.clientY).y); // <-- bleibt unverändert vom 14.7-Fix

  // Korrektur: richtige worldToGrid-Nutzung
  const world = screenToWorld(e.clientX, e.clientY);
  const gg = worldToGrid(world.x, world.y);

  if (tool === 'hq' || tool === 'woodcutter' || tool === 'depot') {
    placeBuilding(tool, gg.gx, gg.gy);
  } else if (tool === 'road') {
    placeRoad(gg.gx, gg.gy);
  } else if (tool === 'erase') {
    eraseAt(gg.gx, gg.gy);
  }
}

function onWheel(e) {
  e.preventDefault();
  const delta = Math.sign(e.deltaY) * 0.1;
  camera.z = clamp(camera.z * (1 - delta), 0.5, 2.5);

  const before = screenToWorld(e.clientX, e.clientY);
  const after  = screenToWorld(e.clientX, e.clientY);
  camera.x += before.x - after.x;
  camera.y += before.y - after.y;

  onHUD('zoom', camera.z);
}

function placeBuilding(type, gx, gy) {
  if (findBuilding(gx,gy)) return;
  buildings.push({ type, x: gx, y: gy });
}
function placeRoad(gx, gy) {
  if (!roadStart) { roadStart = {gx, gy}; return; }
  const a = {...roadStart}, b = {gx, gy};
  if (a.gx === b.gx && a.gy === b.gy) { roadStart = null; return; }
  const mid = { gx: b.gx, gy: a.gy };
  pushSegment(a.gx, a.gy, mid.gx, mid.gy);
  pushSegment(mid.gx, mid.gy, b.gx, b.gy);
  roadStart = null;
}
function pushSegment(ax, ay, bx, by) {
  if (ax===bx && ay===by) return;
  roads.push({ ax, ay, bx, by });
}
function eraseAt(gx, gy) {
  const bi = buildings.findIndex(b => b.x===gx && b.y===gy);
  if (bi>=0) { buildings.splice(bi,1); return; }
  const {sx, sy} = gridToWorld(gx, gy);
  const idx = roads.findIndex(r => distPointToSegment(
    sx,sy, gridToWorld(r.ax,r.ay), gridToWorld(r.bx,r.by)) < 18);
  if (idx>=0) roads.splice(idx,1);
}
function findBuilding(gx, gy) { return buildings.find(b => b.x===gx && b.y===gy); }

function clamp(v,min,max){ return Math.max(min, Math.min(max, v)); }
function screenToWorld(px, py) {
  const rect = cvs.getBoundingClientRect();
  const x = (px - rect.left - w/2) / camera.z + camera.x;
  const y = (py - rect.top  - h/2) / camera.z + camera.y;
  return {x,y};
}
function worldToGrid(x,y) { const s = grid.size; return { gx: Math.round(x/s), gy: Math.round(y/s) }; }
function gridToWorld(gx,gy) { const s = grid.size; return { sx: gx*s, sy: gy*s }; }
function distPointToSegment(px,py, A, B) {
  const vx = B.sx - A.sx, vy = B.sy - A.sy;
  const wx = px - A.sx,  wy = py - A.sy;
  const c1 = vx*wx + vy*wy;
  if (c1<=0) return Math.hypot(px - A.sx, py - A.sy);
  const c2 = vx*vx + vy*vy;
  if (c2<=c1) return Math.hypot(px - B.sx, py - B.sy);
  const t = c1 / c2;
  const projx = A.sx + t*vx, projy = A.sy + t*vy;
  return Math.hypot(px - projx, py - projy);
}
