/* ============================================================================
 * Datei   : core/camera.glue.js
 * Version : v25.11.13-final
 * Zweck   : Pan & Zoom per CSS-Transform für #game + Event 'cb:camera:change'
 * Hinweis : Kein Eingriff in deine Render-Loop. Placement liest window.__CAM.
 * ========================================================================== */
(function () {
  'use strict';
  const cvs = document.getElementById('game');
  if (!cvs) { console.warn('[camera] #game fehlt'); return; }

  // Kleines, lokales emit – vermeidet ReferenceError
  const emit = (name, detail={}) =>
    window.dispatchEvent(new CustomEvent(name, { detail }));

  const log = (m,...a)=> (window.CBLog?.info||console.info)('[camera]', m, ...a);
  const cam = window.__CAM = window.__CAM || { x: 0, y: 0, scale: 1 };
  let dragging = false, last = { x:0, y:0 }, pinch = null;

  function apply() {
    cvs.style.transformOrigin = '0 0';
    cvs.style.transform = `translate(${cam.x}px, ${cam.y}px) scale(${cam.scale})`;
    emit('cb:camera:change', { ...cam });
    try { window.Game?.setCamera?.(cam); } catch {}
  }

  // Wheel-Zoom (zur Mausposition)
  cvs.addEventListener('wheel', (e) => {
    e.preventDefault();
    const factor = (e.deltaY < 0) ? 1.1 : 0.9;
    const rect = cvs.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    const newScale = Math.max(0.25, Math.min(4, cam.scale * factor));
    const s = newScale / cam.scale;
    cam.x = mx - (mx - cam.x) * s;
    cam.y = my - (my - cam.y) * s;
    cam.scale = newScale;
    apply();
  }, { passive: false });

  // Drag-Pan
  cvs.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    dragging = true;
    last.x = e.clientX; last.y = e.clientY;
    cvs.setPointerCapture(e.pointerId);
  });
  cvs.addEventListener('pointermove', (e) => {
    if (!dragging || pinch) return;
    const dx = e.clientX - last.x, dy = e.clientY - last.y;
    last.x = e.clientX; last.y = e.clientY;
    cam.x += dx; cam.y += dy;
    apply();
  });
  cvs.addEventListener('pointerup', () => { dragging = false; });

  // Pinch (Touch)
  cvs.addEventListener('touchstart', (e) => {
    if (e.touches.length === 2) {
      const [a,b] = e.touches;
      pinch = {
        startDist: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY),
        startScale: cam.scale,
        cx: (a.clientX + b.clientX)/2,
        cy: (a.clientY + b.clientY)/2,
      };
    }
  }, { passive: true });
  cvs.addEventListener('touchmove', (e) => {
    if (!pinch || e.touches.length !== 2) return;
    const [a,b] = e.touches;
    const dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
    const newScale = Math.max(0.25, Math.min(4, pinch.startScale * (dist / pinch.startDist)));
    const rect = cvs.getBoundingClientRect();
    const mx = pinch.cx - rect.left, my = pinch.cy - rect.top;
    const s = newScale / cam.scale;
    cam.x = mx - (mx - cam.x) * s;
    cam.y = my - (my - cam.y) * s;
    cam.scale = newScale;
    apply();
  }, { passive: true });
  cvs.addEventListener('touchend', () => { pinch = null; }, { passive: true });

  apply();
  (window.CBLog?.ok||console.log)('✅ [camera] bereit');
})();
