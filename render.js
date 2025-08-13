// render.js (V14.3-safe4)
// Zeichnet immer ein dunkles Raster + "HQ (Platzhalter)" ins Zentrum.

export default function Renderer(canvas, DPR, st) {
  const ctx = canvas.getContext('2d');

  function clear() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#0f1823';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  // dezentes Punkt-/Diamant-Raster, unabhängig vom Weltzustand
  function drawGrid(step = 64) {
    ctx.save();
    ctx.globalAlpha = 0.35;
    ctx.strokeStyle = '#2b3b53';
    ctx.lineWidth = 1;

    // horizontale Linien
    for (let y = step; y < canvas.height; y += step) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
    }
    // diagonale "Diamant"-Anmutung
    ctx.globalAlpha = 0.25;
    ctx.setLineDash([8, 16]);
    const diag = step * 1.2;
    for (let y = -diag; y < canvas.height + diag; y += diag) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y + canvas.width); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(canvas.width, y); ctx.lineTo(0, y + canvas.width); ctx.stroke();
    }
    ctx.restore();
  }

  function drawHQPlaceholder() {
    // Größe relativ zur kürzeren Leinwandkante
    const s = Math.round(Math.min(canvas.width, canvas.height) * 0.25);
    const cx = Math.floor(canvas.width / 2);
    const cy = Math.floor(canvas.height / 2);

    // Titel
    ctx.save();
    ctx.font = `${Math.round(s * 0.4)}px system-ui, -apple-system, 'Segoe UI', Roboto, Arial`;
    ctx.fillStyle = '#ffffff';
    ctx.globalAlpha = 0.9;
    ctx.textBaseline = 'top';
    const text = 'HQ (Platzhalter)';
    const tw = ctx.measureText(text).width;
    ctx.fillText(text, cx - tw / 2, cy - s - Math.round(s * 0.15));
    ctx.restore();

    // grüner Block
    ctx.save();
    ctx.fillStyle = '#2ea043';
    ctx.fillRect(cx - s / 2, cy - s / 2, s, s);
    ctx.restore();

    // dezente Rautenform darunter
    ctx.save();
    ctx.strokeStyle = '#2b3b53';
    ctx.globalAlpha = 0.55;
    ctx.lineWidth = 2;
    const r = Math.round(s * 0.85);
    ctx.beginPath();
    ctx.moveTo(cx, cy - r / 2);
    ctx.lineTo(cx + r / 2, cy);
    ctx.lineTo(cx, cy + r / 2);
    ctx.lineTo(cx - r / 2, cy);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }

  function drawHUDDebug() {
    // kleine Debug-Info rechts oben
    ctx.save();
    ctx.font = '12px system-ui, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.fillText(`Zoom ${st?.zoom?.toFixed ? st.zoom.toFixed(2) : '1.00'}x`, canvas.width - 100, 16);
    ctx.restore();
  }

  function draw() {
    clear();
    drawGrid();
    drawHQPlaceholder();
    drawHUDDebug();
  }

  return { draw };
}
