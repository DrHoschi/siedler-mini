// game.js — minimal lauffähig, keine externen Imports, damit "module script failed" sicher weg ist.

export async function startGame({ canvas, DPR = 1, onHUD = ()=>{} } = {}){
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas.getContext() fehlgeschlagen');

  // kleine Demo‑Werte ins HUD
  onHUD('Wood','20'); onHUD('Stone','10'); onHUD('Food','10'); onHUD('Gold','0'); onHUD('Car','0');

  // einfache Kamera/Zoom‑Platzhalter
  const state = {
    t: 0,
    zoom: 1,
    px: 0, py: 0,
    dragging: false,
    lastX: 0, lastY: 0,
    tool: 'pointer',
  };

  canvas.addEventListener('pointerdown', ev => {
    state.dragging = true; state.lastX = ev.clientX; state.lastY = ev.clientY;
    canvas.setPointerCapture(ev.pointerId);
  });
  canvas.addEventListener('pointermove', ev => {
    if (!state.dragging) return;
    const dx = ev.clientX - state.lastX, dy = ev.clientY - state.lastY;
    state.lastX = ev.clientX; state.lastY = ev.clientY;
    state.px += dx; state.py += dy;
  });
  canvas.addEventListener('pointerup', ev => { state.dragging = false; canvas.releasePointerCapture?.(ev.pointerId); });
  canvas.addEventListener('wheel', ev => {
    ev.preventDefault();
    const z = Math.max(0.5, Math.min(2.0, state.zoom * (ev.deltaY < 0 ? 1.1 : 0.9)));
    state.zoom = z;
    const el = document.querySelector('#hudZoom'); if (el) el.textContent = `${z.toFixed(2)}x`;
  }, { passive:false });

  function drawGrid(ctx){
    const w = canvas.width, h = canvas.height;
    ctx.save();
    ctx.clearRect(0,0,w,h);
    ctx.fillStyle = '#0f1823';
    ctx.fillRect(0,0,w,h);

    ctx.translate(state.px, state.py);
    ctx.scale(state.zoom, state.zoom);

    ctx.globalAlpha = 1;
    const step = 64 * DPR;
    ctx.strokeStyle = 'rgba(255,255,255,.08)';
    ctx.lineWidth = 1;

    for (let y=-step; y<h+step; y+=step){
      for (let x=-step; x<w+step; x+=step){
        ctx.beginPath();
        ctx.moveTo(x, y+step/2);
        ctx.lineTo(x+step/2, y);
        ctx.lineTo(x+step, y+step/2);
        ctx.lineTo(x+step/2, y+step);
        ctx.closePath();
        ctx.stroke();
      }
    }

    // Ein Platzhalter‑HQ
    ctx.fillStyle = '#2f8a3e';
    ctx.fillRect(-80, -80, 160, 160);
    ctx.fillStyle = '#e7ffee';
    ctx.font = `${16*DPR}px system-ui,-apple-system,Segoe UI,Roboto,Arial`;
    ctx.fillText('HQ (Platzhalter)', -70*DPR, -50*DPR);

    ctx.restore();
  }

  function frame(ts){
    state.t = ts;
    drawGrid(ctx);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
