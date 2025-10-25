/* ============================================================================
 * Datei   : core/map.runtime.bridge.js
 * Zweck   : Bridge für <canvas id="game" data-map="..."> → neues MapRuntime nutzen
 * Hinweis : keine eigene RAF-Loop; respektiert Render-Shim + GameCamera
 * ========================================================================== */
(() => {
  'use strict';
  const TAG = '[map-bridge]';
  const LOG = (...a)=> (window.CBLog?.info ?? console.log)(TAG, ...a);

  function init() {
    const cv = document.getElementById('game');
    if (!cv) return;
    const url = cv.getAttribute('data-map');
    if (!url) return;

    // Neue MapRuntime initialisieren (macht intern kein RAF)
    try { window.MapRuntime?.init?.(cv); } catch {}

    // Map laden
    (async () => {
      try {
        await window.MapRuntime?.loadMap?.(url);
        // ersten Frame anfordern
        window.dispatchEvent(new Event('cb:request-repaint'));
        LOG('Map geladen via Bridge:', url);
      } catch (e) {
        (window.CBLog?.warn ?? console.warn)(TAG, 'Map laden fehlgeschlagen:', e?.message||e);
      }
    })();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once:true });
  } else {
    init();
  }
})();
