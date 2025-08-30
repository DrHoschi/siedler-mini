/* boot.compat.js — v1 (ES5)
   Kompatibilitäts-Bridge: stellt GameBoot.start / startGame bereit
   und ruft intern GameLoader._start(mapUrl) auf. */
(function(){
  'use strict';

  // Falls bereits vorhanden, nichts kaputt machen:
  if (!window.GameBoot) window.GameBoot = {};

  // Start-API bereitstellen/überschreiben (nur wenn nicht vorhanden)
  if (typeof window.GameBoot.start !== 'function') {
    window.GameBoot.start = function(mapUrl){
      try { console.log('[boot.compat] Start:', mapUrl); } catch(e){}
      if (window.GameLoader && typeof window.GameLoader._start === 'function') {
        return window.GameLoader._start(mapUrl).then(function(){
          // Event & UI-Hook nach erfolgreichem Start
          try { window.dispatchEvent(new CustomEvent('cb:game-started', { detail:{ map: mapUrl }})); } catch(_){}
          try {
            if (window.GameUI && typeof window.GameUI.onGameStarted === 'function'){
              window.GameUI.onGameStarted();
            }
          } catch(_){}
          return true;
        });
      } else {
        try { console.warn('[boot.compat] GameLoader._start fehlt.'); } catch(e){}
        return Promise.reject(new Error('GameLoader._start fehlt'));
      }
    };
  }

  // Historischer Alias
  if (typeof window.startGame !== 'function') {
    window.startGame = function(mapUrl){ return window.GameBoot.start(mapUrl); };
  }

  try { console.log('[boot.compat] bereit'); } catch(e){}
})();
