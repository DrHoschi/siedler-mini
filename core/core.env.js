/* ============================================================================
 * Datei   : core.env.js
 * Projekt : Neue Siedler
 * Version : v25.10.25-final
 *
 * Zweck   : "Env-Shim" – Gemeinsame, schmale Oberfläche:
 *           • Einheitliche Logs (CBLog) → ok/info/warn/error
 *           • Event-Helfer: emit/on/off (window.CustomEvent)
 *           • Lesende Proxy-Getter auf zentrale Zustände (Kamera, Entities, Map)
 *             → KEINE zweite State-Kopie mehr! (Verhindert Divergenzen)
 *
 * Struktur: Imports → Konstanten → Hilfsfunktionen → Klassen → Hauptlogik → Exports
 * API     : window.GameCore = {
 *             ok/info/warn/error,            // Logger
 *             util: { emit,on,off, clamp,inb,key },
 *             state: {                       // nur LESEN (Proxys)
 *               get cam()      → GameCamera,
 *               get entities() → Entities.state.list,
 *               get map()      → Game.map (falls vorhanden),
 *               get obstacles()→ Game.getObstacleGrid?(),
 *               get tileSize() → Game.tileSize|64
 *             },
 *             version: 'env:25.10.25'
 *           }
 *
 * Hinweise:
 *   – Schreibzugriffe auf GameCore.state sind bewusst nicht vorgesehen.
 *   – Für neue Daten bitte die dafür vorgesehenen Module verwenden
 *     (z. B. Registry, Camera, Entities, Game).
 * ============================================================================ */
(function(ns){
  'use strict';

  // Mehrfachladen vermeiden (Dev-Reload)
  if (ns && ns.__ENV_READY__) return;

  /* ==========================================================================
   * [Imports / Logger]
   * ========================================================================== */
  function _log(level, args){
    try {
      if (window.CBLog) {
        if (level === 'ok')    return window.CBLog.ok(...args);
        if (level === 'info')  return window.CBLog.info(...args);
        if (level === 'warn')  return window.CBLog.warn(...args);
        if (level === 'error') return window.CBLog.error(...args);
      }
    } catch(_) {}
    const c = (level==='error' ? 'error' : level==='warn' ? 'warn' : 'log');
    (console[c]||console.log).apply(console, args);
  }
  function ok(){    _log('ok',    arguments); }
  function info(){  _log('info',  arguments); }
  function warn(){  _log('warn',  arguments); }
  function error(){ _log('error', arguments); }

  /* ==========================================================================
   * [Hilfsfunktionen]
   * ========================================================================== */
  const util = {
    clamp(v,a,b){ return Math.max(a, Math.min(b, v)); },
    inb(x,y,w,h){ return x>=0 && y>=0 && x<w && y<h; },
    key(x,y){ return `${x},${y}`; },

    // Window-Event Thin-Wrapper
    emit(name, detail){
      try { window.dispatchEvent(new CustomEvent(name, { detail: detail ?? null })); }
      catch(_) { /* noop */ }
    },
    on(name, fn){  try { window.addEventListener(name, fn); }  catch(_){} },
    off(name, fn){ try { window.removeEventListener(name, fn);} catch(_){} }
  };

  /* ==========================================================================
   * [State-Proxy – READ ONLY]
   *  Keine zweite Kopie! Wir spiegeln live die führenden Module:
   *   – Kamera:   window.GameCamera  ({x,y,zoom})
   *   – Entities: window.Entities.state.list
   *   – Map:      window.Game?.map (falls vorhanden)
   *   – Obstacles: bevorzugt Game.getObstacleGrid() → { data, width, height }
   *   – tileSize: window.Game?.tileSize || 64
   * ========================================================================== */
  const stateProxy = {};
  Object.defineProperties(stateProxy, {
    cam: {
      enumerable: true,
      get(){ 
        const c = window.GameCamera || {};
        return { x: c.x ?? 0, y: c.y ?? 0, zoom: c.zoom ?? 1 };
      }
    },
    entities: {
      enumerable: true,
      get(){
        const E = window.Entities?.state?.list;
        return Array.isArray(E) ? E : [];
      }
    },
    map: {
      enumerable: true,
      get(){ return window.Game?.map ?? null; }
    },
    obstacles: {
      enumerable: true,
      get(){
        try{
          if (typeof window.Game?.getObstacleGrid === 'function') {
            return window.Game.getObstacleGrid(); // { data:Uint8Array, width, height }
          }
        }catch(_){}
        return null;
      }
    },
    tileSize: {
      enumerable: true,
      get(){ return window.Game?.tileSize ?? 64; }
    },
    version: {
      enumerable: true,
      get(){ return 'env:25.10.25'; }
    }
  });

  /* ==========================================================================
   * [Exports]
   * ========================================================================== */
  const GameCore = ns || {};
  GameCore.ok    = ok;
  GameCore.info  = info;
  GameCore.warn  = warn;
  GameCore.error = error;

  GameCore.util  = util;
  GameCore.state = stateProxy;

  GameCore.__ENV_READY__ = true;

  window.GameCore = GameCore;
  ok('[env] Core-Umgebung bereit (env:25.10.25)');

})(window.GameCore = window.GameCore || {});
