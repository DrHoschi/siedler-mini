/* ============================================================================
 * ui-bridge.js  –  minimale Brücke zwischen UI-Buttons und App-Events
 * Version: v17.8.3
 *  - Stellt GameUI bereit
 *  - Feuert CustomEvents für Inspector/Build
 *  - KEIN Fallback-Overlay/HTML!
 * ========================================================================== */
(function () {
  "use strict";

  const MOD = "[ui-bridge]";
  const ok   = (...a) => (window.CBLog?.ok   || console.log).call(console, MOD, ...a);
  const warn = (...a) => (window.CBLog?.warn || console.warn).call(console, MOD, ...a);

  // Hilfsfunktion: sicheres Event-Dispatching
  function emit(name, detail) {
    try {
      document.dispatchEvent(new CustomEvent(name, { detail }));
    } catch (e) {
      warn("Event-Dispatch fehlgeschlagen:", name, e);
    }
  }

  // Public API-Container
  const API = (window.GameUI = window.GameUI || {});

  // --- Inspector ------------------------------------------------------------
  API.openInspector = () => {
    emit("cb:inspector-open");
    ok("Inspector open requested");
  };

  API.closeInspector = () => {
    emit("cb:inspector-close");
    ok("Inspector close requested");
  };

  API.toggleInspector = () => {
    // Primär über Events (darauf hört inspector.core.js)
    emit("cb:inspector-toggle");

    // Optionaler Direktaufruf, falls Core-API schon bereit ist (No-Op, wenn nicht)
    try {
      window.__INSPECTOR_CORE__?.api?.toggle?.();
    } catch (_e) {}
    ok("Inspector toggle requested");
  };

  // --- Build-Dock (nur Weitergabe des Toggles, wie bisher) ------------------
  API.toggleBuild = () => {
    emit("cb:build-toggle");
    ok("Build toggle requested");
  };

  ok("gebunden (v17.8.3)");
})();
