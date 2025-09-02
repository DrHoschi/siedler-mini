/* ============================================================================
 * Datei: assets/core/core.env.js
 * Version: v1.0.0
 * Zweck:
 *   - Gemeinsamer Namespace (window.GameCore)
 *   - Logging-Helfer (ok/warn/err) → nutzt CBLog falls vorhanden
 *   - Gemeinsamer State (map, camera, entities, roads etc.)
 *   - Kleine Utilities, die andere Module gefahrlos nutzen können
 * ========================================================================== */
(function(ns){
  'use strict';

  // --------------------------------------------------------------------------
  // Logging-Helfer (fallen sanft auf console zurück)
  // --------------------------------------------------------------------------
  function ok(){ (window.CBLog?.ok || console.log).apply(console, arguments); }
  function warn(){ (window.CBLog?.warn || console.warn).apply(console, arguments); }
  function err(){ (window.CBLog?.err || console.error).apply(console, arguments); }

  // --------------------------------------------------------------------------
  // Gemeinsamer State
  //   - map: { width, height, tile, layers, ... } (nach Map-Load gesetzt)
  //   - cam: Kamera in Pixelkoordinaten (x,y) + zoom
  //   - entities: Liste aller Gebäudeobjekte
  //   - roads: Set("x,y") mit Straßenkacheln (optional)
  //   - atlas / tilesetImg: Terrain-Atlas (falls vorhanden)
  // --------------------------------------------------------------------------
  var state = {
    map: null,
    cam: { x:0, y:0, zoom:1, minZ:0.5, maxZ:3 },
    entities: [],
    roads: new Set(),
    atlas: null,
    tilesetImg: null
  };

  // --------------------------------------------------------------------------
  // Utilities
  // --------------------------------------------------------------------------
  function clamp(v,a,b){ return Math.max(a, Math.min(b, v)); }

  // Public-Exports
  ns.ok   = ok;
  ns.warn = warn;
  ns.err  = err;
  ns.state = state;
  ns.util = { clamp: clamp };

})(window.GameCore = window.GameCore || {});
