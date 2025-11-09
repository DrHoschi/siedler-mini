/* ============================================================================
 * Datei   : ui/ui-build.js
 * Version : v25.11.09-final
 * Zweck   : Baumenü – Auswahl setzt Build-Tool + startet Platziermodus (3×3)
 * ========================================================================== */
(() => {
  'use strict';

  const TAG = '[build]';
  const LOG = (...a)=>(window.CBLog?.info??console.info)(TAG, ...a);

  function selectBuilding(id){
    // Tool setzen (für Cursor/CSS & Confirm-UI)
    window.dispatchEvent(new CustomEvent('cb:set-build-tool', {
      detail: { kind: id }
    }));
    // Platziermodus starten – 3×3
    window.dispatchEvent(new CustomEvent('req:place:begin', {
      detail: { w:3, h:3 }
    }));

    LOG('select', id, '→ begin 3x3');
  }

  function bindButtons(){
    // Buttons mit data-building="b.lumberjack" etc.
    document.querySelectorAll('[data-building]').forEach(btn=>{
      btn.addEventListener('click', ()=> selectBuilding(btn.getAttribute('data-building')));
    });
  }

  function init(){
    bindButtons();
    LOG('bereit', { source:'data/buildings.json', categories:5 });
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init, { once:true });
  } else init();
})();
