/* assets/core/camera.js  v17.9.2
 * Eingabe-Kamera für Map-Canvas (Pan + Zoom, Maus & Touch)
 * - bindet sich automatisch an <canvas id="game">
 * - verhindert Browser-Scroll/Zoom (passive:false)
 * - publiziert State in window.GameCamera
 * - informiert Renderer via Render.setCameraState(...) UND Event cb:camera-change
 */
(() => {
  'use strict';

  const TAG = '[camera]';
  const log  = (...a) => console.log(TAG, ...a);
  const warn = (...a) => console.warn(TAG, ...a);

  // --- State --------------------------------------------------------------
  const state = {
    x: 0,         // Welt-Offset links
    y: 0,         // Welt-Offset oben
    scale: 1.0,   // Zoom-Faktor (1 = 100 %)
    min: 0.5,
    max: 3.0
  };

  let canvas = null;
  let dragging = false;
  let last = { x: 0, y: 0 };

  // Pinch
  let pinchActive = false;
  let pinchStartDist = 0;
  let pinchStartScale = 1;

  // Hilfen ---------------------------------------------------------------
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  function getCanvas() {
    return (
      document.getElementById('game') ||
      document.getElementById('map')  ||
      document.querySelector('canvas[data-role="map"]') ||
      document.querySelector('canvas')
    );
  }

  function publish() {
    // 1) globaler Zugriff
    window.GameCamera = Object.assign({}, state, { canvas });
    // 2) Renderer direkt füttern
    try { window.Render?.setCameraState?.({ x: state.x, y: state.y, zoom: state.scale }); } catch {}
    // 3) Event (falls jemand zuhören will)
    try {
      window.dispatchEvent(new CustomEvent('cb:camera-change', { detail: { x: state.x, y: state.y, zoom: state.scale }}));
    } catch {}
  }

  // Umrechnung: Seitendelta -> Weltkoordinate (zoomsensitiv)
  function wheelZoom(delta, cx, cy) {
    const old = state.scale;
    const factor = Math.pow(1.001, -delta); // smoother als 1.1 steps
    const next = clamp(old * factor, state.min, state.max);

    if (next === old) return;

    // Zoom auf Punkt (cx,cy) im Canvas: Welt so verschieben, dass der Punkt „klebt“
    const rect = canvas.getBoundingClientRect();
    const px = (cx - rect.left);
    const py = (cy - rect.top);

    // Weltkoord vorher/nachher
    const wx0 = state.x + px / old;
    const wy0 = state.y + py / old;

    state.scale = next;

    const wx1 = state.x + px / next;
    const wy1 = state.y + py / next;

    state.x += (wx0 - wx1);
    state.y += (wy0 - wy1);

    publish();
  }

  function startDrag(clientX, clientY) {
    dragging = true;
    last.x = clientX;
    last.y = clientY;
  }

  function moveDrag(clientX, clientY) {
    if (!dragging) return;
    const dx = (clientX - last.x) / state.scale;
    const dy = (clientY - last.y) / state.scale;
    state.x -= dx;
    state.y -= dy;
    last.x = clientX;
    last.y = clientY;
    publish();
  }

  function endDrag() { dragging = false; }

  // Pinch (2 Finger)
  function dist2(a, b) {
    const dx = a.clientX - b.clientX;
    const dy = a.clientY - b.clientY;
    return Math.hypot(dx, dy);
  }

  // --- Binding ------------------------------------------------------------
  function bind(targetCanvas) {
    canvas = targetCanvas || getCanvas();
    if (!canvas) { warn('Kein Canvas gefunden – keine Kamera gebunden.'); return; }

    // Maus
    canvas.addEventListener('mousedown', (e) => {
      e.preventDefault();
      startDrag(e.clientX, e.clientY);
    }, { passive: false });

    window.addEventListener('mousemove', (e) => {
      if (!dragging) return;
      e.preventDefault();
      moveDrag(e.clientX, e.clientY);
    }, { passive: false });

    window.addEventListener('mouseup', (e) => {
      if (!dragging) return;
      e.preventDefault();
      endDrag();
    }, { passive: false });

    // Wheel-Zoom
    canvas.addEventListener('wheel', (e) => {
      e.preventDefault(); // wichtig gegen Browser-Scroll/Zoom
      wheelZoom(e.deltaY, e.clientX, e.clientY);
    }, { passive: false });

    // Touch / Pointer
    canvas.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        startDrag(e.touches[0].clientX, e.touches[0].clientY);
      } else if (e.touches.length === 2) {
        pinchActive = true;
        pinchStartDist = dist2(e.touches[0], e.touches[1]);
        pinchStartScale = state.scale;
      }
      e.preventDefault();
    }, { passive: false });

    canvas.addEventListener('touchmove', (e) => {
      if (pinchActive && e.touches.length === 2) {
        const d = dist2(e.touches[0], e.touches[1]);
        const factor = d / (pinchStartDist || d);
        state.scale = clamp(pinchStartScale * factor, state.min, state.max);
        publish();
      } else if (e.touches.length === 1) {
        moveDrag(e.touches[0].clientX, e.touches[0].clientY);
      }
      e.preventDefault();
    }, { passive: false });

    window.addEventListener('touchend', (e) => {
      if (e.touches.length < 2) pinchActive = false;
      if (e.touches.length === 0) endDrag();
    }, { passive: false });

    // Initial publish (Renderer bekommt Startwerte)
    publish();
    log('bereit');
  }

  // Public API
  window.GameCamera = Object.assign({}, state, { bind });

  // Auto-bind, sobald DOM steht
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => bind());
  } else {
    bind();
  }
})();
