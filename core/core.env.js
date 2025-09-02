/* ============================================================================
 * core.env.js — v17.0.0
 * Projekt: Siedler-Mini
 * Zweck:
 *   - Gemeinsamer Namespace (window.GameCore)
 *   - Logging-Helfer (ok/warn/err) → nutzt CBLog, fällt auf console zurück
 *   - Zentraler Shared-State (Map, Kamera, Entities, Obstacles, Roads, Atlas)
 *   - Kleine Event-Hilfen (emit/on/off) via window-Events (CustomEvent)
 * Richtlinien:
 *   - Kein DOM-Zwang außer window-Events
 *   - Keine Abhängigkeit von anderen Core-Modulen
 * ========================================================================== */
(function(ns){
  'use strict';

  if (window.GameCore && window.GameCore.__ENV_READY__) {
    // Mehrfachladen vermeiden (Dev-Reload)
    return;
  }

  // --------------------------- Logging ---------------------------------------
  function _log(method, args){
    try {
      if (window.CBLog) {
        if (method === 'ok')   return window.CBLog.ok.apply(window.CBLog, args);
        if (method === 'warn') return window.CBLog.warn.apply(window.CBLog, args);
        if (method === 'err')  return window.CBLog.err.apply(window.CBLog, args);
        return window.CBLog.push.apply(window.CBLog, [method].concat([].slice.call(args)));
      }
    } catch(_) {}
    var c = (method==='err'?'error':method==='warn'?'warn':'log');
    (console[c]||console.log).apply(console, args);
  }
  ns.ok   = function(){ _log('ok',   arguments); };
  ns.warn = function(){ _log('warn', arguments); };
  ns.err  = function(){ _log('err',  arguments); };

  // --------------------------- Shared State ----------------------------------
  ns.state = {
    version: 'env:17.0.0',
    // Map/Atlas
    map: null,              // { width, height, tile, layers? }
    atlas: null,            // Tileset JSON
    tilesetImg: null,       // Image
    // Kamera
    cam: { x:0, y:0, zoom:1, minZ:0.5, maxZ:3 },
    // Entities
    entities: [],           // Array von Gebäude-Objekten
    nextEntityId: 1,
    // Obstacles (Tiles)
    obstacles: null,        // Uint8Array[w*h], 1 = blockiert
    obstW: 0, obstH: 0,
    // Straßen
    roads: new Set(),       // Set("x,y")
  };

  // --------------------------- Utils -----------------------------------------
  ns.util = {
    clamp: function(v,a,b){ return Math.max(a, Math.min(b, v)); },
    inb: function(x,y,w,h){ return x>=0 && y>=0 && x<w && y<h; },
    key: function(x,y){ return x+','+y; },
    // Event-Helfer: emit/on/off (thin wrapper um window)
    emit: function(name, detail){
      try { window.dispatchEvent(new CustomEvent(name, { detail: detail||null })); }
      catch(_) { /* IE etc. – ignorieren */ }
    },
    on: function(name, fn){ try{ window.addEventListener(name, fn); }catch(_){ /* noop */ } },
    off:function(name, fn){ try{ window.removeEventListener(name, fn); }catch(_){ /* noop */ } }
  };

  // Marker
  ns.__ENV_READY__ = true;
  ns.ok('[env] Core-Umgebung bereit (v17.0.0)');

})(window.GameCore = window.GameCore || {});
