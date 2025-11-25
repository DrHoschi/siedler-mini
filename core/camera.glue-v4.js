/* ============================================================================
 * Datei    : core/camera.glue.js
 * Version  : v25.11.15-final3
 * Zweck    : Verknüpft Pointer-Eingaben (Pan/Pinch) mit der Kamera (__CAM)
 *
 * Steuerung:
 *   - 1 Finger  → Pan (Karte verschieben)
 *   - 2 Finger  → Pinch-Zoom (rein/raus)
 *
 * Verhalten:
 *   - Einfacher Tap macht NICHTS (kein Sprung).
 *   - Pinch startet erst, wenn sich die Finger spürbar bewegt haben.
 *   - Zoom wird INKREMENTELL berechnet (kein großer Sprung beim ersten Move).
 *   - Zoom wird hart begrenzt (MIN/MAX).
 *   - NEU: Wenn window.__SIEDLER_PLACE_ACTIVE === true (Platziermodus),
 *          dann ignoriert die Kamera alle Pointer-Events (kein Pan/Zoom-Sprung).
 *
 * Sendet:
 *   - cb:camera-change { x, y, zoom }
 * ========================================================================== */
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

  // Zoom-Grenzen (kannst du bei Bedarf anpassen)
  const ZOOM_MIN = 0.4;
  const ZOOM_MAX = 4.0;

  // Empfindlichkeit
  const PINCH_MIN_DELTA_START = 10; // minimale Distanzänderung ab Pinch-Start
  const PINCH_MIN_DELTA_STEP  = 2;  // minimale Änderung pro Schritt
  const PINCH_MAX_FACTOR_STEP = 1.25; // maximaler Zoom-Faktor pro Event (Sicherheitsbremse)

  const state = {
    mode: 'idle',        // 'idle' | 'pan' | 'pinch'
    pointers: new Map(), // pointerId → {x,y}
    panStartX: 0,
    panStartY: 0,
    camStartX: 0,
    camStartY: 0,
    pinchStartDist: 0,
    pinchLastDist: 0
  };

  // Hilfsfunktion: Prüfen, ob wir gerade im Platziermodus sind.
  // Dieses Flag wird von core/core.input.js gesetzt:
  //   window.__SIEDLER_PLACE_ACTIVE = true/false
  function isPlacingBuilding() {
    return !!window.__SIEDLER_PLACE_ACTIVE;
  }

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

    // Während eines aktiven Platziermodus ignoriert die Kamera den Pointer komplett.
    if (isPlacingBuilding()) {
      return;
    }

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
      // Noch kein emit – erst bei Bewegung
    } else if (count === 2) {
      // Pinch-Start – Grundwerte setzen
      const pts = getPointersArray();
      state.mode = 'pinch';
      state.pinchStartDist = dist(pts[0], pts[1]);
      state.pinchLastDist  = state.pinchStartDist;
    } else {
      // Mehr als 2 Finger → ignorieren, bis wieder <=2
      state.mode = 'idle';
    }
  });

  canvas.addEventListener('pointermove', (ev) => {
    if (!state.pointers.has(ev.pointerId)) return;

    // Platziermodus aktiv → Kamera bewegt sich nicht.
    if (isPlacingBuilding()) {
      return;
    }

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

      // 1) Ganz am Anfang: erst zoomen, wenn sich Distanz spürbar geändert hat
      if (Math.abs(dNow - state.pinchStartDist) < PINCH_MIN_DELTA_START) {
        return;
      }

      // 2) Pro Schritt: nur kleine Differenzen zulassen
      const stepDelta = dNow - state.pinchLastDist;
      if (Math.abs(stepDelta) < PINCH_MIN_DELTA_STEP) {
        return;
      }

      if (state.pinchLastDist <= 0) {
        state.pinchLastDist = dNow;
        return;
      }

      // Faktor nur relativ zum letzten Abstand berechnen (inkrementell)
      let factor = dNow / state.pinchLastDist;

      // Sicherheitsbremse: Faktor pro Event begrenzen
      if (factor > PINCH_MAX_FACTOR_STEP) factor = PINCH_MAX_FACTOR_STEP;
      if (factor < 1 / PINCH_MAX_FACTOR_STEP) factor = 1 / PINCH_MAX_FACTOR_STEP;

      let targetZoom = CAM.zoom * factor;

      // Zoom begrenzen
      if (!isFinite(targetZoom)) return;
      if (targetZoom < ZOOM_MIN) targetZoom = ZOOM_MIN;
      if (targetZoom > ZOOM_MAX) targetZoom = ZOOM_MAX;

      CAM.zoom = targetZoom;
      state.pinchLastDist = dNow; // neuen Abstand merken
      emitCameraChange();
    }
  });

  function handlePointerEnd(ev){
    if (!state.pointers.has(ev.pointerId)) return;

    // Wenn während Platziermodus Pointer enden, wollen wir NUR den internen
    // Pointer-State aufräumen, aber KEINE Kamera-Aktion auslösen.
    if (isPlacingBuilding()) {
      state.pointers.delete(ev.pointerId);
      if (!pointerCount()) {
        state.mode = 'idle';
      }
      return;
    }

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
      state.pinchLastDist  = state.pinchStartDist;
    }
  }

  canvas.addEventListener('pointerup', handlePointerEnd);
  canvas.addEventListener('pointercancel', handlePointerEnd);
  canvas.addEventListener('pointerout', handlePointerEnd);
  canvas.addEventListener('pointerleave', handlePointerEnd);

  console.info(TAG, 'bereit (Pan + Pinch ohne Sprung, Platziermodus blockiert Kamera)');
})();
