/* ============================================================================
 * Datei   : core/camera.js
 * Projekt : Neue Siedler
 * Version : v25.10.25-final
 * Zweck   : Kamera-Controller für die Canvas-Map (Pan & Zoom, Desktop + Mobile)
 *
 * Struktur: Imports → Konstanten → Hilfsfunktionen → Klassen → Hauptlogik → Exports
 *
 * Events  :
 *   • sendet  cb:camera-change  (detail: { x, y, zoom })
 *   • hört auf cb:game-start     (Auto-Bind an Canvas, falls noch nicht gebunden)
 *
 * API (global, bewusst simpel gehalten für Debug/Inspector & Renderer):
 *   window.GameCamera = {
 *     bind(canvasEl),                 // Manuelles Binden an ein <canvas>
 *     getState(),                     // { x, y, zoom }
 *     setState({x?,y?,zoom?}),        // Setzt Teile oder kompletten Zustand
 *     setZoom(zoom[, anchorCanvasXY]) // Anchor optional in Canvas-Koordinaten
 *     setOffset(x, y),                // Absolut setzen
 *     centerOn(worldX, worldY, {      // Zentriert auf Weltpunkt
 *       anchorCanvas?: {x,y},         // optionaler Canvas-Ankerpunkt
 *       zoom?: number                 // optional Zielzoom
 *     }),
 *     get x(), get y(), get zoom(), set zoom(v), get scale()
 *   }
 *
 * Hinweise:
 *   • Renderer-Integration: falls vorhanden, wird window.Render.setCameraState({x,y,zoom})
 *     nach jedem Update aufgerufen (lose gekoppelt).
 *   • touch-action: none wird auf dem Canvas gesetzt, damit Browser-Gesten nicht stören.
 *   • Logging: CBLog (✅/ℹ️/⚠️/❌) wird genutzt, fallback auf console.
 * ============================================================================ */


/* ============================================================================
 * [Imports / Fallback-Logger]
 * ============================================================================ */
