/* ============================================================================
 * Datei: core/overlay-hooks.js
 * Projekt: Siedler-Mini
 * Version: v18.2.0
 *
 * Zweck / Überblick
 *  - Brücke zwischen Inspector-Events und Engine/Renderer/Pathfinder
 *  - Stellt globale Debug-Flags bereit (sanft)
 *  - Reagiert auf cb:* Events (Overlay, Heatmap, Koll., Türen, Trampelpfade)
 *  - Repaint-Trigger (cb:request-repaint)
 *  - Pfad-Tests (random/single) via PathFinder.findPath(...)
 *  - Kennzahlen sammeln und als cb:pf-stats emittieren
 *  - Zeichnet Overlay (Heatmap + letzte Pfade) via PathFinder.drawOverlay(...)
 *
 * Öffentliche API (attach an window):
 *   - window.OverlayHooks.installToRenderer(renderer)
 *       renderer muss { requestRepaint: fn? } optional anbieten.
 *   - window.OverlayHooks.draw(ctx, cam)
 *       von der Render-Loop pro Frame aufrufen (nach der Map/Entities).
 *   - window.OverlayHooks.requestRepaint()
 *
 * Erwartete optionale Spiel-Hooks:
 *   - Game.getMapSize() -> { w, h }
 *   - Game.getTileSize() -> number
 *   - Game.worldToTile(px, py) -> {x, y}         (nur falls single-Test Klicks o.ä.)
 *   - Game.isBlocked(tx, ty) -> boolean          (falls vorhanden)
 *
 * Erwartete optionale PF-API:
 *   - PathFinder.init(getMapSizeFn)
 *   - PathFinder.findPath({ from:{x,y}, to:{x,y}, mode:'auto'|'roads'|'offroad' })
 *   - PathFinder.applyHeat(path)
 *   - PathFinder.drawOverlay(ctx, cam)
 *
 * Logs: CBLog (Polyfill empfohlen), sanfter Fallback auf console.*
 * ============================================================================ */
