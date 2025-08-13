// main.js (V14.3)
// Minimal-Start, damit der Start-Button zuverlässig funktioniert.
// Später kannst du hier deine echten Module importieren und im run() starten, z.B.:
//   import { startGame } from './game.js?v=14.3';
//   export async function run(opts){ await startGame(opts); }

let ctx, W = 0, H = 0, DPR = 1;
let zoom = 1;

function resizeCanvas(canvas) {
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  canvas.width  = Math.floor(w * DPR);
  canvas.height = Math.floor(h * DPR);
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  W = canvas.width  / DPR;
  H = canvas.height / DPR;
}

function drawPlaceholder() {
  // dunkler BG
  ctx.fillStyle = '#0f1823';
  ctx.fillRect(0, 0, W, H);

  // kleines isometrisches Gitter als „Karte“
  const s = 40 * zoom;             // Kachelgröße
  const ox = Math.floor(W/2 - 10*s);
  const oy = Math.floor(H/2 - 6*s);
  for (let r = 0; r < 12; r++) {
    for (let c = 0; c < 20; c++) {
      const x = ox + (c - r) * (s/2);
      const y = oy + (c + r) * (s/4);
      // Raute
      ctx.beginPath();
      ctx.moveTo(x,       y - s/4);
      ctx.lineTo(x + s/2, y);
      ctx.lineTo(x,       y + s/4);
      ctx.lineTo(x - s/2, y);
      ctx.closePath();
      ctx.fillStyle = ( (r+c) % 2 ) ? '#1c2b3f' : '#1a283b';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.05)';
      ctx.stroke();
    }
  }

  // „HQ“-Platzhalter
  ctx.fillStyle = '#2f8a3b';
  ctx.fillRect(W/2 - 60, H/2 - 40, 120, 80);
  ctx.fillStyle = '#e6f2ff';
  ctx.font = '14px system-ui, -apple-system, Segoe UI, Roboto, Arial';
  ctx.fillText('HQ (Platzhalter)', W/2 - 56, H/2 + 4);
}

export async function run(opts = {}) {
  const { canvas, DPR: deviceDPR = 1 } = opts;
  if (!canvas) throw new Error('Canvas fehlt (opts.canvas)');

  DPR = Math.max(1, Math.min(3, deviceDPR || 1));
  ctx = canvas.getContext('2d');

  // Größe setzen und zeichnen
  resizeCanvas(canvas);
  drawPlaceholder();

  // einfache Gesten (nur Zoom per Wheel/Pinch simuliert; Pan lässt du deiner Input-Logik)
  const onWheel = (ev) => {
    ev.preventDefault();
    zoom = Math.max(0.4, Math.min(2.0, zoom * (ev.deltaY < 0 ? 1.05 : 0.95)));
    drawPlaceholder();
  };
  canvas.addEventListener('wheel', onWheel, { passive:false });

  // Resize
  const onResize = () => { resizeCanvas(canvas); drawPlaceholder(); };
  window.addEventListener('resize', onResize);

  // Cleanup-Funktion (falls du später neu startest)
  run.cleanup = () => {
    canvas.removeEventListener('wheel', onWheel);
    window.removeEventListener('resize', onResize);
  };

  // → Ab hier kannst du deine echten Module starten:
  // const game = await import('./game.js?v=14.3');
  // await game.startGame({ canvas, DPR, ... });
}

export function centerMap() {
  // Im Platzhalter nur neu zeichnen – in deiner echten Version Kamera auf Mitte setzen
  drawPlaceholder();
}
