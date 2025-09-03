/* ============================================================================
 * Datei: assets/core/game.bootstrap.js
 * Projekt: Siedler-Mini
 * Version: v17.6.1
 *
 * Ziele / Garantien
 *  - Verbindet Engine ↔ Render neutral (kein harter Game-State hier)
 *  - Pro Frame genau EIN Zeichnen (via 'cb:render-frame' oder direkter Aufruf)
 *  - Doppelt-Start vermeiden (idempotent)
 *  - OverlayHooks anbinden (requestRepaint → sofortiges Rendern)
 *  - Kompatibel zu:
 *      • index.html (FABs / Body-Klassen / Reihenfolge)
 *      • boot.compat.js (GameBoot.start)
 *      • Legacy game.js (falls vorhanden, wird bevorzugt gestartet)
 *
 * Öffentliche API:
 *   - window.GameBoot.start(mapUrl?:string)
 *
 * Eingehende Events:
 *   - 'cb:boot-request'      → optionaler Fallback-Start (boot.compat.js oder UI)
 *   - 'cb:engine-repaint'    → sofort Render.frame()
 *   - 'cb:render-frame'      → Render.frame()
 *
 * Ausgehende Events:
 *   - 'cb:engine-ready'      → sobald das Bootstrap bereit ist
 *   - 'cb:render-ready'      → kommt aus core.render.js
 * ========================================================================== */
(function(){
  'use strict';

  var MOD='[bootstrap]';
  var VER='v17.6.1';

  // --- kleine Logger ---------------------------------------------------------
  function ok(m){ try{ (window.CBLog?.ok||console.log)(MOD+' '+m);}catch(_){console.log(MOD+' '+m);} }
  function info(m){ try{ (window.CBLog?.info||console.log)(MOD+' '+m);}catch(_){console.log(MOD+' '+m);} }
  function warn(m){ try{ (window.CBLog?.warn||console.warn)(MOD+' '+m);}catch(_){console.warn(MOD+' '+m);} }
  function err(m){ try{ (window.CBLog?.err||console.error)(MOD+' '+m);}catch(_){console.error(MOD+' '+m);} }

  // --- State -----------------------------------------------------------------
  var _started = false;
  var _rafId   = 0;
  var _useEventPump = true;  // Standard: per Event "cb:render-frame"
  var _running = false;

  // --- Render Binding --------------------------------------------------------
  function ensureRenderInstalled(){
    try{
      if (!window.Render || typeof Render.frame!=='function'){
        warn('Render nicht bereit – versuche Auto-Init');
        try{ window.Render?.init?.(); }catch(_){}
      }

      // OverlayHooks: dem Renderer eine Repaint-Schnittstelle geben
      if (window.OverlayHooks && typeof OverlayHooks.installToRenderer==='function'){
        OverlayHooks.installToRenderer({
          requestRepaint: function(){
            // Entweder sofort zeichnen oder Event pumpen
            if (!_useEventPump){
              try{ Render.frame(); }catch(e){ warn('frame() fail: '+(e&&e.message)); }
            } else {
              try{ window.dispatchEvent(new Event('cb:render-frame')); }catch(_){}
            }
          }
        });
      }
    }catch(e){ warn('ensureRenderInstalled: '+(e&&e.message)); }
  }

  // --- Frame Pump ------------------------------------------------------------
  function pumpEventFrame(){
    try{ window.dispatchEvent(new Event('cb:render-frame')); }catch(_){}
  }

  function tick(){
    _rafId = 0;
    if (!_running) return;
    try{
      if (_useEventPump) pumpEventFrame();
      else Render?.frame?.();
    }catch(e){ warn('tick: '+(e&&e.message)); }
    _rafId = requestAnimationFrame(tick);
  }

  function startLoop(){
    if (_running) return;
    _running = true;
    _rafId = requestAnimationFrame(tick);
  }
  function stopLoop(){
    _running = false;
    if (_rafId){ cancelAnimationFrame(_rafId); _rafId=0; }
  }

  // Optional: bei Tab-Wechsel sparen
  try{
    document.addEventListener('visibilitychange', function(){
      if (document.hidden) stopLoop(); else startLoop();
    });
  }catch(_){}

  // --- Public Start ----------------------------------------------------------
  function doStart(mapUrl){
    if (_started){ warn('bereits gestartet'); return; }
    _started = true;

    ensureRenderInstalled();
    startLoop();

    // Legacy-Game.js bevorzugt starten, wenn vorhanden
    var usedLegacy = false;
    try{
      if (window.startGame && typeof startGame==='function'){
        usedLegacy = true;
        startGame({
          canvas: document.getElementById('game'),
          mapUrl: mapUrl || (document.getElementById('game')?.dataset?.map) || 'assets/maps/map-mini.json',
          onReady: function(){ ok('Legacy-Start (startGame) bereit'); }
        });
      } else if (window.Game && typeof Game.start==='function'){
        usedLegacy = true;
        Game.start(mapUrl || (document.getElementById('game')?.dataset?.map) || 'assets/maps/map-mini.json');
      }
    }catch(e){ err('Legacy-Start fehlgeschlagen: '+(e&&e.message)); }

    ok('ready ('+VER+')'+(usedLegacy?' [Legacy-Bridge aktiv]':' [Minimal-Engine aktiv]'));
    try{ window.dispatchEvent(new Event('cb:engine-ready')); }catch(_){}
  }

  // --- Event-Wires -----------------------------------------------------------
  // 1) Render-Frame aus Event heraus anstoßen (Engine kann das feuern)
  try{
    window.addEventListener('cb:render-frame', function(){
      try{ Render?.frame?.(); }catch(e){ warn('Render.frame() Fehler: '+(e&&e.message)); }
    });
  }catch(_){}

  // 2) „Sofort neu zeichnen“ Shortcuts (von Inspector/Overlay)
  try{
    window.addEventListener('cb:engine-repaint', function(){
      try{ Render?.frame?.(); }catch(e){ warn('Repaint Fehler: '+(e&&e.message)); }
    });
  }catch(_){}

  // 3) Fallback-Boot: wenn jemand „cb:boot-request“ feuert
  try{
    window.addEventListener('cb:boot-request', function(ev){
      var url = ev?.detail?.mapUrl || null;
      doStart(url);
    });
  }catch(_){}

  // --- Öffentliche API -------------------------------------------------------
  window.GameBoot = window.GameBoot || {};
  window.GameBoot.start = function(mapUrl){
    doStart(mapUrl);
  };

  // --- Auto-Init (sanft) -----------------------------------------------------
  function safeInit(){
    try{
      ensureRenderInstalled();
      // Falls jemand bereits cb:boot-request geschickt hat, sind wir startklar.
      ok('Modul geladen ('+VER+')');
    }catch(e){ warn('Init: '+(e&&e.message)); }
  }
  if (document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded', safeInit, {once:true});
  } else {
    safeInit();
  }

})();
