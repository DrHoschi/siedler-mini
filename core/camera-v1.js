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
 *   • hört auf cb:game:start     (Auto-Bind an Canvas, falls noch nicht gebunden)
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
 * Datei   : core/camera.js
 * Version : v25.11.09-final
 * Zweck   : Zentrale Kamera (Pan/Zoom) + Events cb:camera-change
 * Struktur: Konstanten → State → Helpers → Events → Init
 * ========================================================================== */
(() => {
  'use strict';

  const TAG = '[camera]';
  const LOG = (...a)=>(window.CBLog?.info??console.info)(TAG, ...a);

  // ------------------------------ State ------------------------------------
  const cam = { x: 0, y: 0, zoom: 1 };
  const MIN_Z = 0.5, MAX_Z = 3, Z_STEP = 0.1;

  let canvas = null;
  let dragging = false;
  let dragStart = { x:0, y:0 };
  let camStart = { x:0, y:0 };

  // ------------------------------ Helpers ----------------------------------
  function emitChange(){
    window.dispatchEvent(new CustomEvent('cb:camera-change', { detail: {
      x: cam.x, y: cam.y, zoom: cam.zoom
    }}));
  }
  function clampZoom(z){ return Math.min(MAX_Z, Math.max(MIN_Z, z)); }

  // ------------------------------ Input ------------------------------------
  function onWheel(e){
    if (!canvas) return;
    e.preventDefault();
    const dir = Math.sign(e.deltaY);
    cam.zoom = clampZoom(cam.zoom + (dir > 0 ? -Z_STEP : Z_STEP));
    emitChange();
  }
  function onPointerDown(e){
    if (!canvas) return;
    if (e.button !== 0) return;
    dragging = true;
    dragStart = { x: e.clientX, y: e.clientY };
    camStart = { x: cam.x, y: cam.y };
    canvas.setPointerCapture?.(e.pointerId);
  }
  function onPointerMove(e){
    if (!dragging) return;
    const dx = (e.clientX - dragStart.x) / cam.zoom;
    const dy = (e.clientY - dragStart.y) / cam.zoom;
    cam.x = camStart.x - dx;
    cam.y = camStart.y - dy;
    emitChange();
  }
  function onPointerUp(e){
    if (!dragging) return;
    dragging = false;
    canvas.releasePointerCapture?.(e.pointerId);
  }

  // ------------------------------ Init -------------------------------------
  function init(){
    canvas = document.getElementById('game')
          || document.querySelector('canvas[data-role="map"]')
          || document.querySelector('canvas');

    // Initial aus GameCamera (falls gesetzt)
    try{
      if (window.GameCamera) {
        if (typeof GameCamera.x === 'number')   cam.x    = GameCamera.x;
        if (typeof GameCamera.y === 'number')   cam.y    = GameCamera.y;
        if (typeof GameCamera.zoom === 'number')cam.zoom = GameCamera.zoom;
      }
    } catch {}

    // Events
    canvas?.addEventListener('wheel', onWheel, { passive:false });
    canvas?.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);

    LOG('bereit');
    emitChange();
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init, { once:true });
  } else init();
})();
