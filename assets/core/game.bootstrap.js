/* ============================================================================
 * assets/core/game.bootstrap.js — Game-Facade
 * Version: v17.4.9
 * Projekt: Neue Siedler
 *
 * Aufgaben
 *  - Einmaliger Game-Start (Doppelstart verhindern)
 *  - Öffentliche Game-API für UI-Module:
 *      Game.setBuildTool(type) / Game.resetBuildTool()
 *      Game.addResources(type, amount)
 *      Game.getTileSize() / Game.getMapSize()
 *      Game.getObstacleAt(tx,ty) / Game.getRoadSet()
 *  - Brücke zu UI-Events (ui-start / ui-build / inspector tests)
 *  - Sanftes Logging via CBLog (Polyfill-kompatibel)
 * ========================================================================== */
(function () {
  'use strict';

  var VER = 'v17.4.9';
  var MOD = '[engine]';

  function ok(m){ try{ (window.CBLog?.ok||console.log)(m); }catch(_){ console.log(m); } }
  function warn(m){ try{ (window.CBLog?.warn||console.warn)(m); }catch(_){ console.warn(m); } }
  function err(m){ try{ (window.CBLog?.err||console.error)(m); }catch(_){ console.error(m); } }

  // ---------------------------------------------------------------------------
  // Interner Zustand
  // ---------------------------------------------------------------------------
  var started = false;
  var state = {
    mapUrl: null,
    tileSize: 64,
    buildTool: null,   // z.B. 'house' | 'farm' | ...
  };

  // kleine Helpers (ohne harte Engine-Abhängigkeiten)
  function readMapSize(){
    try{
      if (window.CoreMap && typeof CoreMap.getSize === 'function') {
        return CoreMap.getSize(); // {w,h}
      }
    }catch(_){}
    return null;
  }
  function readObstacleAt(tx,ty){
    try{
      if (window.CoreMap && typeof CoreMap.isBlocked === 'function') {
        return !!CoreMap.isBlocked(tx,ty);
      }
    }catch(_){}
    return false;
  }
  function readRoadSet(){
    try{
      if (window.CoreMap && typeof CoreMap.getRoadSet === 'function') {
        return CoreMap.getRoadSet(); // Set("x,y")
      }
    }catch(_){}
    return null;
  }

  // ---------------------------------------------------------------------------
  // Öffentliche API (globales Game-Objekt)
  // ---------------------------------------------------------------------------
  var Game = (window.Game = window.Game || {});

  Game.version = 'Facade '+VER;

  Game.start = function start(cfg){
    if (started){ warn('[bootstrap] bereits gestartet'); return; }
    started = true;

    // Bühne
    var canvas = (cfg && (cfg.canvas || document.getElementById('game'))) || document.getElementById('game');
    if (!canvas){ err(MOD+' Canvas nicht gefunden (#game)'); return; }

    // Map
    state.mapUrl = (cfg && cfg.mapUrl) || canvas.getAttribute('data-map') || 'assets/maps/map-mini.json';

    // Minimal-Engine Hinweis (Rendering steckt in core.render.js)
    ok(MOD+' Minimal-Engine aktiv (v17.4.0)');

    // Map laden
    try{
      window.dispatchEvent(new CustomEvent('cb:engine-start', {detail:{canvas}}));
      window.dispatchEvent(new CustomEvent('cb:map-load', {detail:{url: state.mapUrl}}));
      ok('GameLoader.start '+state.mapUrl);
    }catch(e){
      warn(MOD+' Map-Init Events fehlgeschlagen: '+(e&&e.message));
    }

    ok('Game gestartet ('+Game.version+')');
    window.dispatchEvent(new Event('cb:game-started'));
    return true;
  };

  // ---- Build-Tools ----------------------------------------------------------
  Game.setBuildTool = function(type){
    state.buildTool = (type || null);
    ok('[build] Tool gesetzt: '+(state.buildTool||'(none)'));
    try{
      window.dispatchEvent(new CustomEvent('cb:set-build-tool',{detail:{type: state.buildTool}}));
      window.dispatchEvent(new Event('cb:request-repaint'));
    }catch(_){}
  };

  Game.resetBuildTool = function(){
    if (!state.buildTool) return;
    state.buildTool = null;
    ok('[ok] Tool zurückgesetzt');
    try{
      window.dispatchEvent(new CustomEvent('cb:set-build-tool',{detail:{type:null}}));
      window.dispatchEvent(new Event('cb:request-repaint'));
    }catch(_){}
  };

  // ---- Ressourcen (für Inspector Tests) ------------------------------------
  Game.addResources = function(type, amount){
    try{
      window.dispatchEvent(new CustomEvent('cb:add-resources',{detail:{type,amount}}));
      ok('[res] +'+amount+' '+type);
    }catch(e){
      warn('[res] Event fehlgeschlagen: '+(e&&e.message));
    }
  };

  // ---- PF/Map Hooks (für PathFinder & Inspector) ---------------------------
  Game.getTileSize = function(){ return state.tileSize|0 || 64; };
  Game.getMapSize  = function(){ return readMapSize() || {w:0,h:0}; };
  Game.getObstacleAt = function(tx,ty){ return !!readObstacleAt(tx,ty); };
  Game.getRoadSet = function(){ return readRoadSet(); };

  // ---------------------------------------------------------------------------
  // UI-Brücken
  //  - ui-start: Start-Button löst cb:boot/start aus → wir rufen Game.start()
  //  - ui-build: sendet cb:build-select {type} → hier setzen wir Build-Tool
  //  - Inspector Tests: Path-Overlay Toggle via DEBUG_PATH_OVERLAY
  // ---------------------------------------------------------------------------

  // ui-start ruft i.d.R. GameUI.startGame(); wir absorbieren auch Direktaufrufe:
  window.addEventListener('cb:boot/start', function(ev){
    if (started) { warn('[bootstrap] bereits gestartet'); return; }
    var url = ev?.detail?.mapUrl || null;
    Game.start({ mapUrl:url });
  });

  // ui-build: gewünschtes Tool
  window.addEventListener('cb:build-select', function(ev){
    var t = ev && ev.detail && ev.detail.type;
    if (!t){ Game.resetBuildTool(); return; }
    Game.setBuildTool(t);
  });

  // Inspector: Path-Overlay-Toggle
  window.addEventListener('cb:toggle-path-overlay', function(ev){
    var enabled = !!(ev && ev.detail && ev.detail.enabled);
    window.DEBUG_PATH_OVERLAY = enabled;
    ok('[overlay] path '+(enabled?'AN':'AUS'));
    try{ window.dispatchEvent(new Event('cb:request-repaint')); }catch(_){}
  });

  // Optional: einfache Click-Place-Demo, falls die eigentliche Engine (core.input)
  // Platzierung NICHT übernimmt. Aktivierbar via Flag.
  var ALLOW_SIMPLE_PLACE = false;
  if (ALLOW_SIMPLE_PLACE){
    document.addEventListener('pointerdown', function(ev){
      if (!state.buildTool) return;
      try{
        var rect = (document.getElementById('game')||{}).getBoundingClientRect?.()||{left:0,top:0};
        var tile = Game.getTileSize();
        var tx = Math.max(0, Math.floor((ev.clientX - rect.left)/tile));
        var ty = Math.max(0, Math.floor((ev.clientY - rect.top)/tile));
        window.dispatchEvent(new CustomEvent('cb:place-building',{detail:{type:state.buildTool, x:tx, y:ty}}));
        ok('[ok] Gebäude platziert: '+state.buildTool+' at '+tx+' '+ty);
        Game.resetBuildTool();
      }catch(e){
        warn('[build] Simple-Place Fehler: '+(e&&e.message));
      }
    }, {passive:true});
  }

  // Auto-Start falls index.html direkt lädt (wie bisher)
  try{
    if (!started) {
      var canvas = document.getElementById('game');
      if (canvas){ Game.start({ canvas, mapUrl: canvas.getAttribute('data-map') }); }
    }
  }catch(e){
    err(MOD+' Startfehler: '+(e&&e.message));
  }

  ok(MOD+' ready ('+Game.version+')');
})();
