/* ============================================================================
 * Datei   : core/core.render.js
 * Projekt : Neue Siedler – Engine
 * Version : v18.1.0 (2025-10-02)
 * Zweck   : PASSIVER Shim. Historisch gab es hier eine eigene Render-Loop.
 *           In der aktuellen Architektur rendert die Game-Engine (core/game.js)
 *           selbst pro Frame und ruft map.draw(), Ghost/Units etc.
 *
 * Verhalten:
 *   - Keine eigene Animation-Loop.
 *   - Keine automatische Initialisierung auf cb:game-start.
 *   - Stellt nur eine optionale API bereit (init/stop), falls später benötigt.
 *
 * Warum? Doppel-Render (core.render.js + game.js) führte zu Chaos/Flackern.
 *       Mit diesem Shim bleibt Rückwärtskompatibilität gewahrt, ohne zu stören.
 * ============================================================================ */
(() => {
  'use strict';
  const TAG  = '[render/shim]';
  const LOG  = (...a) => (window.CBLog?.info  || console.log)(TAG, ...a);
  const WARN = (...a) => (window.CBLog?.warn  || console.warn)(TAG, ...a);

  let _active = false;

  function init(){
    if (_active) return;
    _active = true;
    LOG('aktiviert (Shim) – keine eigene Loop, Game rendert.');
  }
  function stop(){
    _active = false;
    LOG('gestoppt (Shim).');
  }

  // Exporte (falls alte Aufrufer existieren)
  window.Render = window.Render || {};
  window.Render.init = init;
  window.Render.stop = stop;

  // NICHT automatisch starten – Game hat die Kontrolle.
  WARN('geladen (Shim). Game steuert die Render-Loop.');
})();
