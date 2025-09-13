/* ============================================================================
 * game.js — v17.3.2 (Facade, minimal)
 * Legacy-Fassade, um ältere Aufrufe nicht zu brechen. Keine Doppel-Init.
 * ============================================================================
 */
(function(){
  'use strict';
  window.Game = window.Game || {};

  Game.start = function(mapUrl){
    try{
      if (window.GameBoot?.start) return GameBoot.start(mapUrl);
      if (window.GameCore?.Engine?.start) return window.GameCore.Engine.start(mapUrl);
    }catch(e){ (window.CBLog?.warn||console.warn)('[game] start Fehler: '+(e?.message||e)); }
  };

  // Platzhalter-APIs, die z.B. der Inspector nutzt:
  Game.addResources = function(type, amount){
    (window.CBLog?.ok||console.log)('[game] addResources '+type+' +'+amount);
  };
  Game.getTileSize = function(){ return window.GameCore?.state?.map?.tile || 64; };

  (window.CBLog?.ok||console.log)('Game gestartet (Facade v17.3.2)');
})();
