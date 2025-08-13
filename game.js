// game.js (V14.3-safe3)
// Minimal-start, damit boot.js -> main.run() -> game.startGame(opts) garantiert funktioniert.
// Keine weiteren Imports, nur Canvas-Setup, HUD-Initialisierung und ein Platzhalter-HQ.

export async function startGame(opts = {}) {
  const {
    canvas,
    DPR = (window.devicePixelRatio || 1),
    onHUD = () => {},
    onError = (e) => console.error(e),
  } = opts;

  if (!canvas) {
    onError(new Error('game.js: canvas fehlt'));
    return false;
  }

  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) {
    onError(new Error('game.js: 2D-Context fehlt'));
    return false;
  }

  // ---------- Canvas/Viewport ----------
  function setCanvasSize() {
    const w = Math.floor(canvas.clientWidth * DPR);
    const h = Math.floor(canvas.clientHeight * DPR);
    if (canvas.width !== w) canvas.width = w;
    if (canvas.height !== h) canvas.height = h;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0); // zeichnen in CSS‑Pixeln
  }

  // ---------- Hintergrund ----------
  function drawGrid() {
    const w = canvas.width / DPR;
    const h = canvas.height / DPR;
    ctx.save();
    ctx.fillStyle = '#0f1823';
    ctx.fillRect(0, 0, w, h);

    // dezentes Raster (Diamant-Feeling)
    ctx.globalAlpha = 0.25;
    ctx.strokeStyle = '#2b3b53';
    const step = 96;
    for (let y = -step; y < h + step; y += step) {
      ctx.beginPath();
      ctx.moveTo(-step, y);
      ctx.lineTo(w + step, y);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  // ---------- Platzhalter-HQ ----------
  function drawHQPlaceholder() {
    const w = canvas.width / DPR;
    const h = canvas.height / DPR;

    const boxW = 260;
    const boxH = 120;
    const cx = Math.floor(w * 0.5);
    const cy = Math.floor(h * 0.35);

    // diamantenförmiger „Bauplatz“-Rahmen
    ctx.save();
    ctx.globalAlpha = 0.35;
    ctx.strokeStyle = '#2b3b53';
    ctx.lineWidth = 2;
    ctx.beginPath();
    const r = 120;
    ctx.moveTo(cx, cy - r);
    ctx.lineTo(cx + r, cy);
    ctx.lineTo(cx, cy + r);
    ctx.lineTo(cx - r, cy);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();

    // grüner Klotz als HQ
    ctx.fillStyle = '#2f9346';
    ctx.fillRect(cx - boxW / 2, cy - boxH / 2, boxW, boxH);

    // Titel
    ctx.fillStyle = '#e6f0ff';
    ctx.font = 'bold 42px system-ui, -apple-system, Segoe UI, Roboto, Arial';
    ctx.fillText('HQ (Platzhalter)', Math.max(12, cx - boxW / 2), Math.max(48, cy - boxH / 2 - 16));
  }

  // ---------- HUD initial ----------
  function initHUD() {
    onHUD('hudWood', '0');
    onHUD('hudStone', '0');
    onHUD('hudFood', '0');
    onHUD('hudGold', '0');
    onHUD('hudCar', '0');
    onHUD('hudTool', 'Zeiger');
    onHUD('hudZoom', '1.00x');
  }

  // ---------- Haupt-Draw ----------
  function draw() {
    setCanvasSize();
    drawGrid();
    drawHQPlaceholder();
  }

  // ---------- Events ----------
  function onResize() {
    setCanvasSize();
    draw(); // einfach neu zeichnen
  }
  window.addEventListener('resize', onResize);

  // ---------- Start jetzt! ----------
  try {
    initHUD();
    draw();
  } catch (err) {
    onError(err);
    return false;
  }

  // Optional: API zurückgeben (falls du später erweitern willst)
  return {
    /** Zentrieren-Stub (wird derzeit nicht benötigt, kann aber vom UI aufgerufen werden) */
    centerMap() { draw(); },
    /** Aufräumen beim Reset (boot.js ruft einfach neu startGame auf) */
    destroy() { window.removeEventListener('resize', onResize); }
  };
}
