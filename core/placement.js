/* ============================================================================
 * Datei   : core/placement.js
 * Version : v25.11.14-final
 * Zweck   : Ghost-Preview + Klick → cb:build:place
 * Hinweis : Dieses Modul sendet jetzt IMMER __src + w + h.
 * ========================================================================== */
(function(){
  'use strict';
  const TAG  = '[placement]';
  const LOG  = (...a)=> (window.CBLog?.info||console.info)(TAG, ...a);
  let state = {
    buildingId: null,
    w: 3, h: 3,
    hover: { tx:0, ty:0, ok:true }
  };

  // Wird z. B. vom Build-Hook gesetzt
  addEventListener('req:place:begin', (ev)=>{
    const d = ev?.detail||{};
    state.buildingId = d.buildingId || d.kind || null;
    if (d.w) state.w = d.w|0;
    if (d.h) state.h = d.h|0;
    LOG('begin', state);
  });

  addEventListener('cb:hover-tile', (ev)=>{
    const d = ev?.detail||{};
    state.hover.tx = d.tx|0; state.hover.ty = d.ty|0;
  });

  // (hier nur Beispiel – dein echter Klick/Confirm hängt an Input/Overlay)
  addEventListener('req:place:confirm', ()=>{
    if (!state.buildingId) return;
    const detail = {
      __src: 'placement-v25.11.14',
      buildingId: state.buildingId,
      x: state.hover.tx, y: state.hover.ty,
      w: state.w, h: state.h
    };
    window.dispatchEvent(new CustomEvent('cb:build:place', { detail }));
    LOG('emit cb:build:place', detail);
  });
})();
