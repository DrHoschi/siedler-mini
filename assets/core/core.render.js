/* ============================================================================
 * Datei: assets/core/core.render.js
 * Projekt: Siedler-Mini
 * Version: v17.6.0
 *
 * CODE_STYLE / Garantien
 *  - Keine eigene Game-Loop – nur Zeichenfunktionen (pull-basiert).
 *  - Sanfte Logs via CBLog (fällt auf console.* zurück).
 *  - Abwärtskompatible Provider-Hooks:
 *      • setCameraProvider(fn)      -> fn() => {x,y,zoom} in Tiles
 *      • setMapDrawer(fn)           -> fn(ctx, cam)
 *      • setEntityDrawer(fn)        -> fn(ctx, cam)
 *  - Fallback-Zeichner (stubs), damit nie „schwarz“ gerendert wird.
 *  - OverlayHooks-Integration: OverlayHooks.draw(ctx, cam) nach Entities.
 *
 * Öffentliche API: window.Render
 *   Render.init({ canvas?:HTMLCanvasElement, ctx?:CanvasRenderingContext2D })
 *   Render.setCameraProvider(fn)
 *   Render.setMapDrawer(fn)
 *   Render.setEntityDrawer(fn)
 *   Render.frame()               // genau EIN Frame rendern
 *   Render.setEnabled(on)        // Renderer vorübergehend deaktivieren
 *   Render.getContext()          // ctx zurückgeben
 *
 * Events (empfangen):
 *   'cb:render-frame'            // Engine kann dieses Event feuern → Render.frame()
 *
 * Events (senden):
 *   'cb:render-ready'            // wenn init abgeschlossen ist
 * ========================================================================== */
(function(){
  'use strict';

  var MOD='[render]';
  var VER='v17.6.0';

  // ---- Logger ---------------------------------------------------------------
  function ok(m){ try{ (window.CBLog?.ok||console.log)(MOD+' '+m);}catch(_){console.log(MOD+' '+m);} }
  function warn(m){ try{ (window.CBLog?.warn||console.warn)(MOD+' '+m);}catch(_){console.warn(MOD+' '+m);} }
  function err(m){ try{ (window.CBLog?.err||console.error)(MOD+' '+m);}catch(_){console.error(MOD+' '+m);} }

  // ---- State ----------------------------------------------------------------
  var _canvas = null;
  var _ctx    = null;
  var _enabled = true;

  // Provider (werden von Engine/Bootstrap gesetzt)
  var _getCam = function(){
    try{
      if (window.Game && typeof Game.getCamera==='function') return Game.getCamera();
    }catch(_){}
    return { x:0, y:0, zoom:1 };
  };
  var _drawMap = function(ctx, cam){
    // Fallback: leichte Hintergrund-Markierung, damit man ein Bild hat
    try{
      var w = _canvas ? _canvas.width : (ctx.canvas?.width||800);
      var h = _canvas ? _canvas.height: (ctx.canvas?.height||600);
      ctx.save();
      ctx.fillStyle = '#0e1411';
      ctx.fillRect(0,0,w,h);
      ctx.fillStyle = 'rgba(255,255,255,.06)';
      for (var y=0;y<h;y+=64) for (var x=0;x<w;x+=64) ctx.fillRect(x,y,63,63);
      ctx.restore();
    }catch(_){}
  };
  var _drawEntities = function(ctx, cam){
    // Fallback: wenn Game.Entities existieren, minimal darstellen
    try{
      if (!window.Game || !Game.getEntities) return;
      var list = Game.getEntities(); if (!Array.isArray(list)) return;
      var tile = (Game.getTileSize && Game.getTileSize()) || 64;
      ctx.save();
      ctx.globalAlpha = 0.9;
      for (var i=0;i<list.length;i++){
        var e = list[i]; if (!e || typeof e.tx!=='number') continue;
        var sx = (e.tx - cam.x) * tile, sy = (e.ty - cam.y) * tile;
        // einfache Kachel (Placeholder)
        ctx.fillStyle = e.color || '#4ade80';
        ctx.fillRect(sx+2, sy+2, tile-4, tile-4);
      }
      ctx.restore();
    }catch(_){}
  };

  // ---- Helpers --------------------------------------------------------------
  function _ensureCtx(){
    if (_ctx) return true;
    try{
      if (!_canvas) _canvas = document.getElementById('game');
      if (_canvas && !_ctx) _ctx = _canvas.getContext('2d');
    }catch(e){
      _ctx = null;
    }
    return !!_ctx;
  }

  function _clear(ctx){
    try{
      var w = _canvas ? _canvas.width : (ctx.canvas?.width||0);
      var h = _canvas ? _canvas.height: (ctx.canvas?.height||0);
      if (w && h) ctx.clearRect(0,0,w,h);
    }catch(_){}
  }
  
  // ---- Ein Frame zeichnen ---------------------------------------------------
  function frame(){
    if (!_enabled) return;
    if (!_ensureCtx()){
      warn('kein Canvas/Context – frame() übersprungen');
      return;
    }

    var ctx = _ctx;
    var cam = _getCam() || {x:0,y:0,zoom:1};

    try{
      // (1) clear
      _clear(ctx);

      // (2) Map
      _drawMap(ctx, cam);

      // (3) Entities
      _drawEntities(ctx, cam);

      // (4) Debug-Overlays (PF, Heatmap, etc.) – genau HIER
      try{
        if (window.OverlayHooks && typeof OverlayHooks.draw==='function'){
          OverlayHooks.draw(ctx, cam); // <— Integration
        }
      }catch(e){ warn('Overlay draw: '+(e&&e.message)); }

      // (5) HUD/UI: außerhalb dieses Moduls, wir zeichnen absichtlich nichts

    }catch(e){
      err('Frame-Fehler: '+(e&&e.message));
    }
  }

  // ---- Öffentliche API ------------------------------------------------------
  var API = {
    version: VER,
    init: function(opt){
      opt = opt||{};
      _canvas = opt.canvas || _canvas || document.getElementById('game') || null;
      _ctx    = opt.ctx    || (_canvas ? _canvas.getContext('2d') : null);

      // sanftes Resize (optional, wenn Canvas existiert)
      try{
        if (_canvas && !opt.noResizeHandler){
          var fit = function(){
            _canvas.width  = Math.max(1, window.innerWidth|0);
            _canvas.height = Math.max(1, window.innerHeight|0);
          };
          window.addEventListener('resize', fit, {passive:true});
          fit();
        }
      }catch(_){}

      ok('Modul geladen ('+VER+')');
      try{ window.dispatchEvent(new Event('cb:render-ready')); }catch(_){}
      return API;
    },
    setCameraProvider: function(fn){
      if (typeof fn==='function') _getCam = fn;
      return API;
    },
    setMapDrawer: function(fn){
      if (typeof fn==='function') _drawMap = fn;
      return API;
    },
    setEntityDrawer: function(fn){
      if (typeof fn==='function') _drawEntities = fn;
      return API;
    },
    frame: frame,
    setEnabled: function(on){ _enabled = !!on; return API; },
    getContext: function(){ _ensureCtx(); return _ctx; }
  };

  // ---- Event-Wire -----------------------------------------------------------
  try{
    window.addEventListener('cb:render-frame', function(){ frame(); });
  }catch(_){}

  // ---- Export ---------------------------------------------------------------
  window.Render = API;

  // ---- Auto-Init (sanft) ----------------------------------------------------
  try{ API.init(); }catch(_){}

})();
