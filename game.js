// V14.8 game.js – Raster/Tools/Zeiger + Pinch‑Zoom + Träger + einfache Ökonomie

/* ---------- Canvas / Kamera ---------- */
let cvs, ctx, DPR = 1;
let w = 0, h = 0;

const camera = { x: 0, y: 0, z: 1 };
const grid = { size: 64 };

const buildings = [];   // {type:'hq'|'woodcutter'|'depot', x:g, y:g}
const roads = [];       // {ax,ay,bx,by} (achsparallel, Gitterkoords)

/* ---------- Ökonomie / Träger ---------- */
const resources = { Holz: 0, Stein: 0, Nahrung: 0, Gold: 0, Traeger: 0 };
const carriers = [];    // {path:[{x,y}], seg:0, t:0..1, speed, payload:'Holz'}
const woodcutterCD = new Map(); // key "x,y" -> cooldown in s
let worldTime = 0;

/* ---------- Tool/Interaktion ---------- */
let tool = 'pointer';
let isDragging = false;
let dragStart = { x:0, y:0, cx:0, cy:0 };

let onHUD = () => {};

/* ---------- Touch / Pinch‑Zoom ---------- */
const pointers = new Map(); // id -> {x,y}
let pinching = false;
let pinchStartDist = 0;
let pinchStartZoom = 1;

/* ---------- API ---------- */
export function startGame(opts) {
  cvs = opts.canvas;
  DPR = Math.max(1, opts.DPR || 1);
  onHUD = typeof opts.onHUD === 'function' ? opts.onHUD : ()=>{};

  ctx = cvs.getContext('2d', { alpha: false, desynchronized: true });
  if (!ctx) throw new Error('2D-Context nicht verfügbar');

  resize();
  installInput();
  placeInitialHQ();

  // HUD initial
  onHUD('Tool', 'Zeiger');
  onHUD('Zoom', camera.z.toFixed(2)+'x');
  for (const k of Object.keys(resources)) onHUD(k, resources[k]);

  loop();
  return { setTool, center, resize };
}

export function exportState() {
  return {
    camera: { ...camera },
    buildings: buildings.slice(),
    roads: roads.slice(),
    resources: { ...resources }
  };
}

/* ---------- Setup ---------- */
function resize() {
  const rect = cvs.getBoundingClientRect();
  w = Math.max(1, rect.width);
  h = Math.max(1, rect.height);
  cvs.width  = Math.round(w * DPR);
  cvs.height = Math.round(h * DPR);
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  onHUD('Zoom', camera.z.toFixed(2)+'x');
}

function setTool(t) { tool = t; onHUD('Tool', labelTool(t)); }

function center() {
  camera.x = 0;
  camera.y = 0;
  camera.z = clamp(camera.z, 0.5, 2.5);
  onHUD('Zoom', camera.z.toFixed(2)+'x');
}

function placeInitialHQ() {
  const { gx, gy } = worldToGrid(0, 0);
  buildings.push({ type: 'hq', x: gx, y: gy });
}

/* ---------- Main Loop ---------- */
let lastTs = 0;
function loop(ts=0) {
  requestAnimationFrame(loop);
  const dt = Math.min(0.05, (ts - lastTs) / 1000 || 0);
  lastTs = ts;
  worldTime += dt;

  simulate(dt);
  draw();
}

