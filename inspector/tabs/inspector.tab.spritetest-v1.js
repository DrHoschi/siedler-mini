/* =========================================================================
 *  inspector/tab: SpriteTest
 *  Version: v26.01.04 (Pivot/Anchor Visualizer)
 *  Purpose:
 *   - Schnelltest für 8-Richtungs-Sprites (1024px / 8x8 => 128x128 Frames)
 *   - Zeigt zusätzlich Pivot/Anker (Crosshair), Bounding-Box, Fußlinie
 *  Notes:
 *   - Frame 0 = Idle (Regel)
 *   - Reihenfolge Richtungen: N, NE, E, SE, S, SW, W, NW
 * ========================================================================= */
(function () {
  'use strict';

  // -------------------------------------------------------------------------
  // Konstanten
  // -------------------------------------------------------------------------
  const TAB_ID   = 'spritetest';
  const TAB_NAME = 'SpriteTest';
  const DIRS = ['N','NE','E','SE','S','SW','W','NW'];

  // -------------------------------------------------------------------------
  // Helper: Inspector-Tab registrieren (kompatibel zu mehreren API-Varianten)
  // -------------------------------------------------------------------------
  
  // -------------------------------------------------------------
  // Registrierung im Inspector (stabil):
  //  - nutzt den bestehenden Adapter window.registerInspectorTab(...)
  //  - Tab-Name ist klein geschrieben, damit er immer mit den anderen Tabs konsistent ist
  // -------------------------------------------------------------
  function mount(section){
    // section ist der Content-Container des Tabs
    renderUI(section);
  }

  function tryRegister(){
    if (typeof window.registerInspectorTab === 'function'){
      window.registerInspectorTab(TAB_ID, mount);
      console.log('[spritetest] Tab registriert als', TAB_ID);
      return true;
    }
    return false;
  }

  // Sofort versuchen + wiederholen, falls Adapter/Content erst später kommt
  if(!tryRegister()){
    let tries = 0;
    const t = setInterval(()=>{
      tries++;
      if(tryRegister() || tries > 200){ // ~40s @200ms
        clearInterval(t);
        if(tries > 200) console.warn('[spritetest] Registrierung gescheitert (Adapter nie bereit).');
      }
    }, 200);

    // Extra: bei Inspector-Open / Content-ready nochmal versuchen
    window.addEventListener('cb:insp:open', ()=>{ tryRegister(); });
    window.addEventListener('cb:insp:content:ready', ()=>{ tryRegister(); });
  }
})();
