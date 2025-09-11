/* ============================================================================
 * Datei: assets/core/camera.js
 * Aufgabe: einfache Kamera mit Zoom + Drag für Siedler-Mini
 * Öffentliche API (am window.Game Namespace):
 *   Game.Camera.get()  -> { x, y, zoom }   // Kachel-Koordinaten
 *   Game.Camera.set(p) -> setze Kamera
 *   Game.getCamera()   -> Alias für Renderer
 * ========================================================================== */
(function(){
  'use strict';

  const MOD = '[camera]';
  const log = (m)=> (window.CBLog?.ok || console.log)(MOD+' '+m);

  const state = {
    x: 0,      // in KACHELN
    y: 0,      // in KACHELN
    zoom: 1,   // 1 = 1:1 (eine Kachel = TILE px)
    tile: 64,  // muss zur Map passen
    dragging: false,
    last: {x:0, y:0}
  };

  // --- API -------------------------------------------------------------------
  const Camera = {
    get(){ return { x:state.x, y:state.y, zoom:state.zoom }; },
    set(p){
      if (typeof p.x==='number') state.x = p.x;
      if (typeof p.y==='number') state.y = p.y;
      if (typeof p.zoom==='number') state.zoom = Math.max(0.25, Math.min(4, p.zoom));
    },
    getTileSize(){ return Math.round(state.tile * state.zoom); }
  };

  // --- Pointer / Wheel -------------------------------------------------------
  function attachInput(canvas){
    if (!canvas) return;

    // Drag (Pan)
    canvas.addEventListener('pointerdown', (e)=>{
      state.dragging = true;
      state.last.x = e.clientX;
      state.last.y = e.clientY;
      canvas.setPointerCapture(e.pointerId);
    }, {passive:true});
    canvas.addEventListener('pointermove', (e)=>{
      if (!state.dragging) return;
      const dx = e.clientX - state.last.x;
      const dy = e.clientY - state.last.y;
      state.last.x = e.clientX;
      state.last.y = e.clientY;

      const pxPerTile = Camera.getTileSize();   // px pro Kachel im aktuellen Zoom
      state.x -= dx / pxPerTile;
      state.y -= dy / pxPerTile;
      fireRender();
    }, {passive:true});
    canvas.addEventListener('pointerup', ()=>{
      state.dragging = false;
    }, {passive:true});

    // Zoom (Wheel / Pinch via Wheel on iOS Safari)
    canvas.addEventListener('wheel', (e)=>{
      e.preventDefault?.();
      const old = state.zoom;
      const step = (e.deltaY > 0 ? -0.1 : 0.1);
      state.zoom = Math.max(0.25, Math.min(4, +(old + step).toFixed(2)));
      fireRender();
    }, {passive:false});
  }

  function fireRender(){
    try { window.dispatchEvent(new Event('cb:render-frame')); } catch(_) {}
  }

  // --- Wire-up ---------------------------------------------------------------
  function init(){
    window.Game = window.Game || {};
    Game.Camera = Camera;

    // Aliases, damit der Renderer dich findet
    Game.getCamera   = Camera.get;
    Game.getTileSize = Camera.getTileSize;

    // Canvas ermitteln und Inputs anhängen
    const cvs = document.getElementById('game');
    if (cvs) attachInput(cvs);

    log('bereit');
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init, {once:true});
  } else {
    init();
  }
})();
