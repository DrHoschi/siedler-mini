/* ============================================================================
 * Datei: boot.compat.js
 * Projekt: Siedler-Mini
 * Version: v17.7.3
 * Zweck:
 *   - Kompatibilitäts-Schicht für Spielstart
 *   - Horcht auf cb:boot-request (von ui-start.js oder extern)
 *   - Delegiert an GameBoot.start oder Game.start (Legacy)
 *   - Verhindert Doppelstarts (Flag _booting)
 *
 * Events:
 *   - cb:boot-request {mapUrl}
 *   - cb:game-started {mapUrl}
 * ========================================================================== */
(function(){
  'use strict';

  var MOD = '[boot.compat]';
  var VER = 'v17.7.3';

  // interner Status
  var _booting = false;

  // sanfte Logger
  function logOk(msg){ try{ (window.CBLog?.ok||console.log)(MOD+' '+msg);}catch(_){console.log(MOD+' '+msg);} }
  function logWarn(msg){ try{ (window.CBLog?.warn||console.warn)(MOD+' '+msg);}catch(_){console.warn(MOD+' '+msg);} }
  function logErr(msg){ try{ (window.CBLog?.err||console.error)(MOD+' '+msg);}catch(_){console.error(MOD+' '+msg);} }

  // eigentliche Start-Logik
  function doStart(mapUrl){
    if (_booting){
      logWarn('bereits gestartet');
      return;
    }
    _booting = true;

    try {
      if (window.GameBoot && typeof GameBoot.start === 'function'){
        GameBoot.start(mapUrl);
        logOk('Start via GameBoot.start '+mapUrl);
      } else if (window.Game && typeof Game.start === 'function'){
        Game.start({ canvas: document.getElementById('game'), mapUrl: mapUrl });
        logOk('Start via Game.start (legacy) '+mapUrl);
      } else {
        logWarn('keine Startfunktion gefunden');
      }
    } catch(e){
      logErr('Start-Fehler: '+(e&&e.message));
      console.error(e);
    }

    try{
      window.dispatchEvent(new CustomEvent('cb:game-started',{detail:{mapUrl}}));
    }catch(_){}
  }

  // Hook: cb:boot-request
  window.addEventListener('cb:boot-request', function(ev){
    var mapUrl = ev?.detail?.mapUrl || 'assets/maps/map-mini.json';
    doStart(mapUrl);
  });

  // Direkt beim Laden ins Log
  logOk('bereit (v'+VER+')');
})();
