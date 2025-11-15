/* ============================================================================
 * Datei    : core/camera.glue.js
 * Version  : v25.11.15-final1
 * Zweck    : Verknüpft Pointer-Eingaben (Pan/Pinch) mit der Kamera (__CAM)
 *
 * Steuert:
 *   - 1 Finger  → Pan (Karte verschieben)
 *   - 2 Finger  → Pinch-Zoom (rein/raus)
 *
 * Verhalten:
 *   - Einfacher Tap macht NICHTS (kein Sprung).
 *   - Pinch startet erst, wenn sich die Finger spürbar bewegt haben.
 *   - Zoom wird hart begrenzt (MIN/MAX) und ohne Sprünge geändert.
 *
 * Sendet:
 *   - cb:camera-change { x, y, zoom }
 * ========================================================================= */
(function(){
  'use strict';
  const TAG = '[cam-glue]';

  const canvas = document.getElementById('game');
  if (!canvas) { console.warn(TAG, 'kein #game Canvas gefunden'); return; }

  if (!window.__CAM) {
    console.warn(TAG, '__CAM fehlt – Camera-Glue deaktiviert');
    return;
  }
  const CAM = window.__CAM;

  // Default-Werte absichern
  if (typeof CAM.x !== 'number') CAM.x = 0;
  if (typeof CAM.y !== 'number') CAM.y = 0;
  if (typeof CAM.zoom !== 'number') CAM.zoom = 1;

  const ZOOM_MIN = 0.4;
  const ZOOM_MAX = 4.0;
  const PINCH_MIN_DELTA = 10;  // minimale Fingerbewegung, bevor Zoom reagiert

  const state = {
    mode: 'idle',      // 'idle' | 'pan' | 'pinch'
    pointers: new Map(), // pointerId → {x,y}
    panStartX: 0,
    panStartY: 0,
    camStartX: 0,
    camStartY: 0,
    pinchStartDist: 0,
    pinchStartZoom: 1
  };

  function emitCameraChange() {
    window.dispatchEvent(new CustomEvent('cb:camera-change', {
      detail: { x: CAM.x, y: CAM.y, zoom: CAM.zoom }
    }));
  }

  function pointerCount() {
    return state.pointers.size;
  }

  function getPointersArray() {
    return Array.from(state.pointers.values());
  }

  function dist(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx*dx + dy*dy);
  }

  /* --------------------------- Pointer-Events ------------------------------ */

  canvas.addEventListener('pointerdown', (ev) => {
    if (ev.button !== 0) return; // nur primärer Finger
    canvas.setPointerCapture(ev.pointerId);
    state.pointers.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });

    const count = pointerCount();

    if (count === 1) {
      // Pan-Start
      state.mode = 'pan';
      state.panStartX = ev.clientX;
      state.panStartY = ev.clientY;
      state.camStartX = CAM.x;
      state.camStartY = CAM.y;
      // => Noch kein emit – erst bei Bewegung
    } else if (count === 2) {
      // Pinch-Start
      const pts = getPointersArray();
      state.mode = 'pinch';
      state.pinchStartDist = dist(pts[0], pts[1]);
      state.pinchStartZoom = CAM.zoom;
      // Auch hier: erst reagieren, wenn sich Distanz deutlich geändert hat
    } else {
      // Mehr als 2 Finger → ignorieren, bis wieder <=2
      state.mode = 'idle';
    }
  });

  canvas.addEventListener('pointermove', (ev) => {
    if (!state.pointers.has(ev.pointerId)) return;
    state.pointers.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });

    const count = pointerCount();

    if (state.mode === 'pan' && count === 1) {
      // Pan: Karte verschieben
      const dx = (ev.clientX - state.panStartX) / CAM.zoom;
      const dy = (ev.clientY - state.panStartY) / CAM.zoom;
      CAM.x = state.camStartX - dx;
      CAM.y = state.camStartY - dy;
      emitCameraChange();
    } else if (state.mode === 'pinch' && count >= 2) {
      const pts = getPointersArray();
      const dNow = dist(pts[0], pts[1]);

      // Wenn Finger noch fast an der gleichen Stelle sind → kein Zoom (verhindert Sprung)
      if (Math.abs(dNow - state.pinchStartDist) < PINCH_MIN_DELTA) {
        return;
      }

      if (state.pinchStartDist <= 0) return;
      const factor = dNow / state.pinchStartDist;
      let targetZoom = state.pinchStartZoom * factor;

      // Zoom begrenzen
      if (!isFinite(targetZoom)) return;
      if (targetZoom < ZOOM_MIN) targetZoom = ZOOM_MIN;
      if (targetZoom > ZOOM_MAX) targetZoom = ZOOM_MAX;

      CAM.zoom = targetZoom;
      emitCameraChange();
    }
  });

  function handlePointerEnd(ev){
    if (!state.pointers.has(ev.pointerId)) return;
    state.pointers.delete(ev.pointerId);

    const count = pointerCount();
    if (count === 0) {
      state.mode = 'idle';
    } else if (count === 1) {
      // Von Pinch zurück auf Pan wechseln
      const [only] = getPointersArray();
      state.mode = 'pan';
      state.panStartX = only.x;
      state.panStartY = only.y;
      state.camStartX = CAM.x;
      state.camStartY = CAM.y;
    } else if (count >= 2) {
      // Pinch mit neuen beiden Fingern weiterführen
      const pts = getPointersArray();
      state.mode = 'pinch';
      state.pinchStartDist = dist(pts[0], pts[1]);
      state.pinchStartZoom = CAM.zoom;
    }
  }

  canvas.addEventListener('pointerup', handlePointerEnd);
  canvas.addEventListener('pointercancel', handlePointerEnd);
  canvas.addEventListener('pointerout', handlePointerEnd);
  canvas.addEventListener('pointerleave', handlePointerEnd);

  console.info(TAG, 'bereit (Pan + Pinch ohne Sprünge)');
})();
