// render.js — V14.3
// Kleiner Renderer für Raster, Straßen & einfache Gebäude‑Platzhalter.
// Exportiert createRenderer(...)

export function createRenderer(canvas, ctx, world, camera, DPR = 1) {
  let debug = false;

  function clear() {
    ctx.setTransform(1,0,0,1,0,0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // dunkler Hintergrund
    ctx.fillStyle = '#0f1823';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  function applyCamera() {
    ctx.setTransform(camera.zoom, 0, 0, camera.zoom, -camera.x * camera.zoom, -camera.y * camera.zoom);
  }

  function drawGrid() {
    // dezentes isometrisches Raster (als Diamant‑Kacheln angedeutet)
    const ts = world.tileSize;
    const cols = world.cols;
    const rows = world.rows;

    ctx.save();
    applyCamera();

    // Kachelfläche
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const cx = x * ts + ts / 2;
        const cy = y * ts + ts / 2;
        drawDiamond(cx, cy, ts * 0.5, ts * 0.25, '#132638');
      }
    }
    ctx.restore();
  }

  function drawRoads() {
    const ts = world.tileSize;
    ctx.save();
    applyCamera();
    ctx.fillStyle = '#6e6e6e';
    for (const k of world.roads) {
      const [tx, ty] = k.split(',').map(Number);
      const x = tx * ts;
      const y = ty * ts;
      ctx.fillRect(x + ts*0.25, y + ts*0.4, ts*0.5, ts*0.2);
    }
    ctx.restore();
  }

  function drawBuildings() {
    const ts = world.tileSize;
    ctx.save();
    applyCamera();
    for (const b of world.buildings) {
      const x = b.x * ts;
      const y = b.y * ts;
      if (b.type === 'hq') {
        ctx.fillStyle = '#2e8b57';
        ctx.fillRect(x + 2, y + 2, ts*2 - 4, ts*2 - 4); // 2x2 Felder, etwas sichtbar
        ctx.fillStyle = '#ffffff';
        ctx.font = `${Math.floor(ts*0.45)}px system-ui, sans-serif`;
        ctx.fillText('HQ', x + ts*0.4, y + ts*1.2);
      } else if (b.type === 'lumber') {
        ctx.fillStyle = '#8b5a2b';
        ctx.fillRect(x + 2, y + 2, ts - 4, ts - 4);
        ctx.fillStyle = '#fff';
        ctx.font = `${Math.floor(ts*0.35)}px system-ui, sans-serif`;
        ctx.fillText('L', x + ts*0.35, y + ts*0.7);
      } else if (b.type === 'depot') {
        ctx.fillStyle = '#3a6ea5';
        ctx.fillRect(x + 2, y + 2, ts - 4, ts - 4);
        ctx.fillStyle = '#fff';
        ctx.font = `${Math.floor(ts*0.35)}px system-ui, sans-serif`;
        ctx.fillText('D', x + ts*0.35, y + ts*0.7);
      }
    }
    ctx.restore();
  }

  function drawHUD() {
    if (!debug) return;
    ctx.setTransform(1,0,0,1,0,0);
    ctx.fillStyle = 'rgba(255,255,255,.6)';
    ctx.font = '12px system-ui, sans-serif';
    ctx.fillText(`Zoom ${camera.zoom.toFixed(2)}x`, 12, 16);
  }

  function drawDiamond(cx, cy, rx, ry, stroke = '#1e3a57') {
    ctx.beginPath();
    ctx.moveTo(cx,       cy - ry);
    ctx.lineTo(cx + rx,  cy);
    ctx.lineTo(cx,       cy + ry);
    ctx.lineTo(cx - rx,  cy);
    ctx.closePath();
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  function draw(dt) {
    clear();
    drawGrid();
    drawRoads();
    drawBuildings();
    drawHUD();
  }

  function toggleDebug() { debug = !debug; }

  return { draw, toggleDebug };
}