(() => {
  'use strict';

  const TAG  = '[camera]';
  const LOG  = (...a) => (window.CBLog?.info  ?? console.log )(TAG, ...a);
  const WARN = (...a) => (window.CBLog?.warn  ?? console.warn)(TAG, ...a);
  const ERR  = (...a) => (window.CBLog?.error ?? console.error)(TAG, ...a); // Standard: error, nicht "err"


  /* ==========================================================================
   * [Konstanten & Meta]
   * ========================================================================== */

  // Zoom-Grenzen & Parameter
  const ZOOM_MIN     = 0.25;
  const ZOOM_MAX     = 4.0;
  const ZOOM_STEP    = 1.1;  // Wheel-Faktor pro Tick (Desktop)
  const PAN_DAMP     = 1.0;  // 1.0 = 1:1 Pixel → Welt (größer = langsameres Panning)
  const PINCH_SMOOTH = 1.0;  // 1.0 = direkt; >1.0 würde die Geste weicher (nicht nötig)

  // Optionale Map-Grenzen (Weltkoordinaten in Pixel; null = unbeschränkt)
  // → Bei Bedarf per GameCamera.setBounds({ left, top, right, bottom }) setzen.
  let BOUNDS = null; // { left, top, right, bottom } | null


  /* ==========================================================================
   * [State]
   * ========================================================================== */
  /** aktuell gebundenes Canvas */
  let canvas = null;

  /** Drag/Pan-Status */
  let dragging = false;
  let dragStart = { x:0, y:0 };
  let camStart  = { x:0, y:0 };

  /** Pointer/Touch-Status */
  const touches = new Map(); // pointerId -> {x,y} (Canvas-Koordinaten)
  let pinchStart = null;     // { dist, center:{x,y}, zoom }

  /** Kamera in Weltkoordinaten (linke obere Ecke) + Zoom */
  const cam = { x: 0, y: 0, zoom: 1 };


  /* ==========================================================================
   * [Hilfsfunktionen]
   * ========================================================================== */

  /** clamp: Zahl in [lo,hi] begrenzen */
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  /** DOMRect des Canvas holen (Fallback auf width/height) */
  function rectOf(el){
    try { return el.getBoundingClientRect(); }
    catch { return { left:0, top:0, width:el?.width||0, height:el?.height||0 }; }
  }

  /** Viewport- (Client-) → Canvas-Koordinaten */
  function toCanvasXY(clientX, clientY){
    const r = rectOf(canvas);
    return { x: clientX - r.left, y: clientY - r.top };
  }

  /** Canvas- → Weltkoordinaten (unter Berücksichtigung von cam.x/y/zoom) */
  function toWorld({x, y}){
    return { x: (x / cam.zoom) + cam.x, y: (y / cam.zoom) + cam.y };
  }

  /** Begrenzung auf optionale BOUNDS anwenden (sofern gesetzt) */
  function applyBounds(){
    if(!BOUNDS || !canvas) return;
    // Kamera repräsentiert linke obere Ecke des Viewports; wir begrenzen so,
    // dass das sichtbare Fenster innerhalb der BOUNDS bleibt.
    const r = rectOf(canvas);
    const viewW = r.width  / cam.zoom;
    const viewH = r.height / cam.zoom;

    const minX = BOUNDS.left;
    const minY = BOUNDS.top;
    const maxX = BOUNDS.right  - viewW;
    const maxY = BOUNDS.bottom - viewH;

    // Falls Welt kleiner als Viewport: in der Mitte halten
    if (maxX < minX) cam.x = (minX + maxX) / 2;
    else             cam.x = clamp(cam.x, minX, maxX);

    if (maxY < minY) cam.y = (minY + maxY) / 2;
    else             cam.y = clamp(cam.y, minY, maxY);
  }

  /** Zoom um Ankerpunkt in Canvas-Koordinaten (hält den Weltpunkt unter dem Anker fest) */
  function anchorZoom(newZoom, anchorCanvasXY){
    // Weltpunkt vor Zoom am Anker merken
    const worldBefore = toWorld(anchorCanvasXY);

    // Zoom anwenden
    cam.zoom = clamp(newZoom, ZOOM_MIN, ZOOM_MAX);

    // Offset so verschieben, dass weltBefore unter dem gleichen Canvas-Punkt bleibt
    cam.x = worldBefore.x - (anchorCanvasXY.x / cam.zoom);
    cam.y = worldBefore.y - (anchorCanvasXY.y / cam.zoom);

    applyBounds();
    publish();
  }

  /** Änderungen publizieren: Renderer füttern + Event senden */
  function publish(){
    // Renderer (lose gekoppelt)
    try {
      window.Render?.setCameraState?.({ x: cam.x, y: cam.y, zoom: cam.zoom });
    } catch(e) {
      // still
    }
    // Event
    try {
      window.dispatchEvent(new CustomEvent('cb:camera-change', { detail: { ...cam }}));
    } catch {}
  }


  /* ==========================================================================
   * [Eingaben – Wheel/Maus]
   * ========================================================================== */

  /** Desktop-Zoom per Wheel (über Canvas) */
  function onWheel(e){
    if (!canvas) return;
    if (e.target !== canvas) return;        // nur zoomen, wenn direkt über Canvas
    e.preventDefault();                     // verhindert Seitenscroll/Browser-Zoom

    const pt = toCanvasXY(e.clientX, e.clientY);
    const dir = Math.sign(e.deltaY);        // +1 raus, -1 rein (je nach Browser)
    const factor = dir > 0 ? (1/ZOOM_STEP) : ZOOM_STEP;

    anchorZoom(cam.zoom * factor, pt);
  }

  /** Maus-Drag: Pan (nur LMB) */
  function onMouseDown(e){
    if (e.button !== 0) return;
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
    applyBounds();
    publish();
  }

  function onMouseUp(){
    dragging = false;
  }


  /* ==========================================================================
   * [Eingaben – Pointer/Touch (Pan + Pinch)]
   * ========================================================================== */

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
      // 2-Finger → Pinch-Zoom
      const [a, b] = [...touches.values()];
      pinchStart = {
        dist: Math.hypot(b.x - a.x, b.y - a.y),
        center: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
        zoom: cam.zoom
      };
      dragging = false; // Pan beenden, Pinch übernimmt
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
      applyBounds();
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
    if (touches.size < 2) pinchStart = null;
    if (touches.size === 0) dragging = false;
  }


  /* ==========================================================================
   * [Klassen] – (kein Bedarf, Logik bleibt prozedural in diesem Modul)
   * ========================================================================== */
  // Hinweis: Für spätere Erweiterungen (z. B. Inertia / Animations-Ticker) kann
  // hier eine Camera-Klasse eingeführt werden. Aktuell genügt das Modul-Pattern.


  /* ==========================================================================
   * [Hauptlogik – Binden & Listener]
   * ========================================================================== */

  function addListenersOnce(){
    // Wheel: passive:false, damit preventDefault() wirkt
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
        const auto = document.getElementById('game')
                 ||  document.querySelector('canvas[data-role="map"]')
                 ||  document.querySelector('canvas');
        if (auto) bind(auto);
      }
    });
  }

  /** bind(canvasEl): Binde Kamera an ein Canvas-Element */
  function bind(target){
    if (!target) { ERR('bind(): Canvas fehlt'); return; }
    if (canvas === target) { LOG('bereits gebunden'); return; }

    canvas = target;
    try { canvas.style.touchAction = 'none'; } catch {}
    addListenersOnce();
    LOG('bereit');
    publish();
  }

  /** getState(): Snapshot vom Kamerazustand */
  function getState(){ return { ...cam }; }

  /** setState(): Teile/kompletten Zustand setzen (mit Bounds & Publish) */
  function setState({x, y, zoom} = {}){
    if (typeof x === 'number') cam.x = x;
    if (typeof y === 'number') cam.y = y;
    if (typeof zoom === 'number') cam.zoom = clamp(zoom, ZOOM_MIN, ZOOM_MAX);
    applyBounds();
    publish();
  }

  /** setZoom(): Zoom absolut setzen, optional um einen Canvas-Anker */
  function setZoom(zoom, anchorCanvasXY){
    if (!canvas || !anchorCanvasXY){
      cam.zoom = clamp(zoom, ZOOM_MIN, ZOOM_MAX);
      applyBounds();
      publish();
      return;
    }
    anchorZoom(zoom, anchorCanvasXY);
  }

  /** setOffset(): Kamera-Offset absolut setzen */
  function setOffset(x, y){
    cam.x = x; cam.y = y;
    applyBounds();
    publish();
  }

  /**
   * centerOn(worldX, worldY, opts):
   *   – Zentriert Kamera auf einen Weltpunkt.
   *   – Mit anchorCanvas wird zuerst um diesen Punkt gezoomt und anschließend
   *     so verschoben, dass worldX/worldY unter dem Canvas-Anker landet.
   *   – Ohne anchorCanvas wird die Weltmitte in die Canvas-Mitte gesetzt.
   */
  function centerOn(worldX, worldY, opts = {}){
    const { anchorCanvas = null, zoom = cam.zoom } = opts;
    if (anchorCanvas){
      anchorZoom(zoom, anchorCanvas);
      const world = toWorld(anchorCanvas);
      const dx = worldX - world.x;
      const dy = worldY - world.y;
      cam.x += dx;
      cam.y += dy;
      applyBounds();
      publish();
    } else {
      cam.zoom = clamp(zoom, ZOOM_MIN, ZOOM_MAX);
      const r = rectOf(canvas);
      cam.x = worldX - (r.width  / 2) / cam.zoom;
      cam.y = worldY - (r.height / 2) / cam.zoom;
      applyBounds();
      publish();
    }
  }

  /** (optional) BOUNDS setzen/entfernen */
  function setBounds(bounds /* { left, top, right, bottom } | null */){
    if (bounds && typeof bounds === 'object'
        && ['left','top','right','bottom'].every(k => typeof bounds[k]==='number')) {
      BOUNDS = { ...bounds };
    } else {
      BOUNDS = null;
    }
    applyBounds();
    publish();
  }


  /* ==========================================================================
   * [Exports]
   * ========================================================================== */
  window.GameCamera = {
    bind,
    getState,
    setState,
    setZoom,
    setOffset,
    centerOn,
    setBounds, // optional; für Map-Ränder

    // Komfort-Getter/Setter
    get x(){ return cam.x; },
    get y(){ return cam.y; },
    get scale(){ return cam.zoom; },  // Alias
    get zoom(){ return cam.zoom; },
    set zoom(v){ setState({ zoom:v }); }
  };

  // Auto-Bind (Canvas bereits vorhanden?)
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    const auto = document.getElementById('game')
             ||  document.querySelector('canvas[data-role="map"]')
             ||  document.querySelector('canvas');
    if (auto) bind(auto);
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      const auto = document.getElementById('game')
               ||  document.querySelector('canvas[data-role="map"]')
               ||  document.querySelector('canvas');
      if (auto) bind(auto);
    }, { once:true });
  }

})();
