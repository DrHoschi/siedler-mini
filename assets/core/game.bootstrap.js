/* ============================================================================
 * Datei: assets/core/game.bootstrap.js
 * Projekt: Siedler-Mini
 * Version: v17.1.0
 * Zweck:
 *   - Schlanker, aber vollständiger Bootstrap:
 *       • Canvas & Context beschaffen
 *       • Render.init + Input.bind
 *       • Map.load(mapUrl) → Production/Carriers/Overlay laufen lassen
 *       • Stabiler Game-Loop (dt clamp)
 *       • Engine/Spiel-Events: cb:engine-ready, cb:game-started
 *   - Öffentliche Fassade (window.Game) bleibt kompatibel:
 *       Game.setTool, getTileSize, getMapSize, getCamera,
 *       getObstacleAt, getRoadSet, notifyRoadChanged, addResources
 *
 * Hinweise:
 *   - Start erfolgt über GameBoot.start(mapUrl)
 *   - Auto-Start, wenn <canvas id="game" data-map="assets/maps/map-mini.json"> existiert.
 *   - Robust gegen mehrfachen Start (Guard-Flag).
 * ========================================================================== */
(function(){
  'use strict';

  var GC  = window.GameCore || {};
  var GL  = (window.GameLoader = window.GameLoader || {});
  var Game= (window.Game       = window.Game       || {});

  if (!GC || !GC.state){ console.error('[bootstrap] GameCore.env fehlt'); return; }

  var S = GC.state;
  var started = false;
  var canvas = null, ctx = null;
  var lastTS = 0, rafId = 0;

  // --------------------------- Loop ------------------------------------------
  function tick(){
    rafId = window.requestAnimationFrame(tick);
    var now = performance.now();
    if (!lastTS) lastTS = now;
    var dt = (now - lastTS) / 1000;
    if (dt > 0.1) dt = 0.1; // clamp
    lastTS = now;

    try { GC.Production && GC.Production.tick && GC.Production.tick(dt); } catch(_){}
    try { window.Carriers && Carriers.tick && Carriers.tick(dt); } catch(_){}
    try { GC.Render && GC.Render.draw && GC.Render.draw(); } catch(_){}
  }

  // --------------------------- Bootstrap -------------------------------------
  function ensureCanvas(){
    // vorhandene IDs unterstützen
    var c = document.getElementById('game') || document.getElementById('stage');
    if (!c){
      // Fallback: dynamisch erzeugen
      c = document.createElement('canvas');
      c.id = 'game';
      document.body.appendChild(c);
    }
    var context = c.getContext('2d');
    return { c:c, ctx:context };
  }

  function engineReadyOnce(){
    try { window.dispatchEvent(new CustomEvent('cb:engine-ready', { detail: { v:'17.1.0' } })); } catch(_){}
    GC.ok('[engine] ready (v17.1.0)');
  }

  function startInternal(mapUrl){
    if (started){ GC.warn('[bootstrap] bereits gestartet'); return Promise.resolve(true); }
    started = true;

    // Canvas & Module initialisieren
    var pair = ensureCanvas();
    canvas = pair.c; ctx = pair.ctx;

    // Merke sichtbare Größe für Map-clamp (optional)
    try{
      var rect = canvas.getBoundingClientRect();
      GC.__viewW__ = Math.max(320, Math.floor(rect.width || window.innerWidth || 800));
      GC.__viewH__ = Math.max(240, Math.floor(rect.height|| window.innerHeight|| 600));
    }catch(_){}

    // Render/Input start
    try { GC.Render && GC.Render.init && GC.Render.init(canvas, ctx); } catch(_){}
    try { GC.Input  && GC.Input.bind     && GC.Input.bind(canvas);     } catch(_){}
    engineReadyOnce();

    // Map laden
    return GC.Map.load(mapUrl).then(function(){
      // PF Overlay loop läuft in core.pfglue.js
      try { GC.PF && GC.PF.init && GC.PF.init(); } catch(_){}
      try { GC.PF && GC.PF.startOverlayLoop && GC.PF.startOverlayLoop(canvas); } catch(_){}

      // Loop
      if (rafId) cancelAnimationFrame(rafId);
      lastTS = performance.now();
      rafId = requestAnimationFrame(tick);
      return true;
    });
  }

  // --------------------------- GameBoot API ----------------------------------
  var GameBoot = (window.GameBoot = window.GameBoot || {});
  GameBoot.start = function(mapUrl){
    var url = mapUrl || autoMapUrl() || 'assets/maps/map-mini.json';
    GC.ok('[boot] Start via GameBoot.start', url);
    return startInternal(url);
  };

  function autoMapUrl(){
    try {
      var c = document.getElementById('game') || document.getElementById('stage');
      if (!c) return null;
      var dataUrl = c.getAttribute('data-map');
      return dataUrl && String(dataUrl);
    } catch(_){ return null; }
  }

  // --------------------------- Öffentliche Fassade ---------------------------
  function resolveKeySafe(k){
    try { return GC?.Entities?.resolveKey ? GC.Entities.resolveKey(k) : k; } catch(_){ return k; }
  }

  Game.setTool = Game.setTool || function(mode, payload){
    try{
      if (mode === 'build'){
        var key = (typeof payload==='string') ? payload : (payload && payload.key) || null;
        key = key ? resolveKeySafe(key) : null;
        window.__GC_TOOL__ = { mode:'build', key:key };
        (GC?.ok||console.log)('[build] Tool gesetzt:', key || '(none)');
      } else {
        window.__GC_TOOL__ = { mode: mode || null, key: null };
        if (mode===null) (GC?.ok||console.log)('[ok] Tool zurückgesetzt');
      }
    }catch(_){}
  };

  Game.getTileSize   = Game.getTileSize   || function(){ try{ return GC?.Map?.getTileSize?.() || 64; }catch(_){ return 64; } };
  Game.getMapSize    = Game.getMapSize    || function(){ try{ return GC?.Map?.getMapSize?.() || {w:0,h:0}; }catch(_){ return {w:0,h:0}; } };
  Game.getCamera     = Game.getCamera     || function(){ try{ return GC?.Map?.getCamera?.() || {x:0,y:0,zoom:1}; }catch(_){ return {x:0,y:0,zoom:1}; } };
  Game.getObstacleAt = Game.getObstacleAt || function(tx,ty){ try{ return !!GC?.Entities?.getObstacleAt?.(tx,ty); }catch(_){ return false; } };
  Game.getRoadSet    = Game.getRoadSet    || function(){ try{ return GC?.state?.roads || new Set(); }catch(_){ return new Set(); } };
  Game.notifyRoadChanged = Game.notifyRoadChanged || function(tx,ty,isRoad){
    try {
      var s = GC?.state?.roads; if (!s) return;
      var k = tx+','+ty; if (isRoad) s.add(k); else s.delete(k);
      if (window.PathFinder?.invalidateRoads) PathFinder.invalidateRoads();
    } catch(_){}
  };

  Game.addResources = Game.addResources || (function(){
    Game.resources = Game.resources || { wood:0, stone:0, food:0, gold:0 };
    return function(type, amount){
      var t=String(type||'').toLowerCase(), n=(amount|0)||0;
      if (!t || !n) return false;
      Game.resources[t] = (Game.resources[t]||0) + n;
      try { (GC?.ok||console.log)('[res] +'+n+' '+t+' (store='+Game.resources[t]+')'); } catch(_){}
      return true;
    };
  })();

  // --------------------------- Auto-Start ------------------------------------
  function autoStartIfPossible(){
    var url = autoMapUrl();
    if (!url) return;
    GameBoot.start(url);
  }
  if (document.readyState === 'complete' || document.readyState === 'interactive'){
    setTimeout(autoStartIfPossible, 0);
  } else {
    document.addEventListener('DOMContentLoaded', autoStartIfPossible);
  }

  // Hinweis
  GC.ok('[bootstrap] Modul geladen (v17.1.0)');

})();
