/* assets/core/camera.js  v17.9.5
 * Kamera-Controller für Canvas-Map
 * - Wheel-Zoom & Pinch-Zoom um den Fokuspunkt (Cursor / Gestenmittelpunkt)
 * - Panning via Drag (Maus & 1-Finger)
 * - Exponiert window.GameCamera (get/set/centerOn/bind)
 * - Sendet 'cb:camera-change' Events & füttert (optional) window.Render.setCameraState
 */

(() => {
  'use strict';

  const TAG  = '[camera]';
  const LOG  = (...a) => (window.CBLog?.info ?? console.log)(TAG, ...a);
  const WARN = (...a) => (window.CBLog?.warn ?? console.warn)(TAG, ...a);
  const ERR  = (...a) => (window.CBLog?.err  ?? console.error)(TAG, ...a);

  // ---- Konst -------------------------------------------------------------
  const ZOOM_MIN = 0.25;
  const ZOOM_MAX = 4.0;
  const ZOOM_STEP = 1.1;         // Wheel-Faktor pro Tick
  const PAN_DAMP  = 1.0;         // 1.0 = 1:1 Pixel → Welt
  const PINCH_SMOOTH = 1.0;      // 1.0 = ohne zusätzliche Glättung

  // ---- State -------------------------------------------------------------
  let canvas = null;
  let dragging = false;
  let dragStart = { x:0, y:0 };
  let camStart  = { x:0, y:0 };

  // Pointer/Touch
  const touches = new Map(); // pointerId -> {x,y}
  let pinchStart = null;     // {dist, center:{x,y}, zoom}

  // Kamera-Werte in Weltkoordinaten
  const cam = {
    x: 0,
    y: 0,
    zoom: 1
  };

  // ---- Helpers -----------------------------------------------------------
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  function rectOf(el){
    try { return el.getBoundingClientRect(); }
    catch { return { left:0, top:0, width:el?.width||0, height:el?.height||0 }; }
  }

  function toCanvasXY(clientX, clientY){
    const r = rectOf(canvas);
    return { x: clientX - r.left, y: clientY - r.top };
  }

  function toWorld({x, y}){
    return { x: (x / cam.zoom) + cam.x, y: (y / cam.zoom) + cam.y };
  }

  function anchorZoom(newZoom, anchorCanvasXY){
    // Ankerpunkt in Welt vor dem Zoom merken …
    const worldBefore = toWorld(anchorCanvasXY);
    cam.zoom = clamp(newZoom, ZOOM_MIN, ZOOM_MAX);
    // … und Offset so verschieben, dass derselbe Weltpunkt unter dem Anker bleibt
    cam.x = worldBefore.x - (anchorCanvasXY.x / cam.zoom);
    cam.y = worldBefore.y - (anchorCanvasXY.y / cam.zoom);
    publish();
  }

  function publish(){
    // Renderer füttern (falls vorhanden)
    try {
      window.Render?.setCameraState?.({ x: cam.x, y: cam.y, zoom: cam.zoom });
    } catch(e) {
      // still
    }
    // Event für andere Module
    try {
      window.dispatchEvent(new CustomEvent('cb:camera-change', { detail: { ...cam }}));
    } catch {}
  }

  // ---- Wheel (Desktop Zoom) ---------------------------------------------
  function onWheel(e){
    if (!canvas) return;
    // Nur über der Canvas arbeiten
    if (e.target !== canvas) return;
    e.preventDefault(); // wichtig, damit die Seite nicht zoomt/scrollt

    const pt = toCanvasXY(e.clientX, e.clientY);
    const dir = Math.sign(e.deltaY); // +1 raus, -1 rein (Browser unterschiedlich)
    const factor = dir > 0 ? (1/ZOOM_STEP) : ZOOM_STEP;

    anchorZoom(cam.zoom * factor, pt);
  }

  // ---- Maus-Drag (Panning) ----------------------------------------------
  function onMouseDown(e){
    if (e.button !== 0) return; // nur LMB
    const pt = toCanvasXY(e.clientX, e.clientY);
    dragging = true;
    dragStart = pt;
    camStart = { x: cam.x, y: cam.y };
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

  function onMouseUp(){
    dragging = false;
  }

  // ---- Pointer/Touch (Pan + Pinch) --------------------------------------
  function onPointerDown(e){
    canvas.setPointerCapture?.(e.pointerId);
    const pt = toCanvasXY(e.clientX, e.clientY);
    touches.set(e.pointerId, pt);

    if (touches.size === 1){
      // 1-Finger → Pan
      dragging = true;
      dragStart = pt;
      camStart = { x: cam.x, y: cam.y };
    } else if (touches.size === 2){
      // 2-Finger → Pinch
      const [a, b] = [...touches.values()];
      pinchStart = {
        dist: Math.hypot(b.x - a.x, b.y - a.y),
        center: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
        zoom: cam.zoom
      };
      dragging = false; // Pan beenden
    }
  }

  function onPointerMove(e){
    if (!touches.has(e.pointerId)) return;
    const pt = toCanvasXY(e.clientX, e.clientY);
    touches.set(e.pointerId, pt);

    if (touches.size === 1 && dragging){
      const cur = pt;
      const dx = (cur.x - dragStart.x) / cam.zoom / PAN_DAMP;
      const dy = (cur.y - dragStart.y) / cam.zoom / PAN_DAMP;
      cam.x = camStart.x - dx;
      cam.y = camStart.y - dy;
      publish();
    } else if (touches.size === 2 && pinchStart){
      const [a, b] = [...touches.values()];
      const dist = Math.hypot(b.x - a.x, b.y - a.y);
      if (dist <= 0) return;

      const factor = clamp((dist / pinchStart.dist) ** PINCH_SMOOTH, 0.01, 100);
      const newZoom = clamp(pinchStart.zoom * factor, ZOOM_MIN, ZOOM_MAX);
      anchorZoom(newZoom, pinchStart.center);
    }
  }

  function onPointerUp(e){
    touches.delete(e.pointerId);
    if (touches.size < 2) {
      pinchStart = null;
    }
    if (touches.size === 0) {
      dragging = false;
    }
  }

  // ---- API ---------------------------------------------------------------
  function bind(target){
    if (!target) {
      ERR('bind(): Canvas fehlt');
      return;
    }
    canvas = target;
    // wichtig: verhindert Browser-Pinch/Zweifinger-Scroll
    try { canvas.style.touchAction = 'none'; } catch {}
    addListeners();
    LOG('bereit');
    publish();
  }

  function addListeners(){
    // Wheel (passive:false, damit preventDefault wirkt)
    canvas.addEventListener('wheel', onWheel, { passive:false });

    // Maus
    canvas.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    // Pointer (vereinheitlicht Touch & Stift)
    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointercancel', onPointerUp);
    canvas.addEventListener('pointerleave', onPointerUp);

    // Bei Spielstart automatisch an #game hängen, falls nicht gebunden
    window.addEventListener('cb:game-start', () => {
      if (!canvas) {
        const auto = document.getElementById('game') ||
                     document.querySelector('canvas[data-role="map"]') ||
                     document.querySelector('canvas');
        if (auto) bind(auto);
      }
    });
  }

  function getState(){ return { ...cam }; }

  function setState({x, y, zoom} = {}){
    if (typeof x === 'number') cam.x = x;
    if (typeof y === 'number') cam.y = y;
    if (typeof zoom === 'number') cam.zoom = clamp(zoom, ZOOM_MIN, ZOOM_MAX);
    publish();
  }

  function setZoom(zoom, anchor){ // anchor: {x,y} in Canvas-Koordinaten
    if (!canvas || !anchor){
      cam.zoom = clamp(zoom, ZOOM_MIN, ZOOM_MAX);
      publish();
      return;
    }
    anchorZoom(zoom, anchor);
  }

  function setOffset(x, y){
    cam.x = x; cam.y = y;
    publish();
  }

  function centerOn(worldX, worldY, opts = {}){
    const { anchorCanvas = null, zoom = cam.zoom } = opts;
    if (anchorCanvas){
      anchorZoom(zoom, anchorCanvas);
      const world = toWorld(anchorCanvas);
      const dx = worldX - world.x;
      const dy = worldY - world.y;
      cam.x += dx;
      cam.y += dy;
      publish();
    } else {
      cam.zoom = clamp(zoom, ZOOM_MIN, ZOOM_MAX);
      // Zentriere so, dass Weltpunkt ungefähr in die Mitte fällt
      const r = rectOf(canvas);
      cam.x = worldX - (r.width  / 2) / cam.zoom;
      cam.y = worldY - (r.height / 2) / cam.zoom;
      publish();
    }
  }

  // ---- Export ------------------------------------------------------------
  window.GameCamera = {
    bind,
    getState,
    setState,
    setZoom,
    setOffset,
    centerOn,
    get x(){ return cam.x; },
    get y(){ return cam.y; },
    get scale(){ return cam.zoom; },    // Alias
    get zoom(){ return cam.zoom; },
    set zoom(v){ setState({ zoom:v }); }
  };

  // Auto-Bind, falls das Canvas bereits da ist (Desktop lädt Scripts oft früher)
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    const auto = document.getElementById('game') ||
                 document.querySelector('canvas[data-role="map"]') ||
                 document.querySelector('canvas');
    if (auto) bind(auto);
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      const auto = document.getElementById('game') ||
                   document.querySelector('canvas[data-role="map"]') ||
                   document.querySelector('canvas');
      if (auto) bind(auto);
    }, { once:true });
  }
})();
