/* assets/core/camera.js  v17.9.2
 * Kamera-Control für Map-Canvas
 * - Panning (Drag)
 * - Zoom um Fokuspunkt (Wheel + Pinch)
 * - Kapselt Eingaben nur auf dem Map-Canvas
 * - Meldet Änderungen an Render.setCameraState(...)
 */
(() => {
  'use strict';

  const TAG = '[camera]';
  const log = (...a) => (window.CBLog?.info || console.log)(TAG, ...a);

  // --- State --------------------------------------------------------------
  const camera = {
    x: 0,          // Welt-Offset (links/rechts)
    y: 0,          // Welt-Offset (hoch/runter)
    scale: 1,      // Zoomfaktor (1 = 100%)
    min: 0.25,
    max: 4,
    canvas: null,
    dragging: false,
    lastX: 0, lastY: 0,
    pinch: { active: false, startDist: 0, startScale: 1, cx: 0, cy: 0 }
  };

  // Helfer: clamp
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  // Renderer informieren (und Event feuern)
  function flush() {
    window.Render?.setCameraState?.({ x: camera.x, y: camera.y, zoom: camera.scale });
    window.dispatchEvent(new CustomEvent('cb:camera-change', { detail: { x: camera.x, y: camera.y, scale: camera.scale }}));
  }

  // Weltkoordinate <-> Screen
  function screenToWorld(sx, sy) {
    // Koordinaten relativ zum Canvas
    const rect = camera.canvas.getBoundingClientRect();
    const px = sx - rect.left;
    const py = sy - rect.top;
    // In Weltkoordinate umrechnen: erst verschiebung rückgängig, dann Skalierung
    return {
      x: (px / camera.scale) + camera.x,
      y: (py / camera.scale) + camera.y,
    };
  }

  // Fokus-Zoom: halte Weltpunkt unter (sx,sy) stabil
  function zoomAt(factor, sx, sy) {
    const oldScale = camera.scale;
    const newScale = clamp(oldScale * factor, camera.min, camera.max);
    if (newScale === oldScale) return;

    // Weltpunkt unter Cursor vor dem Zoom:
    const w0 = screenToWorld(sx, sy);

    camera.scale = newScale;

    // Nach dem Zoom: gleiche Bildschirmposition muss wieder auf w0 zeigen
    const rect = camera.canvas.getBoundingClientRect();
    const px = sx - rect.left;
    const py = sy - rect.top;

    // Solve: px = (w0.x - camera.x) * scale  -> camera.x = w0.x - px/scale
    camera.x = w0.x - (px / camera.scale);
    camera.y = w0.y - (py / camera.scale);

    flush();
  }

  // --- Pointer (Panning) --------------------------------------------------
  function onPointerDown(e) {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    camera.dragging = true;
    camera.lastX = e.clientX;
    camera.lastY = e.clientY;
    camera.canvas.setPointerCapture?.(e.pointerId);
  }
  function onPointerMove(e) {
    if (!camera.dragging || camera.pinch.active) return;
    const dx = (e.clientX - camera.lastX) / camera.scale;
    const dy = (e.clientY - camera.lastY) / camera.scale;
    camera.lastX = e.clientX;
    camera.lastY = e.clientY;
    camera.x -= dx;
    camera.y -= dy;
    flush();
  }
  function onPointerUp(e) {
    camera.dragging = false;
    camera.canvas.releasePointerCapture?.(e.pointerId);
  }

  // --- Wheel-Zoom ---------------------------------------------------------
  function onWheel(e) {
    // Nur über dem Canvas zoomen
    if (e.target !== camera.canvas) return;
    e.preventDefault();
    const step = -Math.sign(e.deltaY); // up = rein
    const factor = step > 0 ? 1.1 : 1/1.1;
    zoomAt(factor, e.clientX, e.clientY);
  }

  // --- Touch / Pinch-Zoom -------------------------------------------------
  function dist(a, b) {
    const dx = a.clientX - b.clientX;
    const dy = a.clientY - b.clientY;
    return Math.hypot(dx, dy);
  }
  function center(a, b) {
    return { x: (a.clientX + b.clientX)/2, y: (a.clientY + b.clientY)/2 };
  }
  function onTouchStart(e) {
    if (e.touches.length === 2) {
      e.preventDefault();
      camera.pinch.active = true;
      camera.pinch.startDist = dist(e.touches[0], e.touches[1]);
      camera.pinch.startScale = camera.scale;
      const c = center(e.touches[0], e.touches[1]);
      camera.pinch.cx = c.x;
      camera.pinch.cy = c.y;
    }
  }
  function onTouchMove(e) {
    if (camera.pinch.active && e.touches.length === 2) {
      e.preventDefault();
      const d = dist(e.touches[0], e.touches[1]);
      const factor = d / (camera.pinch.startDist || d);
      // Zoom um den initialen Pinch-Mittelpunkt
      const targetScale = clamp(camera.pinch.startScale * factor, camera.min, camera.max);
      const f = targetScale / camera.scale; // relativer Faktor von aktueller zu Zielskala
      zoomAt(f, camera.pinch.cx, camera.pinch.cy);
    }
  }
  function onTouchEnd(e) {
    if (e.touches.length < 2) {
      camera.pinch.active = false;
    }
  }

  // --- API ----------------------------------------------------------------
  function bind(canvas) {
    if (!canvas) return log('kein Canvas zum Binden gefunden');
    camera.canvas = canvas;

    // nur auf dem Canvas Interaktionen erlauben
    canvas.style.touchAction = 'none';

    // Pointer (Panning)
    canvas.addEventListener('pointerdown', onPointerDown, { passive: false });
    window.addEventListener('pointermove', onPointerMove, { passive: false });
    window.addEventListener('pointerup',   onPointerUp,   { passive: true  });
    window.addEventListener('pointercancel', onPointerUp, { passive: true  });

    // Wheel-Zoom
    canvas.addEventListener('wheel', onWheel, { passive: false });

    // Pinch-Zoom
    canvas.addEventListener('touchstart', onTouchStart, { passive: false });
    canvas.addEventListener('touchmove',  onTouchMove,  { passive: false });
    canvas.addEventListener('touchend',   onTouchEnd,   { passive: true  });
    canvas.addEventListener('touchcancel',onTouchEnd,   { passive: true  });

    log('bereit');
    flush(); // initialen Zustand pushen
  }

  function set(x, y, scale) {
    if (typeof x === 'number') camera.x = x;
    if (typeof y === 'number') camera.y = y;
    if (typeof scale === 'number') camera.scale = clamp(scale, camera.min, camera.max);
    flush();
  }

  // Expose
  window.GameCamera = {
    ...camera,
    bind,
    set,
    toWorld: screenToWorld
  };
})();
