/* ============================================================================
 * assets/core/build.assets.js – Asset-Bootstrap/Brücke
 * Version: v17.8.7
 * Aufgabe:
 *   - Vor Spielstart sicherstellen, dass Assets (Tileset) geladen sind.
 *   - Danach sofort Repaint anstoßen.
 * ========================================================================== */
(function(){
  'use strict';

  var MOD='[assets-boot]';
  function ok(m){ try{(window.CBLog?.ok||console.log)(MOD+' '+m);}catch(_){console.log(MOD+' '+m);} }
  function err(m){ try{(window.CBLog?.err||console.error)(MOD+' '+m);}catch(_){console.error(MOD+' '+m);} }

  async function ensure(){
    try{
      await window.Assets?.ensureReady?.();
      ok('Assets bereit.');
      try{ window.dispatchEvent(new Event('cb:request-repaint')); }catch(_){}
    }catch(e){
      err('Fehler beim Laden: '+(e&&e.message||e));
    }
  }

  // Wenn der Start kommt: laden & repaint
  window.addEventListener('cb:game-start', ensure);

  // Falls der Renderer früher dran ist, und Assets schon ready sind
  window.addEventListener('cb:assets-ready', function(){
    try{ window.dispatchEvent(new Event('cb:request-repaint')); }catch(_){}
  });

  ok('Modul geladen v17.8.7');
})();
