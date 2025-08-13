// game.js — Minimal-Renderer mit Pan & Pinch‑Zoom (Touch) + Wheel‑Zoom (Desktop)
// zeichnet Bodenraster + HQ‑Platzhalter und hält alles in der Sicht

export default async function startGame({ canvas, DPR = 1, onHUD = () => {} }) {
  const ctx = canvas.getContext('2d');

  // --- Kamera ---
  const cam = {
    x: 0, y: 0, zoom: 1,
    minZoom: 0.5, maxZoom: 2.5,
  };

  // Welt (virtuelle Größe in Pixeln bei Zoom 1.0)
  const world = { w: 3000, h: 2000 };

  // HQ‑Platzhalter (einfaches Rechteck, mittig)
  const HQ = {
    w: 560, h: 360,
    get x() { return world.w / 2 - this.w / 2; },
    get y() { return world.h / 2 - this.h / 2; },
  };

  // --- Resize & Canvas‑Setup ---
  function setCanvasSize() {
    const w = Math.floor(canvas.clientWidth  * DPR);
    const h = Math.floor(canvas.clientHeight * DPR);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w; canvas.height = h;
    }
  }
  setCanvasSize();
  window.addEventListener('resize', setCanvasSize, { passive: true });

  // --- HUD Initial ---
  onHUD('hudWood', 0);
  onHUD('hudStone', 0);
  onHUD('hudFood', 0);
  onHUD('hudGold', 0);
  onHUD('hudCar',  0);
  onHUD('hudTool', 'Zeiger');
  onHUD('hudZoom', cam.zoom.toFixed(2) + 'x');

  // --- Kamera‑Hilfen ---
  function clampCam() {
    // Bildschirmgröße in Weltkoordinaten
    const vw = canvas.width  / DPR / cam.zoom;
    const vh = canvas.height / DPR / cam.zoom;

    const pad = 80; // kleiner Rand
    const minX = -pad, minY = -pad;
    const maxX = world.w - vw + pad;
    const maxY = world.h - vh + pad;

    cam.x = Math.max(minX, Math.min(cam.x, maxX));
    cam.y = Math.max(minY, Math.min(cam.y, maxY));
  }
  function applyZoom(nextZoom, focusX, focusY) {
    const z0 = cam.zoom;
    const z1 = Math.max(cam.minZoom, Math.min(nextZoom, cam.maxZoom));
    if (z1 === z0) return;
    // zoomen um Fokuspunkt (Screen -> Welt)
    const fx = (focusX ?? canvas.width  * 0.5) / DPR;
    const fy = (focusY ?? canvas.height * 0.5) / DPR;
    const wx = cam.x + fx / z0;
    const wy = cam.y + fy / z0;
    cam.zoom = z1;
    cam.x = wx - fx / cam.zoom;
    cam.y = wy - fy / cam.zoom;
    clampCam();
    onHUD('hudZoom', cam.zoom.toFixed(2) + 'x');
  }

  // --- Eingabe: Pan + Pinch ---
  let isDragging = false;
  let lastX = 0, lastY = 0;

  canvas.addEventListener('pointerdown', (ev) => {
    isDragging = true;
    lastX = ev.clientX; lastY = ev.clientY;
    canvas.setPointerCapture(ev.pointerId);
  });
  canvas.addEventListener('pointermove', (ev) => {
    if (!isDragging) return;
    const dx = (ev.clientX - lastX) / (DPR * cam.zoom);
    const dy = (ev.clientY - lastY) / (DPR * cam.zoom);
    cam.x -= dx; cam.y -= dy;
    lastX = ev.clientX; lastY = ev.clientY;
    clampCam();
  });
  canvas.addEventListener('pointerup', (ev) => {
    isDragging = false;
    canvas.releasePointerCapture?.(ev.pointerId);
  });
  canvas.addEventListener('pointercancel', () => { isDragging = false; });

  // Wheel‑Zoom (Desktop)
  canvas.addEventListener('wheel', (ev) => {
    ev.preventDefault();
    const factor = Math.pow(1.0015, -ev.deltaY);
    applyZoom(cam.zoom * factor, ev.clientX * DPR, ev.clientY * DPR);
  }, { passive: false });

  // Touch: Pinch‑Zoom
  let pinch = null; // {id1,id2,d0, z0, cx, cy}
  canvas.addEventListener('touchstart', (ev) => {
    if (ev.touches.length === 2) {
      const [t1, t2] = ev.touches;
      pinch = {
        id1: t1.identifier, id2: t2.identifier,
        d0: dist(t1, t2),
        z0: cam.zoom,
        cx: (t1.clientX + t2.clientX) * 0.5,
        cy: (t1.clientY + t2.clientY) * 0.5,
      };
      isDragging = false;
    }
  }, { passive: true });
  canvas.addEventListener('touchmove', (ev) => {
    if (pinch && ev.touches.length === 2) {
      const [t1, t2] = ev.touches;
      const d = dist(t1, t2);
      const factor = d / Math.max(10, pinch.d0);
      applyZoom(pinch.z0 * factor, pinch.cx * DPR, pinch.cy * DPR);
    }
  }, { passive: true });
  canvas.addEventListener('touchend', () => { pinch = null; }, { passive: true });
  function dist(a, b){ const dx=a.clientX-b.clientX, dy=a.clientY-b.clientY; return Math.hypot(dx,dy); }

  // --- Zeichnen ---
  function clear() {
    ctx.setTransform(1,0,0,1,0,0);
    ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.fillStyle = '#0f1823';
    ctx.fillRect(0,0,canvas.width,canvas.height);
  }

  function drawWorld() {
    // Kamera
    ctx.setTransform(cam.zoom * DPR, 0, 0, cam.zoom * DPR, 0, 0);
    ctx.translate(-cam.x, -cam.y);

    drawGround();
    drawHQ();
  }

  function drawGround() {
    // dezentes isometrisches „Diamant“-Raster
    const step = 64;
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    // diagonale Linien
    const max = Math.max(world.w, world.h) + 2000;
    ctx.beginPath();
    for (let x = -max; x <= max; x += step) {
      ctx.moveTo(x, -max); ctx.lineTo(x + max, max);
      ctx.moveTo(x,  max); ctx.lineTo(x - max, -max);
    }
    ctx.stroke();
    ctx.restore();
  }

  function drawHQ() {
    // Diamant-Rahmen
    ctx.save();
    ctx.translate(HQ.x + HQ.w / 2, HQ.y + HQ.h / 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    const d = Math.min(HQ.w, HQ.h) * 0.55;
    ctx.moveTo(0, -d); ctx.lineTo(d, 0); ctx.lineTo(0, d); ctx.lineTo(-d, 0); ctx.closePath();
    ctx.stroke();
    ctx.restore();

    // Körper
    ctx.fillStyle = '#2fa24b';
    ctx.fillRect(HQ.x, HQ.y, HQ.w, HQ.h);

    // Titel
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 56px system-ui, -apple-system, Segoe UI, Roboto, Arial';
    ctx.fillText('HQ (Platzhalter)', HQ.x - 60, Math.max(40, HQ.y - 20));
  }

  // --- Loop ---
  let running = true;
  function frame() {
    if (!running) return;
    clear();
    drawWorld();
    requestAnimationFrame(frame);
  }
  frame();

  // einmalig Kamera in die Mitte setzen
  centerOn(HQ.x + HQ.w / 2, HQ.y + HQ.h / 2);

  function centerOn(wx, wy) {
    const vw = canvas.width  / DPR / cam.zoom;
    const vh = canvas.height / DPR / cam.zoom;
    cam.x = wx - vw / 2;
    cam.y = wy - vh / 2;
    clampCam();
  }

  // Public (falls du später Buttons anbinden willst)
  return {
    stop(){ running = false; },
    center(){ centerOn(HQ.x + HQ.w/2, HQ.y + HQ.h/2); },
  };
}
