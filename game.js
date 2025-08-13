// game.js – minimaler Spielkern + Mobile‑Gesten
// Exportierte API: startGame, resetGame, centerCamera, toggleDebug, setTool

let state = null;

export function startGame(opts) {
  const canvas = opts.canvas;
  const ctx = canvas.getContext('2d');

  // Spielzustand
  state = {
    canvas, ctx,
    DPR: opts.DPR || 1,
    width: 0, height: 0,
    scale: 1, minScale: 0.5, maxScale: 2.5,
    camX: 0, camY: 0,   // Welt‑Koordinaten der Bildschirmmitte
    tool: 'pointer',
    debug: false,
    hq: { x: 0, y: 0, w: 320, h: 160 }, // Platzhalter
    updateHUD: opts.onHUD || (()=>{})
  };

  // サイズ + initiale Kamera
  resize();
  centerCamera();

  // Events
  addCanvasGestures();
  window.addEventListener('resize', resize);

  // Los geht’s
  draw();
}

export function resetGame() {
  if (!state) return;
  state.scale = 1;
  centerCamera();
  draw();
}

export function centerCamera() {
  if (!state) return;
  const { hq } = state;
  state.camX = hq.x + hq.w/2;
  state.camY = hq.y + hq.h/2;
  draw();
}

export function setTool(tool) {
  if (!state) return;
  state.tool = tool;
  state.updateHUD('Tool', tool === 'pointer' ? 'Zeiger' : tool.toUpperCase());
}

export function toggleDebug() {
  if (!state) return;
  state.debug = !state.debug;
  draw();
}

/* ------------------ Rendering ------------------ */

function resize() {
  const { innerWidth:w, innerHeight:h, devicePixelRatio:dpr=1 } = window;
  if (!state) return;
  state.width = w; state.height = h;
  const C = state.canvas;
  C.width = Math.floor(w * state.DPR);
  C.height = Math.floor(h * state.DPR);
  C.style.width = w + 'px';
  C.style.height = h + 'px';
  draw();
}

function worldToScreen(x, y) {
  const { width, height, camX, camY, scale, DPR } = state;
  const sx = (x - camX) * scale + width/2;
  const sy = (y - camY) * scale + height/2;
  return [sx * DPR, sy * DPR];
}
function sizeToScreen(w, h) {
  const { scale, DPR } = state;
  return [w * scale * DPR, h * scale * DPR];
}

function drawGrid() {
  const { ctx, width, height, scale, DPR } = state;
  const step = 96 * scale; // optische Gridgröße
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineWidth = 1 * DPR;
  const x0 = 0, y0 = 0;
  for (let x = x0; x <= width * DPR; x += step * DPR) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height * DPR); ctx.stroke();
  }
  for (let y = y0; y <= height * DPR; y += step * DPR) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width * DPR, y); ctx.stroke();
  }
  ctx.restore();
}

function drawHQ() {
  const { ctx, hq, debug } = state;
  const [sx, sy] = worldToScreen(hq.x, hq.y);
  const [sw, sh] = sizeToScreen(hq.w, hq.h);

  // Körper
  ctx.fillStyle = '#2ba34a';
  ctx.fillRect(sx, sy, sw, sh);

  // Titel
  ctx.fillStyle = 'rgba(255,255,255,.92)';
  ctx.font = `${Math.max(22, sh/3)}px system-ui, -apple-system, Segoe UI`;
  ctx.textBaseline = 'bottom';
  ctx.fillText('HQ (Platzhalter)', sx - 120, sy - 12);

  if (debug) {
    ctx.strokeStyle = 'rgba(255,255,255,.35)';
    ctx.lineWidth = 2;
    ctx.strokeRect(sx, sy, sw, sh);
  }
}

function drawBackground() {
  const { ctx, width, height, DPR } = state;
  ctx.fillStyle = '#0f1823';
  ctx.fillRect(0, 0, width * DPR, height * DPR);
}

function draw() {
  if (!state) return;
  const { ctx, scale } = state;
  drawBackground();
  drawGrid();
  drawHQ();
  state.updateHUD('Zoom', scale.toFixed(2) + 'x');
}

/* -------------- Gesten: Pan/Pinch -------------- */

