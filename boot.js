/* boot.js – V14.6-mobil (mit Fallback, damit kein startGame-Fehler mehr auftaucht) */

const $ = (sel, root = document) => root.querySelector(sel);

// --- Canvas & DPR ------------------------------------------------------------
const canvas = $('#game');
const ctx = canvas.getContext('2d');

function fitCanvas() {
  const DPR = Math.max(1, Math.floor(window.devicePixelRatio || 1));
  const w = Math.floor(canvas.clientWidth || window.innerWidth);
  const h = Math.floor(canvas.clientHeight || window.innerHeight);
  if (canvas.width !== w * DPR || canvas.height !== h * DPR) {
    canvas.width = w * DPR;
    canvas.height = h * DPR;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
}
fitCanvas();
addEventListener('resize', fitCanvas);

// --- HUD helper --------------------------------------------------------------
const hudMap = new Map([
  ['wood', $('#hudwood span')],
  ['stone', $('#hudstone span')],
  ['food',  $('#hudfood span')],
  ['gold',  $('#hudgold span')],
  ['carrier',$('#hudcarrier span')],
]);
function setHUD(key, val) { const el = hudMap.get(key); if (el) el.textContent = String(val); }

// --- Toolbar state -----------------------------------------------------------
let tool = 'pointer';
for (const b of $('#toolBar').querySelectorAll('.btn')) {
  b.addEventListener('click', () => {
    $('#toolBar .btn.active')?.classList.remove('active');
    b.classList.add('active');
    tool = b.dataset.tool;
  });
}

// --- Fullscreen helpers ------------------------------------------------------
function isFull() {
  return !!(document.fullscreenElement || document.webkitFullscreenElement);
}
async function toggleFullscreen() {
  try {
    if (!isFull()) {
      await (document.documentElement.requestFullscreen?.() ||
             document.documentElement.webkitRequestFullscreen?.());
    } else {
      await (document.exitFullscreen?.() || document.webkitExitFullscreen?.());
    }
  } catch {}
}
$('#btnFs').addEventListener('click', toggleFullscreen);
$('#btnFs2').addEventListener('click', toggleFullscreen);

// --- Center button passthrough (für Fallback und echtes Game) ----------------
let centerCb = null;
$('#btnCenter').addEventListener('click', () => centerCb && centerCb());

// --- Persistenz Reset (nur minimal) ------------------------------------------
$('#btnReset').addEventListener('click', () => {
  localStorage.removeItem('sm14-save');
  location.reload();
});

// --- Start-Button ------------------------------------------------------------
$('#btnStart').addEventListener('click', start);

// ============================================================================
// 1) Versuche game.js zu laden und startGame(...) aufzurufen
// 2) Wenn das Modul fehlt/kein Export hat -> Fallback-„Mini-Game“
// ============================================================================
async function start() {
  $('#startCard').classList.add('hide');

  // Optionen für echtes Spiel
  const opts = {
    canvas,
    DPR: Math.max(1, Math.floor(window.devicePixelRatio || 1)),
    onHUD: setHUD,
    onCenter: (fn) => { centerCb = fn; },
  };

  try {
    const mod = await import('./game.js').catch(() => null);
    const startGame =
      mod?.startGame ||
      (typeof mod?.default === 'object' ? mod.default.startGame : undefined);

    if (typeof startGame === 'function') {
      startGame(opts);
      return; // echtes Spiel aktiv
    }
  } catch {
    // Ignorieren – wir gehen in den Fallback
  }

  // --- Fallback aktivieren ---------------------------------------------------
  fallbackGame(opts);
}

// ============================================================================
// Fallback-Mini-Game (Raster, Placeholder HQ, Panning, Pinch-Zoom)
// ============================================================================
function fallbackGame({ canvas }) {
  // Kamera
  const cam = { x: 0, y: 0, z: 1 };
  const Z_MIN = 0.5, Z_MAX = 2.5;

  // Demo-Ressourcen
  setHUD('wood', 30); setHUD('stone', 20);
  setHUD('food', 0);  setHUD('gold', 0); setHUD('carrier', 0);

  // HQ-Platzhalter
  const HQ = { w: 420, h: 240 };

  // Zentrieren implementieren
  centerCb = () => { cam.x = 0; cam.y = 0; cam.z = 1; };

  // Interaktion
  let dragging = false;
  let last = { x: 0, y: 0 };
  let pinch = null;

  // Single pointer = Pan (nur im Zeiger-Tool)
  canvas.addEventListener('pointerdown', (e) => {
    canvas.setPointerCapture(e.pointerId);
    last = { x: e.clientX, y: e.clientY };
    dragging = true;
  });
  canvas.addEventListener('pointermove', (e) => {
    if (pinch) return;
    if (dragging && tool === 'pointer') {
      const dx = e.clientX - last.x;
      const dy = e.clientY - last.y;
      cam.x += dx / cam.z;
      cam.y += dy / cam.z;
      last = { x: e.clientX, y: e.clientY };
    }
  });
  addEventListener('pointerup', () => dragging = false);
  addEventListener('pointercancel', () => dragging = false);

  // Pinch-Zoom via Touch
  canvas.addEventListener('touchstart', (e) => {
    if (e.touches.length === 2) {
      pinch = {
        d0: dist(e.touches[0], e.touches[1]),
        z0: cam.z,
      };
    }
  }, { passive: true });
  canvas.addEventListener('touchmove', (e) => {
    if (pinch && e.touches.length === 2) {
      const d = dist(e.touches[0], e.touches[1]);
      const s = clamp(pinch.z0 * (d / pinch.d0), Z_MIN, Z_MAX);
      cam.z = s;
      e.preventDefault();
    }
  }, { passive: false });
  canvas.addEventListener('touchend', () => pinch = null);

  // Wheel-Zoom (Desktop)
  canvas.addEventListener('wheel', (e) => {
    const k = Math.exp(-e.deltaY * 0.001);
    cam.z = clamp(cam.z * k, Z_MIN, Z_MAX);
    e.preventDefault();
  }, { passive: false });

  // Doppeltipp = Vollbild
  let lastTap = 0;
  canvas.addEventListener('pointerup', (e) => {
    const now = performance.now();
    if (now - lastTap < 300) toggleFullscreen();
    lastTap = now;
  });

  // Zeichnen
  function drawGrid() {
    const { width, height } = canvas;
    const W = width / devicePixelRatio;
    const H = height / devicePixelRatio;
    ctx.save();
    ctx.translate(W / 2 + cam.x * cam.z, H / 2 + cam.y * cam.z);
    ctx.scale(cam.z, cam.z);

    // Raster
    const s = 96;
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    const cols = Math.ceil((W / cam.z) / s) + 2;
    const rows = Math.ceil((H / cam.z) / s) + 2;
    const ox = -((W/2)/cam.z + cam.x) % s - s;
    const oy = -((H/2)/cam.z + cam.y) % s - s;
    for (let i = 0; i < cols; i++) {
      const x = ox + i * s;
      ctx.beginPath(); ctx.moveTo(x, -H); ctx.lineTo(x, H); ctx.stroke();
    }
    for (let j = 0; j < rows; j++) {
      const y = oy + j * s;
      ctx.beginPath(); ctx.moveTo(-W, y); ctx.lineTo(W, y); ctx.stroke();
    }

    // HQ-Platzhalter
    ctx.fillStyle = '#2ea04b';
    ctx.fillRect(-HQ.w/2, -HQ.h/2, HQ.w, HQ.h);

    // Text
    ctx.fillStyle = 'rgba(255,255,255,.9)';
    ctx.font = '48px system-ui, -apple-system, Segoe UI, Roboto';
    ctx.textAlign = 'center';
    ctx.fillText('HQ (Platzhalter)', 0, -HQ.h/2 - 20);

    ctx.restore();
  }

  function frame() {
    fitCanvas();
    ctx.clearRect(0,0,canvas.width,canvas.height);
    drawGrid();
    requestAnimationFrame(frame);
  }
  frame();
}

function dist(a, b){ const dx=a.clientX-b.clientX, dy=a.clientY-b.clientY; return Math.hypot(dx,dy); }
function clamp(v, a, b){ return Math.min(b, Math.max(a, v)); }
