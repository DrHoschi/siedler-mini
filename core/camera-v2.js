/* ============================================================================
 * Datei   : core/camera.js
 * Projekt : Neue Siedler
 * Version : v25.11.15-final2
 * Zweck   : Zentrale Kamera (Pan & Zoom, Desktop + Touch) + Events cb:camera-change
 *
 * API     : window.GameCamera.{ x,y,zoom, bind(canvas), setState({...}) }
 * Emits   : cb:camera-change { x, y, zoom } nach JEDEM Update
 * Hinweis : Canvas (#game) braucht touch-action:none (setzen wir hier)
 *
 * Ergänzungen:
 *  - Blockiert Pan/Zoom, wenn window.__SIEDLER_PLACE_ACTIVE === true
 *    (Platziermodus aktiv → Ghost, aber Kamera bleibt ruhig).
 *  - Verhindert doppeltes Pan (Mouse + Pointer) auf modernen Browsern.
 *  - Pinch-Zoom ist abgefedert (keine riesigen Sprünge beim ersten Move).
 * ========================================================================== */
(() => {
  'use strict';

  const TAG   = '[camera]';
  const LOG   = (...a)=>(window.CBLog?.info ?? console.info)(TAG, ...a);

  // ------------------------------ Konstanten --------------------------------
  const ZOOM_MIN = 0.5;
  const ZOOM_MAX = 3.0;
  const ZOOM_FAC = 1.1;   // Wheel-Faktor (Desktop-Zoom)
  const PAN_DAMP = 1.0;   // 1.0 = 1:1

  // Pinch-Filter gegen "Zoom-Sprung"
  const PINCH_MIN_DELTA_START = 10;   // minimale Distanzänderung ab Pinch-Start
  const PINCH_MIN_DELTA_STEP  = 2;    // minimale Änderung pro Schritt
  const PINCH_MAX_FACTOR_STEP = 1.25; // maximaler Zoom-Faktor pro Event

  const HAS_POINTER = 'PointerEvent' in window;

  // ------------------------------ State -------------------------------------
  let canvas = null;
  const cam  = { x:0, y:0, zoom:1 };

  let dragging = false;
  let dragStart = { x:0, y:0 };
  let camStart  = { x:0, y:0 };

  const touches = new Map(); // pointerId -> {x,y}
  let pinchStart = null;     // { dist, center:{x,y}, zoom }
  let pinchLastDist = 0;     // letzte Distanz (für inkrementelles Scaling)

  // ------------------------------ Utils -------------------------------------
  const clamp = (v, lo, hi)=> Math.max(lo, Math.min(hi, v));
  const rect  = el => el?.getBoundingClientRect?.() ?? { left:0, top:0, width:el?.width||0, height:el?.height||0 };

  function toCanvasXY(clientX, clientY){
    const r = rect(canvas);
    return { x: clientX - r.left, y: clientY - r.top };
  }
  function toWorld({x,y}){
    return { x: (x/cam.zoom) + cam.x, y: (y/cam.zoom) + cam.y };
  }

  function publish(){
    try { window.Render?.setCameraState?.({ ...cam }); } catch {}
    window.dispatchEvent(new CustomEvent('cb:camera-change', { detail:{ ...cam }}));
  }

  function anchorZoom(newZoom, anchorCanvasXY){
    const worldBefore = toWorld(anchorCanvasXY);
    cam.zoom = clamp(newZoom, ZOOM_MIN, ZOOM_MAX);
    cam.x = worldBefore.x - (anchorCanvasXY.x / cam.zoom);
    cam.y = worldBefore.y - (anchorCanvasXY.y / cam.zoom);
    publish();
  }

  // Platziermodus-Check: true = während Gebäudebau → Kamera ignoriert Eingaben
  function isPlacingBuilding(){
    return !!window.__SIEDLER_PLACE_ACTIVE;
  }

  // ------------------------------ Maus/Wheel --------------------------------
  function onWheel(e){
    if (!canvas || e.target !== canvas) return;
    if (isPlacingBuilding()) return; // während Platzieren kein Zoom
    e.preventDefault();
    const pt = toCanvasXY(e.clientX, e.clientY);
    const dir = Math.sign(e.deltaY);
    const factor = dir > 0 ? (1/ZOOM_FAC) : ZOOM_FAC;
    anchorZoom(cam.zoom * factor, pt);
  }

  function onMouseDown(e){
    if (e.button !== 0) return;
    if (isPlacingBuilding()) return; // Platziermodus blockiert Pan
    dragging = true;
    dragStart = toCanvasXY(e.clientX, e.clientY);
    camStart  = { ...cam };
  }
  function onMouseMove(e){
    if (!dragging) return;
    if (isPlacingBuilding()) return; // Sicherheit
    const pt = toCanvasXY(e.clientX, e.clientY);
    const dx = (pt.x - dragStart.x) / cam.zoom / PAN_DAMP;
    const dy = (pt.y - dragStart.y) / cam.zoom / PAN_DAMP;
    cam.x = camStart.x - dx;
    cam.y = camStart.y - dy;
    publish();
  }
  function onMouseUp(){
    dragging = false;
  }

  // ------------------------------ Pointer/Touch ------------------------------
  function onPointerDown(e){
    if (!canvas) return;
    if (isPlacingBuilding()) return; // während Platzieren kein Pan/Pinch
    canvas.setPointerCapture?.(e.pointerId);
    const pt = toCanvasXY(e.clientX, e.clientY);
    touches.set(e.pointerId, pt);

    if (touches.size === 1){
      // Pan-Start
      dragging  = true;
      dragStart = pt;
      camStart  = { ...cam };
      pinchStart = null;
      pinchLastDist = 0;
    } else if (touches.size === 2){
      // Pinch-Start
      const [a,b] = [...touches.values()];
      pinchStart = {
        dist: Math.hypot(b.x-a.x, b.y-a.y),
        center: { x:(a.x+b.x)/2, y:(a.y+b.y)/2 },
        zoom: cam.zoom
      };
      pinchLastDist = pinchStart.dist;
      dragging = false;
    } else {
      // mehr als 2 Finger → ignorieren
      pinchStart = null;
      pinchLastDist = 0;
      dragging = false;
    }
  }

  function onPointerMove(e){
    if (!touches.has(e.pointerId)) return;
    if (isPlacingBuilding()) return; // keine Kamerabewegung während Platzieren

    const pt = toCanvasXY(e.clientX, e.clientY);
    touches.set(e.pointerId, pt);

    if (touches.size === 1 && dragging){
      // Pan
      const dx = (pt.x - dragStart.x) / cam.zoom / PAN_DAMP;
      const dy = (pt.y - dragStart.y) / cam.zoom / PAN_DAMP;
      cam.x = camStart.x - dx;
      cam.y = camStart.y - dy;
      publish();
    } else if (touches.size === 2 && pinchStart){
      // Pinch-Zoom abgefedert
      const [a,b] = [...touches.values()];
      const dist = Math.hypot(b.x-a.x, b.y-a.y) || 1;

      // 1) Erst zoomen, wenn sich der Abstand spürbar von pinchStart.dist unterscheidet
      if (Math.abs(dist - pinchStart.dist) < PINCH_MIN_DELTA_START){
        return;
      }

      // 2) Pro Schritt nur Zoom, wenn sich seit letztem Schritt genug getan hat
      const stepDelta = dist - pinchLastDist;
      if (Math.abs(stepDelta) < PINCH_MIN_DELTA_STEP){
        return;
      }

      // 3) Faktor nur relativ zur letzten Distanz
      let factor = dist / (pinchLastDist || pinchStart.dist || 1);

      // 4) Faktor pro Event begrenzen (gegen harte Sprünge)
      if (factor > PINCH_MAX_FACTOR_STEP) factor = PINCH_MAX_FACTOR_STEP;
      if (factor < 1 / PINCH_MAX_FACTOR_STEP) factor = 1 / PINCH_MAX_FACTOR_STEP;

      const targetZoom = cam.zoom * factor;
      anchorZoom(targetZoom, pinchStart.center);

      pinchLastDist = dist;
    }
  }

  function onPointerUp(e){
    touches.delete(e.pointerId);

    if (touches.size < 2){
      pinchStart = null;
      pinchLastDist = 0;
    }
    if (touches.size === 0){
      dragging = false;
    } else if (touches.size === 1){
      // von Pinch zurück zu Pan
      const [only] = [...touches.values()];
      dragging = true;
      dragStart = only;
      camStart  = { ...cam };
    }
  }

  // ------------------------------ Init/Bind ---------------------------------
  function addListeners(){
    // Wheel-Zoom immer (auch mit Pointer), aber geblockt bei Platziermodus
    canvas.addEventListener('wheel', onWheel, { passive:false });

    // Auf modernen Browsern mit PointerEvent:
    // → Pan/Pinch NUR über Pointer-Events (kein doppeltes Mouse-Pan)
    if (!HAS_POINTER){
      canvas.addEventListener('mousedown', onMouseDown);
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    }

    if (HAS_POINTER){
      canvas.addEventListener('pointerdown', onPointerDown);
      canvas.addEventListener('pointermove', onPointerMove);
      canvas.addEventListener('pointerup', onPointerUp);
      canvas.addEventListener('pointercancel', onPointerUp);
      canvas.addEventListener('pointerleave', onPointerUp);
    }
  }

  function bind(target){
    if (!target) return;
    if (canvas === target) { publish(); return; }
    canvas = target;
    try { canvas.style.touchAction = 'none'; } catch {}
    addListeners();
    LOG('bereit (v25.11.15-final2, Platzier-Block + sanfter Pinch)');
    publish();
  }

  function init(){
    const auto = document.getElementById('game')
             ||  document.querySelector('canvas[data-role="map"]')
             ||  document.querySelector('canvas');
    if (auto) bind(auto);
  }

  // Auto-Bind
  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init, { once:true });
  } else {
    init();
  }

  // Export
  window.GameCamera = {
    bind,
    get x(){ return cam.x; }, get y(){ return cam.y; }, get zoom(){ return cam.zoom; },
    set zoom(v){
      anchorZoom(
        Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, v)),
        { x:0, y:0 }
      );
    },
    setState({x,y,zoom} = {}){
      if (typeof x === 'number') cam.x = x;
      if (typeof y === 'number') cam.y = y;
      if (typeof zoom === 'number') cam.zoom = clamp(zoom, ZOOM_MIN, ZOOM_MAX);
      publish();
    }
  };
})();
