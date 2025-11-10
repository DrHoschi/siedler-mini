/* ============================================================================
 * Datei   : core/camera.js
 * Projekt : Neue Siedler
 * Version : v25.11.10-final
 * Zweck   : Zentrale Kamera (Pan & Zoom, Desktop + Touch) + Events cb:camera-change
 *
 * WICHTIG:
 *  - sendet nach JEDEM Update:  cb:camera-change { x, y, zoom }
 *  - bindet sich automatisch an #game (oder erstes <canvas>)
 *  - "touch-action: none" auf Canvas, damit Browser-Gesten nicht stören
 *  - Zoom ist um Maus-/Finger-Anker stabil (Weltpunkt bleibt unter dem Anker)
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

  // ------------------------------ State -------------------------------------
  let canvas = null;
  const cam  = { x:0, y:0, zoom:1 };

  let dragging = false;
  let dragStart = { x:0, y:0 };
  let camStart  = { x:0, y:0 };

  const touches = new Map(); // pointerId -> {x,y}
  let pinchStart = null;     // { dist, center:{x,y}, zoom }

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
  function onPointerDown(e){
    canvas.setPointerCapture?.(e.pointerId);
    const pt = toCanvasXY(e.clientX, e.clientY);
    touches.set(e.pointerId, pt);

    if (touches.size === 1){
      dragging  = true;
      dragStart = pt;
      camStart  = { ...cam };
    } else if (touches.size === 2){
      const [a,b] = [...touches.values()];
      pinchStart = {
        dist: Math.hypot(b.x-a.x, b.y-a.y),
        center: { x:(a.x+b.x)/2, y:(a.y+b.y)/2 },
        zoom: cam.zoom
      };
      dragging = false;
    }
  }
  function onPointerMove(e){
    if (!touches.has(e.pointerId)) return;
    const pt = toCanvasXY(e.clientX, e.clientY);
    touches.set(e.pointerId, pt);

    if (touches.size === 1 && dragging){
      const dx = (pt.x - dragStart.x) / cam.zoom / PAN_DAMP;
      const dy = (pt.y - dragStart.y) / cam.zoom / PAN_DAMP;
      cam.x = camStart.x - dx;
      cam.y = camStart.y - dy;
      publish();
    } else if (touches.size === 2 && pinchStart){
      const [a,b] = [...touches.values()];
      const dist = Math.hypot(b.x-a.x, b.y-a.y) || 1;
      const factor = clamp(dist / (pinchStart.dist || 1), 0.05, 20);
      anchorZoom(clamp(pinchStart.zoom * factor, ZOOM_MIN, ZOOM_MAX), pinchStart.center);
    }
  }
  function onPointerUp(e){
    touches.delete(e.pointerId);
    if (touches.size < 2) pinchStart = null;
    if (touches.size === 0) dragging = false;
  }

  // ------------------------------ Init/Bind ---------------------------------
  function addListeners(){
    canvas.addEventListener('wheel', onWheel, { passive:false });
    canvas.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

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

  // Auto-Bind: sofort oder nach DOMContentLoaded
  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init, { once:true });
  } else init();

  // Export für Debug/Inspector
  window.GameCamera = {
    bind,
    get x(){ return cam.x; }, get y(){ return cam.y; }, get zoom(){ return cam.zoom; },
    set zoom(v){ anchorZoom(clamp(v, ZOOM_MIN, ZOOM_MAX), {x:0,y:0}); },
    setState({x,y,zoom}={}){ if(typeof x==='number')cam.x=x; if(typeof y==='number')cam.y=y; if(typeof zoom==='number')cam.zoom=clamp(zoom,ZOOM_MIN,ZOOM_MAX); publish(); }
  };
})();
