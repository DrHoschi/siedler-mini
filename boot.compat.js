/* ============================================================================
 * boot.compat.js — v17.3.2
 * Fallback-Starter: Ruft NUR dann den Start, wenn GameBoot.start nicht existiert.
 * ============================================================================
 */
(function(){
  'use strict';
  if (!window.GameBoot || typeof GameBoot.start!=='function'){
    (window.CBLog?.ok||console.log)('[boot.compat] bereit (Fallback)');
    window.addEventListener('load', function(){
      if (window.GameBoot?.start) return; // inzwischen vorhanden
      try{
        var cvs=document.getElementById('game');
        var url=cvs?.getAttribute('data-map')||'assets/maps/map-mini.json';
        (window.CBLog?.ok||console.log)('[boot.compat] Start: '+url);
        // Minimalstart: versuche Engine/Game
        if (window.GameCore?.Engine?.start) window.GameCore.Engine.start(url);
        else if (window.Game?.start) window.Game.start(url);
      }catch(e){ (window.CBLog?.warn||console.warn)('[boot.compat] Fehler: '+(e?.message||e)); }
    });
  } else {
    (window.CBLog?.ok||console.log)('[boot.compat] bereit');
  }
})();