(function(){
  'use strict';

  var MOD='[overlay]';
  var VER='v18.2.0';

  // ---------------- Logger ---------------------------------------------------
  function L_ok(m){ try{ (window.CBLog?.ok||console.log)(MOD+' '+m);}catch(_){console.log(MOD+' '+m);} }
  function L_warn(m){ try{ (window.CBLog?.warn||console.warn)(MOD+' '+m);}catch(_){console.warn(MOD+' '+m);} }
  function L_err(m){ try{ (window.CBLog?.err||console.error)(MOD+' '+m);}catch(_){console.error(MOD+' '+m);} }

  // ---------------- State ----------------------------------------------------
  var RENDER = null;          // optionale Renderer-Schnittstelle
  var DRAW_ENABLED = true;    // ob draw() aktiv ist

  // Debug-Flags (sanft – werden vom Inspector gesetzt)
  window.DEBUG_PATH_OVERLAY = !!window.DEBUG_PATH_OVERLAY;
  window.DEBUG_HEATMAP      = !!window.DEBUG_HEATMAP;
  window.DEBUG_COLLISION    = !!window.DEBUG_COLLISION;
  window.DEBUG_TRAMPEL      = !!window.DEBUG_TRAMPEL;
  window.DEBUG_DOORS        = !!window.DEBUG_DOORS;

  // Stats
  var stat = {
    lastTick: 0,
    fps: 0,
    frames: 0,
    framesAccMs: 0,

    activePaths: 0,
    avgPathLen: 0,
    blockedPaths: 0,

    // Sliding windows
    _pathLens: [],     // letzte N Pfadlängen
    _maxKeep: 64
  };

  function pushPathLen(n){
    if (!isFinite(n)) return;
    stat._pathLens.push(n|0);
    if (stat._pathLens.length > stat._maxKeep) stat._pathLens.shift();
    var sum=0;
    for (var i=0;i<stat._pathLens.length;i++) sum+=stat._pathLens[i];
    stat.avgPathLen = stat._pathLens.length ? (sum / stat._pathLens.length)|0 : 0;
  }

  // ---------------- Repaint --------------------------------------------------
  function requestRepaint(){
    try{
      if (RENDER && typeof RENDER.requestRepaint==='function'){
        RENDER.requestRepaint();
      } else {
        // Notanker: UI/Engine können auf dieses Event hören
        window.dispatchEvent(new Event('cb:engine-repaint'));
      }
    }catch(_){}
  }

  // ---------------- Draw Hook -----------------------------------------------
  // Vom Renderer pro Frame aufrufen: OverlayHooks.draw(ctx, cam)
  // cam: { x, y, zoom } in Tiles (kompatibel zu PF.drawOverlay)
  function draw(ctx, cam){
    // FPS/Stats
    var now = performance.now();
    if (stat.lastTick===0) stat.lastTick = now;
    var dt = now - stat.lastTick;
    stat.lastTick = now;
    stat.frames++;
    stat.framesAccMs += dt;
    if (stat.framesAccMs >= 500){
      stat.fps = Math.round( stat.frames * 1000 / stat.framesAccMs );
      stat.frames = 0; stat.framesAccMs = 0;
      // Stats event rausfeuern (damit Inspector live anzeigen kann)
      try{
        window.dispatchEvent(new CustomEvent('cb:pf-stats', {
          detail:{ fps: stat.fps, active: stat.activePaths, avglen: stat.avgPathLen, blocked: stat.blockedPaths }
        }));
      }catch(_){}
    }

    if (!DRAW_ENABLED) return;
    if (!window.DEBUG_PATH_OVERLAY && !window.DEBUG_HEATMAP) return;

    try{
      if (window.PathFinder && typeof PathFinder.drawOverlay==='function'){
        PathFinder.drawOverlay(ctx, cam);
      } else {
        // Minimaler Fallback: Nichts zu zeichnen
      }
    }catch(e){
      L_warn('Overlay draw Fehler: '+(e&&e.message));
    }
  }

  // ---------------- Pfad-Tests ----------------------------------------------
  function randInt(a,b){ return (a + Math.floor(Math.random()*(b-a+1))); }

  // Liefert ein zufälliges, betretbares Tile – ‚best effort‘
  function randomWalkableTile(maxTry){
    maxTry = maxTry || 80;
    var sz = (window.Game && typeof Game.getMapSize==='function') ? Game.getMapSize() : {w:16, h:10};
    for (var t=0;t<maxTry;t++){
      var x = randInt(0, sz.w-1), y = randInt(0, sz.h-1);
      try{
        if (window.Game && typeof Game.isBlocked==='function'){
          if (Game.isBlocked(x,y)) continue;
        }
      }catch(_){}
      return {x:x,y:y};
    }
    return {x:0,y:0};
  }

  function testSingle(){
    if (!window.PathFinder || typeof PathFinder.findPath!=='function'){
      L_warn('PF nicht verfügbar – Single-Test übersprungen.');
      return;
    }
    var a = randomWalkableTile(), b = randomWalkableTile();
    var path = PathFinder.findPath({ from:a, to:b, mode:'auto' });
    if (path && path.length){
      stat.activePaths++;
      pushPathLen(path.length);
      try{ PathFinder.applyHeat?.(path); }catch(_){}
      L_ok('PF single: '+a.x+','+a.y+' → '+b.x+','+b.y+' | len='+path.length);
    } else {
      stat.blockedPaths++;
      L_warn('PF single: kein Pfad '+a.x+','+a.y+' → '+b.x+','+b.y);
    }
    requestRepaint();
  }

  function testRandom(n){
    n = Math.max(1, n|0);
    for (var i=0;i<n;i++) testSingle();
  }

  // ---------------- Event-Bindings (Inspector) ------------------------------
  function setFlag(name, on){
    try{ window[name]=!!on; }catch(_){}
    // Optional: falls Game Debug-Flags trackt
    try{ (window.Game && Game.setDebugFlag) && Game.setDebugFlag(name, !!on); }catch(_){}
  }

  window.addEventListener('cb:toggle-path-overlay', function(ev){
    var on = !!(ev.detail && ev.detail.enabled);
    setFlag('DEBUG_PATH_OVERLAY', on);
    L_ok('Overlay '+(on?'AN':'AUS'));
    requestRepaint();
  });

  window.addEventListener('cb:toggle-heatmap', function(ev){
    var on = !!(ev.detail && ev.detail.enabled);
    setFlag('DEBUG_HEATMAP', on);
    L_ok('Heatmap '+(on?'AN':'AUS'));
    requestRepaint();
  });

  window.addEventListener('cb:toggle-collision', function(ev){
    var on = !!(ev.detail && ev.detail.enabled);
    setFlag('DEBUG_COLLISION', on);
    L_ok('Kollision '+(on?'AN':'AUS'));
    requestRepaint();
  });

  window.addEventListener('cb:toggle-trample', function(ev){
    var on = !!(ev.detail && ev.detail.enabled);
    setFlag('DEBUG_TRAMPEL', on);
    L_ok('Trampelpfade '+(on?'AN':'AUS'));
    requestRepaint();
  });

  window.addEventListener('cb:toggle-doors', function(ev){
    var on = !!(ev.detail && ev.detail.enabled);
    setFlag('DEBUG_DOORS', on);
    L_ok('Türkacheln '+(on?'AN':'AUS'));
    requestRepaint();
  });

  window.addEventListener('cb:request-repaint', function(){
    requestRepaint();
  });

  window.addEventListener('cb:path-test', function(ev){
    var d = ev.detail || {};
    if (d.mode === 'random'){
      var n = Math.max(1, d.count|0);
      testRandom(n);
    } else {
      testSingle();
    }
  });

  // ---------------- Öffentliche API -----------------------------------------
  var API = {
    version: VER,

    /**
     * Bindet einen optionalen Renderer. Wenn vorhanden, wird dessen
     * requestRepaint() benutzt; sonst senden wir cb:engine-repaint.
     */
    installToRenderer: function(renderer){
      RENDER = renderer || null;
      L_ok('Renderer installiert: '+(RENDER?'ja':'nein'));
    },

    /**
     * Soll in der Render-Loop gerufen werden.
     * @param {CanvasRenderingContext2D} ctx
     * @param {{x:number,y:number,zoom:number}} cam - Kameraposition in Tiles
     */
    draw: function(ctx, cam){
      try{ draw(ctx, cam); }catch(e){ L_warn('draw() Fehler: '+(e&&e.message)); }
    },

    /** Von überall anforderbar */
    requestRepaint: requestRepaint,

    /** Debug flags spiegeln (optional) */
    setEnabled: function(on){ DRAW_ENABLED = !!on; },

    /** Stats abrufen */
    getStats: function(){
      return {
        fps: stat.fps,
        active: stat.activePaths,
        avglen: stat.avgPathLen|0,
        blocked: stat.blockedPaths|0
      };
    }
  };

  // ---------------- Export ---------------------------------------------------
  window.OverlayHooks = API;
  L_ok('Modul geladen ('+VER+')');

  // Optional: kleines Autowire – falls PF Mapgrößen braucht und Game existiert
  try{
    if (window.PathFinder && typeof PathFinder.init==='function' &&
        window.Game && typeof Game.getMapSize==='function'){
      PathFinder.init(Game.getMapSize);
    }
  }catch(_){}

})();
