/* ============================================================================
 * assets/inspector/inspector.js — v18.10.4 (Shim)
 * Projekt: Siedler-Mini
 * Zweck:
 *   - Backwards-Compat: lädt die neuen Split-Module (core/logs/build/paths/tests),
 *     falls sie noch nicht per <script> im index eingebunden wurden.
 *   - Verhindert Doppel-Init, wenn Split bereits aktiv ist.
 * Logs: nutzt CBLog, fällt auf console.* zurück.
 * ========================================================================== */
(function () {
  'use strict';

  var log  = (window.CBLog && (CBLog.info||CBLog.log)) || console.log.bind(console);
  var warn = (window.CBLog && CBLog.warn) || console.warn.bind(console);

  // Wenn der Split-Inspector bereits die Ready-Flag gesetzt hat → nichts tun
  if (window.__INSPECTOR_SPLIT_READY__) {
    log('[inspector.shim] Split bereits aktiv – Shim macht nichts.');
    return;
  }

  // Hilfsloader
  function load(src){
    return new Promise(function(res, rej){
      var s = document.createElement('script');
      s.defer = true;
      s.src = src;
      s.onload = function(){ res(); };
      s.onerror = function(){ rej(new Error('Script konnte nicht geladen werden: ' + src)); };
      document.head.appendChild(s);
    });
  }

  // Basis-Pfad
  var base = 'assets/inspector/';
  var ver  = 'v18.10.4';

  // CSS sicherstellen (nur falls noch nicht vorhanden)
  (function ensureCss(){
    var haveCss = !!document.querySelector('link[href*="assets/inspector/inspector.css"]');
    if (!haveCss){
      var link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = base + 'inspector.css?' + ver;
      document.head.appendChild(link);
      log('[inspector.shim] CSS injiziert.');
    }
  })();

  // Split-Module in Reihenfolge laden
  Promise.resolve()
    .then(function(){ return load(base + 'inspector.core.js?'  + ver); })
    .then(function(){ return load(base + 'inspector.logs.js?'  + ver); })
    .then(function(){ return load(base + 'inspector.build.js?' + ver); })
    .then(function(){ return load(base + 'inspector.paths.js?' + ver); })
    .then(function(){ return load(base + 'inspector.tests.js?' + ver); })
    .then(function(){
      log('[inspector.shim] Split-Module geladen.');
      // Falls Core eine Init-Funktion bereitstellt, sicherheitshalber triggern
      try {
        if (window.Inspector && typeof window.Inspector.init === 'function') {
          window.Inspector.init();
          log('[inspector.shim] Inspector.init() aufgerufen.');
        }
      } catch (e){
        warn('[inspector.shim] Init-Call fehlgeschlagen: ' + (e && e.message));
      }
    })
    .catch(function(e){
      warn('[inspector.shim] Fallback fehlgeschlagen: ' + (e && e.message));
    });
})();