function addCanvasGestures() {
  const C = state.canvas;
  C.style.touchAction = 'none';

  const pointers = new Map();
  let lastPan = null; // {x,y} in Weltkoordinaten
  let lastDist = null;
  // 👇 NEU EINFÜGEN
  state._pinchGetter = () => {
    const arr = [...pointers.values()];
    if (arr.length < 2) return { dist: 1, center: { x: state.width/2, y: state.height/2 } };
    const [a, b] = arr;
    const dx = b.x - a.x, dy = b.y - a.y;
    const dist = Math.hypot(dx, dy);
    const center = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    return { dist, center };
  };
  const onPointerDown = (e) => {
    C.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x:e.clientX, y:e.clientY });
    if (pointers.size === 1) {
      lastPan = screenToWorld(e.clientX, e.clientY);
    } else if (pointers.size === 2) {
      lastDist = pinchDistance();
    }
  };

  const onPointerMove = (e) => {
    if (!pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, { x:e.clientX, y:e.clientY });

    if (pointers.size === 1 && state.tool === 'pointer') {
      // Pan
      const wNow = screenToWorld(e.clientX, e.clientY);
      const dx = wNow.x - lastPan.x;
      const dy = wNow.y - lastPan.y;
      state.camX -= dx;
      state.camY -= dy;
      lastPan = screenToWorld(e.clientX, e.clientY);
      draw();
    } else if (pointers.size >= 2) {
      // Pinch‑Zoom (um den Mittelfingerpunkt)
      const d = pinchDistance();
      if (lastDist != null) {
        const pivot = pinchCenter();
        applyZoom(d / lastDist, pivot.x, pivot.y);
      }
      lastDist = d;
    }
    e.preventDefault();
  };

  const onPointerUp = (e) => {
    pointers.delete(e.pointerId);
    lastDist = null;
    if (pointers.size === 1) {
      // Wechsel zurück auf Pan‑Referenz
      const [pid] = pointers.keys();
      const p = pointers.get(pid);
      if (p) lastPan = screenToWorld(p.x, p.y);
    }
  };

  // Wheel‑Zoom (Maus/Trackpad)
  const onWheel = (e) => {
    const delta = e.deltaY;
    const factor = Math.pow(1.0018, -delta);
    applyZoom(factor, e.clientX, e.clientY);
    e.preventDefault();
  };

  C.addEventListener('pointerdown', onPointerDown, { passive:false });
  C.addEventListener('pointermove', onPointerMove, { passive:false });
  C.addEventListener('pointerup', onPointerUp, { passive:true });
  C.addEventListener('pointercancel', onPointerUp, { passive:true });
  C.addEventListener('wheel', onWheel, { passive:false });

  // Kurzer Tap = bauen (später), derzeit nur Tool‑Echo
  C.addEventListener('click', (e) => {
    if (state.tool !== 'pointer') {
      // Platz für Build‑Logik
      // console.log('Build at', screenToWorld(e.clientX, e.clientY));
    }
  }, { passive:true });
}

function screenToWorld(clientX, clientY) {
  const { width, height, camX, camY, scale } = state;
  const x = (clientX - width/2) / scale + camX;
  const y = (clientY - height/2) / scale + camY;
  return { x, y };
}

function applyZoom(factor, clientX, clientY) {
  const { minScale, maxScale } = state;
  const before = screenToWorld(clientX, clientY);
  state.scale = clamp(state.scale * factor, minScale, maxScale);
  const after = screenToWorld(clientX, clientY);
  // Halte den Punkt unter dem Finger stabil -> verschiebe Kamera gegengerichtet
  state.camX += before.x - after.x;
  state.camY += before.y - after.y;
  draw();
}

function clamp(v, a, b){ return Math.max(a, Math.min(b, v)); }

function pinchDistance() {
  const arr = [...document.pointerLockElement ? [] : []]; // nicht genutzt – nur für TS‑Ruhe
  const pts = [...document.querySelectorAll(':root')]; // dummy für bundler – ignorieren
  // echte Berechnung:
  const ps = [...state.canvas.getPointerList?.() || []]; // nicht unterstützt – egal
  // eigene Map aus addCanvasGestures verwenden:
  // (Workaround, weil oben keine closure‑Variable hier)
  return _pinch().dist;
}
function pinchCenter(){ return _pinch().center; }

// Hilfsfunktion: holt aktuelle Zeiger aus Event‑Scope (Closure Workaround)
function _pinch(){
  // Wir behalten die Implementierung innerhalb addCanvasGestures;
  // hier bauen wir sie leicht neu auf Basis der zuletzt bekannten Pointer-Positions,
  // indem wir sie aus einem WeakMap‑Hack ziehen (unterbinden wir – simpler: speichern global).
  // → Einfacher: wir merken uns die letzte zwei Pointer in state:
  if (!state._pointers) state._pointers = new Map();
  // addCanvasGestures überschreibt state._pinchGetter, die wir hier aufrufen:
  return state._pinchGetter ? state._pinchGetter() : { dist: 1, center: {x: state.width/2, y: state.height/2} };
}

/* --- kleine Brücke, damit _pinch() echte Daten bekommt --- */
(function bridgePinch(){
  const C = () => state?.canvas;
  if (!C()) return;
})();