/* ---------- Simulation ---------- */
function simulate(dt) {
  // Holzfäller → Träger erzeugen, wenn Weg zu Depot existiert
  for (const b of buildings) {
    if (b.type !== 'woodcutter') continue;
    const key = `${b.x},${b.y}`;
    const cd = (woodcutterCD.get(key) ?? 0) - dt;
    if (cd > 0) { woodcutterCD.set(key, cd); continue; }

    const depot = findNearestOfType('depot', b.x, b.y);
    if (!depot) { woodcutterCD.set(key, 1.0); continue; }

    const path = findPath({x:b.x,y:b.y}, {x:depot.x,y:depot.y});
    if (path && path.length > 1) {
      spawnCarrier(path, 'Holz');
      woodcutterCD.set(key, 3.0); // alle 3s ein Holz
    } else {
      woodcutterCD.set(key, 1.0);
    }
  }

  // Träger bewegen
  for (let i = carriers.length-1; i>=0; i--) {
    const c = carriers[i];
    // Segment von path[seg] -> path[seg+1]
    if (c.seg >= c.path.length - 1) { carriers.splice(i,1); continue; }

    c.t += dt * c.speed;
    while (c.t >= 1 && c.seg < c.path.length - 1) {
      c.t -= 1;
      c.seg++;
      if (c.seg >= c.path.length - 1) break;
    }

    // Ankunft?
    if (c.seg >= c.path.length - 1) {
      // payload abliefern
      resources[c.payload] = (resources[c.payload] ?? 0) + 1;
      onHUD(c.payload, resources[c.payload]);
      carriers.splice(i,1);
    }
  }
}

function spawnCarrier(path, payload) {
  carriers.push({ path, seg:0, t:0, speed: 1.6, payload });
  resources.Traeger = Math.max(resources.Traeger, carriers.length);
  onHUD('Traeger', resources.Traeger);
}

