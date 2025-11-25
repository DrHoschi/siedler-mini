/* ============================================================================
 * Datei   : core/camera.js
 * Projekt : Neue Siedler
 * Version : v25.11.15-final2
 * Zweck   : Zentrale Kamera (Pan & Zoom, Desktop + Touch) + Events cb:camera-change
 *
 * API     : window.GameCamera.{ x,y,zoom, bind(canvas), setState({...}) }
 * Emits   : cb:camera-change { x, y, zoom } nach JEDEM Update
 * Hinweis : Canvas (#game) braucht touch-action:none (setzen wir hier)
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

  // Pinch-Tuning (gegen Zoom-Sprünge)
  const PINCH_MIN_DELTA_START = 10;   // minimale Distanzänderung ab Pinch-Start
  const PINCH_MIN_DELTA_STEP  = 2;    // minimale Änderung pro Schritt
  const PINCH_MAX_FACTOR_STEP = 1.25; // maximaler Zoom-Faktor pro Event

  // ------------------------------ State -------------------------------------
  let canvas = null;
  const cam  = { x:0, y:0, zoom:1 };

  let dragging = false;
  let dragStart = { x:0, y:0 };
  let camStart  = { x:0, y:0 };

  const touches = new Map(); // pointerId -> {x,y}
  // pinchState: { startDist, lastDist, center:{x,y}, startZoom }
  let pinchState = null;

  // ------------------------------ Utils -------------------------------------
  const clamp = (v, lo, hi)=> Math.max(lo, Math.min(hi, v));
  const rect  = el => el?.getBoundingClientRect?.() ?? { left:0, top:0, width:el?.width||0, height:el?.height||0 };

  function toCanvasXY(clientX, clientY){
    const r = rect(canvas);
    return { x: clientX - r.left, y: clientY - r.top };
  }
  function toWorld({x,y}){ return { x: (x/cam.zoom) + cam.x, y: (y/cam.zoom) + cam.y }; }

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

  // ------------------------------ Maus/Wheel --------------------------------
  function onWheel(e){
    if (!canvas || e.target !== canvas) return;
    e.preventDefault();
    const pt = toCanvasXY(e.clientX, e.clientY);
    const dir = Math.sign(e.deltaY);
    const factor = dir > 0 ? (1/ZOOM_FAC) : ZOOM_FAC;
    anchorZoom(cam.zoom * factor, pt);
  }

  function onMouseDown(e){
    if (e.button !== 0) return;
    dragging = true;
    dragStart = toCanvasXY(e.clientX, e.clientY);
    camStart  = { ...cam };
  }
  function onMouseMove(e){
    if (!dragging) return;
    const pt = toCanvasXY(e.clientX, e.clientY);
    const dx = (pt.x - dragStart.x) / cam.zoom / PAN_DAMP;
    const dy = (pt.y - dragStart.y) / cam.zoom / PAN_DAMP;
    cam.x = camStart.x - dx;
    cam.y = camStart.y - dy;
    publish();
  }
  function onMouseUp(){ dragging = false; }

  // ------------------------------ Pointer/Touch ------------------------------
  function updatePinchStateFromTouches(){
    if (touches.size < 2){
      pinchState = null;
      return;
    }
    const vals = [...touches.values()];
    const a = vals[0], b = vals[1];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const dist = Math.hypot(dx, dy);
    const center = { x:(a.x+b.x)/2, y:(a.y+b.y)/2 };

    if (!pinchState){
      // Pinch beginnt – erst mal Grundwerte merken
      pinchState = {
        startDist : dist,
        lastDist  : dist,
        center,
        startZoom : cam.zoom
      };
    } else {
      pinchState.center = center;
    }
  }

  function onPointerDown(e){
    if (!canvas) return;
    canvas.setPointerCapture?.(e.pointerId);
    const pt = toCanvasXY(e.clientX, e.clientY);
    touches.set(e.pointerId, pt);

    if (touches.size === 1){
      // 1 Finger → Pan
      dragging  = true;
      dragStart = pt;
      camStart  = { ...cam };
      pinchState = null;
    } else if (touches.size === 2){
      // 2 Finger → Pinch vorbereiten
      dragging = false;
      updatePinchStateFromTouches();
    } else {
      // Mehr als 2 Finger ignorieren
      dragging = false;
    }
  }

  function onPointerMove(e){
    if (!touches.has(e.pointerId)) return;
    const pt = toCanvasXY(e.clientX, e.clientY);
    touches.set(e.pointerId, pt);

    if (touches.size === 1 && dragging){
      // Pan mit einem Finger
      const dx = (pt.x - dragStart.x) / cam.zoom / PAN_DAMP;
      const dy = (pt.y - dragStart.y) / cam.zoom / PAN_DAMP;
      cam.x = camStart.x - dx;
      cam.y = camStart.y - dy;
      publish();
    } else if (touches.size >= 2){
      // Pinch-Zoom (inkrementell, ohne Sprung)
      updatePinchStateFromTouches();
      if (!pinchState) return;

      const vals = [...touches.values()];
      const a = vals[0], b = vals[1];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const distNow = Math.hypot(dx, dy);

      // 1) ganz am Anfang: erst zoomen, wenn sich die Distanz spürbar geändert hat
      if (Math.abs(distNow - pinchState.startDist) < PINCH_MIN_DELTA_START){
        return;
      }

      // 2) pro Schritt: kleine Änderungen filtern
      const stepDelta = distNow - pinchState.lastDist;
      if (Math.abs(stepDelta) < PINCH_MIN_DELTA_STEP){
        return;
      }

      if (pinchState.lastDist <= 0){
        pinchState.lastDist = distNow;
        return;
      }

      // 3) Faktor nur relativ zum letzten Abstand berechnen (inkrementell)
      let factor = distNow / pinchState.lastDist;

      // Sicherheitsbremse: Faktor pro Event begrenzen
      if (factor > PINCH_MAX_FACTOR_STEP) factor = PINCH_MAX_FACTOR_STEP;
      if (factor < 1 / PINCH_MAX_FACTOR_STEP) factor = 1 / PINCH_MAX_FACTOR_STEP;

      const targetZoom = cam.zoom * factor;
      pinchState.lastDist = distNow;

      anchorZoom(targetZoom, pinchState.center);
    }
  }

  function onPointerUp(e){
    touches.delete(e.pointerId);
    if (touches.size < 2){
      pinchState = null;
    }
    if (touches.size === 0){
      dragging = false;
    } else if (touches.size === 1){
      // von Pinch zurück zu Pan
      const [only] = touches.values();
      dragging  = true;
      dragStart = { ...only };
      camStart  = { ...cam };
    }
  }

  // ------------------------------ Init/Bind ---------------------------------
  function addListeners(){
    if (!canvas) return;

    canvas.addEventListener('wheel', onWheel, { passive:false });

    // Maus (Desktop)
    canvas.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    // Pointer (Touch + evtl. Stift/Maus)
    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointercancel', onPointerUp);
    canvas.addEventListener('pointerleave', onPointerUp);
  }

  function bind(target){
    if (!target) return;
    if (canvas === target) { publish(); return; }
    canvas = target;
    try { canvas.style.touchAction = 'none'; } catch {}
    addListeners();
    LOG('bereit');
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
  } else init();

  // Export
  window.GameCamera = {
    bind,
    get x(){ return cam.x; }, get y(){ return cam.y; }, get zoom(){ return cam.zoom; },
    set zoom(v){ anchorZoom(Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, v)), {x:0,y:0}); },
    setState({x,y,zoom}={}) {
      if (typeof x === 'number') cam.x = x;
      if (typeof y === 'number') cam.y = y;
      if (typeof zoom === 'number') cam.zoom = clamp(zoom, ZOOM_MIN, ZOOM_MAX);
      publish();
    }
  };
})();
