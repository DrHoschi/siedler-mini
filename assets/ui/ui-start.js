/* ============================================================================
 * ui-start.js — v17.7.0
 * Aufgabe:
 *   - Start-UI signalisiert "bereit"
 *   - setzt body.has-start-bg für das CSS-Start-Hintergrundbild
 *   - entfernt Hintergrund bei Start
 * ========================================================================== */
(function(){
  'use strict';
  var MOD='[ui-start]'; var VER='v17.7.0';
  function ok(m){ try{ (window.CBLog?.ok||console.log)(m);}catch(_){console.log(m);} }

  function setStartBg(on){
    document.body.classList.toggle('has-start-bg', !!on);
  }

  function onReady(){
    setStartBg(true);
    ok(MOD+' cb:ui-ready ('+VER+')');
    try{ window.dispatchEvent(new Event('cb:ui-ready')); }catch(_){}
  }

  // Entferne Hintergrund, wenn das Spiel wirklich losläuft
  window.addEventListener('cb:game-started', function(){
    setStartBg(false);
  });

  if (document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded', onReady, {once:true});
  } else {
    onReady();
  }
})();
