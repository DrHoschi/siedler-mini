// game.js (V14.3)
// Minimal-Start, damit main.run() sicher funktioniert.
// Später kannst du hier deine komplette Spiellogik (World/Renderer/Carriers etc.) wieder einhängen.

import Renderer from './render.js?v=14.3';

function setCanvasSize(canvas, DPR = 1) {
  const w = Math.floor(canvas.clientWidth * DPR);
  const h = Math.floor(canvas.clientHeight * DPR);
  if (canvas.width !== w) canvas.width = w;
  if (canvas.height !== h) canvas.height = h;
}

function drawGrid(ctx, step = 64) {
  const { width: W, height: H } = ctx.canvas;
  ctx.save();
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#0f1823';
  ctx.fillRect(0, 0, W, H);
  ctx.globalAlpha = 0.25;
  ctx.strokeStyle = '#2b3b53';
  ctx.lineWidth = 1;

  // dezentes „Diamant“-Raster (isometrisches Gefühl)
  for (let y = -step; y < H + step; y += step) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }
  for (let x = -step; x < W + step; x += step) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, H);
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * Startet das Spiel. Wird von main.run({ canvas, DPR, onHud }) aufgerufen.
 */
export async function startGame(opts = {}) {
  const { canvas, DPR = (window.devicePixelRatio || 1), onHud } = opts;
  if (!canvas) throw new Error('startGame(opts): canvas fehlt');

  // Canvas vorbereiten
  setCanvasSize(canvas, DPR);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Kein 2D‑Context verfügbar');

  // (optional) HUD initialisieren
  if (typeof onHud === 'function') {
    onHud('Tool', 'Zeiger');
    onHud('Zoom', '1.00x');
  }

  // Renderer-Objekt anlegen (falls dein core/render.js ein default "createRenderer" liefert)
  // Dieser Aufruf ist „no-op“ sicher, falls createRenderer intern noch leer ist.
  let renderer = null;
  try {
    renderer = Renderer && typeof Renderer === 'function' ? Renderer(canvas) : null;
  } catch (e) {
    // Falls dein core/render.js noch keinen Default zurückgibt, zeichnen wir einfach das Grid.
    console.warn('Renderer nicht initialisierbar – fallback auf Grid', e);
  }

  // Erstes Bild
  if (renderer && typeof renderer.draw === 'function') {
    renderer.draw();
  } else {
    drawGrid(ctx, 64);
  }

  // Resize-Handling
  const onResize = () => {
    setCanvasSize(canvas, DPR);
    if (renderer && typeof renderer.draw === 'function') renderer.draw();
    else drawGrid(ctx, 64);
  };
  window.addEventListener('resize', onResize);

  // einfache Rückgabe, damit du später Stop/Dispose ergänzen kannst
  return {
    dispose() {
      window.removeEventListener('resize', onResize);
    }
  };
}