/* ---------- Zeichnen ---------- */
function draw() {
  ctx.fillStyle = '#0b1628';
  ctx.fillRect(0, 0, w, h);

  ctx.save();
  ctx.translate(Math.floor(w/2), Math.floor(h/2));
  ctx.scale(camera.z, camera.z);
  ctx.translate(-camera.x, -camera.y);

  drawGrid();
  drawRoads();
  drawBuildings();
  drawCarriers();

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
    const { sx, sy } = gridToWorld(b.x, b.y);
    const half = grid.size * 0.75;
    ctx.fillStyle = (b.type==='hq') ? '#29a35c' :
                    (b.type==='depot') ? '#c43c74' : '#3b82f6';
    ctx.fillRect(sx - half/2, sy - half/2, half, half);

    ctx.fillStyle = '#dbeafe';
    ctx.font = `${14/camera.z}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(
      b.type==='hq' ? 'HQ' : (b.type==='woodcutter' ? 'Holzfäller' : 'Depot'),
      sx, sy - (half/2) - (8/camera.z)
    );
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

function drawCarriers() {
  if (!carriers.length) return;
  ctx.save();
  for (const c of carriers) {
    const a = c.path[Math.min(c.seg, c.path.length-1)];
    const b = c.path[Math.min(c.seg+1, c.path.length-1)];
    const ax = a.x, ay = a.y, bx = b.x, by = b.y;

    const wx = lerp(ax, bx, c.t);
    const wy = lerp(ay, by, c.t);
    const { sx, sy } = gridToWorld(wx, wy);

    const r = 6 / camera.z;
    ctx.fillStyle = '#f7d36a'; // „Pille“
    ctx.beginPath();
    ctx.arc(sx, sy, r, 0, Math.PI*2);
    ctx.fill();

    ctx.strokeStyle = '#2b2b2b';
    ctx.lineWidth = 1 / camera.z;
    ctx.stroke();
  }
  ctx.restore();
}

/* ---------- Input ---------- */
function installInput() {
  cvs.addEventListener('pointerdown', onPointerDown);
  cvs.addEventListener('pointermove', onPointerMove);
  cvs.addEventListener('pointerup', onPointerUp);
  cvs.addEventListener('pointercancel', onPointerUp);
  cvs.addEventListener('lostpointercapture', (e)=>pointers.delete(e.pointerId));

  cvs.addEventListener('wheel', onWheel, { passive: false });

  // iOS Safari: eigenes Pinch‑Handling, Default‑Gesten unterbinden
  cvs.addEventListener('gesturestart',  (e)=>e.preventDefault());
  cvs.addEventListener('gesturechange', (e)=>e.preventDefault());
  cvs.addEventListener('gestureend',    (e)=>e.preventDefault());
}

let roadStart = null;

function onPointerDown(e) {
  cvs.setPointerCapture(e.pointerId);
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

  if (pointers.size === 2) {
    pinching = true;
    const [p1, p2] = [...pointers.values()];
    pinchStartDist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
    pinchStartZoom = camera.z;
    isDragging = false;
    return;
  }

  if (pointers.size === 1) {
    isDragging = true;
    dragStart = { x: e.clientX, y: e.clientY, cx: camera.x, cy: camera.y };
  }
}

function onPointerMove(e) {
  if (!pointers.has(e.pointerId)) return;
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

  if (pinching && pointers.size >= 2) {
    const [p1, p2] = [...pointers.values()];
    const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
    if (pinchStartDist > 0) {
      const scale = clamp(dist / pinchStartDist, 0.2, 5);
      camera.z = clamp(pinchStartZoom * scale, 0.5, 2.5);
      onHUD('Zoom', camera.z.toFixed(2)+'x');
    }
    return;
  }

  if (isDragging && tool === 'pointer') {
    const dx = (e.clientX - dragStart.x) / camera.z;
    const dy = (e.clientY - dragStart.y) / camera.z;
    camera.x = dragStart.cx - dx;
    camera.y = dragStart.cy - dy;
  }
}

function onPointerUp(e) {
  pointers.delete(e.pointerId);

  if (pinching && pointers.size < 2) {
    pinching = false; pinchStartDist = 0;
  }

  if (!isDragging) return;
  const moved = Math.hypot(e.clientX - dragStart.x, e.clientY - dragStart.y) > 6;
  isDragging = false;
  if (moved && tool === 'pointer') return;

  // Tap → bauen/abreißen
  const world = screenToWorld(e.clientX, e.clientY);
  const { gx, gy } = worldToGrid(world.x, world.y);

  if (tool === 'hq' || tool === 'woodcutter' || tool === 'depot') {
    placeBuilding(tool, gx, gy);
  } else if (tool === 'road') {
    placeRoad(gx, gy);
  } else if (tool === 'erase') {
    eraseAt(gx, gy);
  }
}

function onWheel(e) {
  e.preventDefault();
  const delta = Math.sign(e.deltaY) * 0.1;
  const targetZ = clamp(camera.z * (1 - delta), 0.5, 2.5);

  const before = screenToWorld(e.clientX, e.clientY);
  camera.z = targetZ;
  const after  = screenToWorld(e.clientX, e.clientY);
  camera.x += before.x - after.x;
  camera.y += before.y - after.y;

  onHUD('Zoom', camera.z.toFixed(2)+'x');
}

/* ---------- Bauen / Abriss ---------- */
function placeBuilding(type, gx, gy) {
  if (findBuilding(gx, gy)) return;
  buildings.push({ type, x: gx, y: gy });
}

function placeRoad(gx, gy) {
  if (!roadStart) { roadStart = { gx, gy }; return; }
  const a = { ...roadStart }, b = { gx, gy };
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
  // Gebäude?
  const bi = buildings.findIndex(b => b.x===gx && b.y===gy);
  if (bi >= 0) { buildings.splice(bi, 1); return; }

  // Straße nah genug?
  const P = gridToWorld(gx, gy);
  const idx = roads.findIndex(r => distPointToSegment(
    P.sx, P.sy, gridToWorld(r.ax, r.ay), gridToWorld(r.bx, r.by)
  ) < 18);
  if (idx >= 0) roads.splice(idx, 1);
}

function findBuilding(gx, gy) { return buildings.find(b => b.x===gx && b.y===gy); }
function findNearestOfType(type, x, y) {
  let best=null, bd=Infinity;
  for (const b of buildings) if (b.type===type) {
    const d = Math.abs(b.x-x)+Math.abs(b.y-y);
    if (d<bd){bd=d;best=b;}
  }
  return best;
}

/* ---------- Pfadfindung ---------- */
function buildGraph() {
  // Knoten: Endpunkte aller Segmente + Positionen der Gebäude
  const nodes = new Map(); // key -> {x,y, edges:[{toKey,cost}]}
  const key = (x,y)=>`${x},${y}`;
  const addNode = (x,y)=>{ const k=key(x,y); if(!nodes.has(k)) nodes.set(k,{x,y,edges:[]}); return nodes.get(k); };

  // Straßen → bidirektionale Kanten
  for (const r of roads) {
    addNode(r.ax, r.ay); addNode(r.bx, r.by);
  }
  for (const r of roads) {
    const k1 = key(r.ax, r.ay), k2 = key(r.bx, r.by);
    const cost = Math.abs(r.ax - r.bx) + Math.abs(r.ay - r.by);
    nodes.get(k1).edges.push({ to:k2, cost });
    nodes.get(k2).edges.push({ to:k1, cost });
  }

  // Gebäude‑Knoten sicherstellen
  for (const b of buildings) addNode(b.x, b.y);

  return { nodes, key };
}

function findPath(A, B) {
  const { nodes, key } = buildGraph();
  const startK = key(A.x,A.y), goalK = key(B.x,B.y);
  if (!nodes.has(startK) || !nodes.has(goalK)) return null;

  // Dijkstra
  const dist = new Map(), prev = new Map(), seen = new Set();
  for (const k of nodes.keys()) dist.set(k, Infinity);
  dist.set(startK, 0);

  while (true) {
    let u=null, best=Infinity;
    for (const [k,d] of dist) if (!seen.has(k) && d<best) { best=d; u=k; }
    if (u===null) break;
    if (u===goalK) break;
    seen.add(u);
    for (const e of nodes.get(u).edges) {
      const nd = dist.get(u) + e.cost;
      if (nd < dist.get(e.to)) { dist.set(e.to, nd); prev.set(e.to, u); }
    }
  }

  if (!prev.has(goalK) && startK!==goalK) return null;

  // Pfad rekonstruieren (Gitterpunkte)
  const rev = [];
  let cur = goalK;
  rev.push(cur);
  while (cur !== startK) {
    cur = prev.get(cur);
    if (!cur) break;
    rev.push(cur);
  }
  const pathGrid = rev.reverse().map(k => {
    const n = nodes.get(k); return { x:n.x, y:n.y };
  });
  return pathGrid;
}

/* ---------- Utils ---------- */
function clamp(v,min,max){ return Math.max(min, Math.min(max, v)); }
function lerp(a,b,t){ return a + (b-a)*t; }

function screenToWorld(px, py) {
  const rect = cvs.getBoundingClientRect();
  const x = (px - rect.left - w/2) / camera.z + camera.x;
  const y = (py - rect.top  - h/2) / camera.z + camera.y;
  return { x, y };
}
function worldToGrid(x, y) {
  const s = grid.size;
  return { gx: Math.round(x / s), gy: Math.round(y / s) };
}
function gridToWorld(gx, gy) {
  const s = grid.size;
  return { sx: gx * s, sy: gy * s };
}
function distPointToSegment(px, py, A, B) {
  const vx = B.sx - A.sx, vy = B.sy - A.sy;
  const wx = px - A.sx,  wy = py - A.sy;
  const c1 = vx*wx + vy*wy;
  if (c1 <= 0) return Math.hypot(px - A.sx, py - A.sy);
  const c2 = vx*vx + vy*vy;
  if (c2 <= c1) return Math.hypot(px - B.sx, py - B.sy);
  const t = c1 / c2;
  const projx = A.sx + t*vx, projy = A.sy + t*vy;
  return Math.hypot(px - projx, py - projy);
}
function labelTool(t){
  return t==='pointer' ? 'Zeiger' :
         t==='road' ? 'Straße' :
         t==='hq' ? 'HQ' :
         t==='woodcutter' ? 'Holzfäller' :
         t==='depot' ? 'Depot' :
         t==='erase' ? 'Abriss' : t;
}
