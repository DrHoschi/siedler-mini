/* ============================================================================
 * core.env.js — v0.1.0
 * Projekt: Siedler-Mini
 * Zweck:
 *   - Gemeinsamer Namespace (window.GameCore)
 *   - Logging-Wrapper (CBLog-freundlich)
 *   - Globaler State: map, cam, entities, obstacles, roads, atlas, tilesetImg
 *   - Utility-Funktionen (Indexierung, Bounds, Events)
 * Design:
 *   - ES5 + IIFE, keine externen Abhängigkeiten
 *   - Bewusst „schlank“ gehalten, damit andere Module locker darauf aufbauen
 * ========================================================================== */
(function (ns) {
  'use strict';

  // ----------------------------------------------------------
  // Logging (sanft; fällt auf console.* zurück)
  // ----------------------------------------------------------
  function ok()  { try { (window.CBLog?.ok   || console.log  ).apply(console, arguments); } catch(_){} }
  function warn(){ try { (window.CBLog?.warn || console.warn ).apply(console, arguments); } catch(_){} }
  function err() { try { (window.CBLog?.err  || console.error).apply(console, arguments); } catch(_){} }

  // ----------------------------------------------------------
  // Event-Helpers
  // ----------------------------------------------------------
  function emit(name, detail){
    try { window.dispatchEvent(new CustomEvent(name, { detail: detail || {} })); } catch(_){}
  }

  // ----------------------------------------------------------
  // Globaler State (wird von Modulen gemeinsam verwendet)
  // ----------------------------------------------------------
  var state = {
    // Karte & Kamera
    map: null, // {width,height,tile,layers?}
    cam: { x:0, y:0, zoom:1, minZ:0.5, maxZ:3 },

    // Entities & Blocking
    entities: [], // Array<entity>
    obstacles: null, // Uint8Array[w*h] (1 = blockiert)
    obstW: 0, obstH: 0,

    // Straßen als Set("x,y")
    roads: new Set(),

    // Rendering-Assets (optional)
    atlas: null,
    tilesetImg: null
  };

  // ----------------------------------------------------------
  // Utilities (Tile-Grid)
  // ----------------------------------------------------------
  function idx(x,y,w){ return y*w + x; }
  function inb(x,y,w,h){ return x>=0 && y>=0 && x<w && y<h; }

  // ----------------------------------------------------------
  // Namespace exportieren
  // ----------------------------------------------------------
  ns.ok = ok; ns.warn = warn; ns.err = err;
  ns.emit = emit;
  ns.state = state;
  ns.u = { idx: idx, inb: inb };
  ns.VERSION_ENV = 'v0.1.0';

  ok('[core.env] bereit (%s)', ns.VERSION_ENV);

})(window.GameCore = window.GameCore || {});
