/* ============================================================================
 * assets/core/game.bootstrap.js — v17.3.2
 * Startet das Spiel genau EINMAL. Exportiert GameBoot.start(mapUrl?)
 * ============================================================================
 */
(function(ns){
  'use strict';
  if (!ns) ns = (window.GameCore = window.GameCore || {});
  if (window.__CB_BOOT_LOCK__) { (window.CBLog?.warn||console.warn)('[bootstrap] bereits gestartet'); return; }

  window.GameBoot = window.GameBoot || {};
  var started = false;

  GameBoot.start = function(mapUrl){
    if (started){ (window.CBLog?.warn||console.warn)('[bootstrap] bereits gestartet'); return; }
    started = true; window.__CB_BOOT_LOCK__ = true;

    (window.CBLog?.ok||console.log)('[boot] Start via GameBoot.start');
    // Map-URL aus Canvas-Attribut, falls nicht übergeben
    try{
      var cvs=document.getElementById('game');
      var url = mapUrl || cvs?.getAttribute('data-map') || 'assets/maps/map-mini.json';
      (window.CBLog?.ok||console.log)('[boot.compat] Start: '+url);
      // Engine-Init
      if (ns.Engine?.start) ns.Engine.start(url);
      else if (window.Game?.start) Game.start(url);
      else (window.CBLog?.warn||console.warn)('[boot] Kein Engine-Start verfügbar');
    }catch(e){ (window.CBLog?.warn||console.warn)('[boot] Fehler: '+(e?.message||e)); }
  };

  // Auto-Start nach UI-Ready (einmalig)
  window.addEventListener('cb:ui-ready', function(){
    if (!started) GameBoot.start();
  });

  (window.CBLog?.ok||console.log)('[engine] ready (v17.3.2)');
})(window.GameCore = window.GameCore || {});
