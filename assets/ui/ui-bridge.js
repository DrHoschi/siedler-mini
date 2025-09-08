/* ============================================================================
 * Datei: assets/ui/ui-bridge.js
 * Version: v17.8.3
 * Aufgaben:
 *  - FAB-Buttons (Build/Inspector) zuverlässig schalten
 *  - Einheitliche CustomEvents: cb:build-open/close, cb:inspector-open/close/toggle
 *  - Fallback-Badge "Inspector lädt…" (nicht-blockierend)
 *  - Defensive: Funktioniert auch, wenn Inspector-Core noch nicht geladen ist
 * ============================================================================
 */
(function () {
  "use strict";

  const VER = "v17.8.3";
  const log  = (t, ...a) => (window.CBLog?.ok   || console.log)(`[ui-bridge] ${t}`, ...a);
  const warn = (t, ...a) => (window.CBLog?.warn || console.warn)(`[ui-bridge] ${t}`, ...a);

  // ----------------------- Build-Dock ---------------------------------------
  const Build = (() => {
    let open = false;
    const $ = id => document.getElementById(id);

    function ensurePanel() {
      const el = $("build-panel");
      if (!el) warn("Build-Panel fehlt (id=build-panel)");
      return el;
    }
    function doOpen() {
      const el = ensurePanel(); if (!el || open) return;
      open = true;
      el.classList.add("open");
      document.body.classList.add("has-build-open");
      window.dispatchEvent(new CustomEvent("cb:build-open"));
      log("Build geöffnet.");
    }
    function doClose() {
      const el = ensurePanel(); if (!el || !open) return;
      open = false;
      el.classList.remove("open");
      document.body.classList.remove("has-build-open");
      window.dispatchEvent(new CustomEvent("cb:build-close"));
      log("Build geschlossen.");
    }
    function toggle(force) {
      const el = ensurePanel(); if (!el) return;
      (force == null ? !open : !!force) ? doOpen() : doClose();
    }
    return { open: doOpen, close: doClose, toggle };
  })();

  // ----------------------- Inspector Bridge ---------------------------------
  const Inspector = (() => {
    // Kleines, unaufdringliches “lädt…”-Badge, falls Core noch nicht da ist
    function showProbe() {
      if (document.getElementById("inspector-probe")) return;
      const probe = document.createElement("div");
      probe.id = "inspector-probe";
      probe.textContent = "Inspector lädt…";
      probe.style.cssText =
        "position:fixed;right:16px;bottom:64px;z-index:2147483646;font:12px system-ui;" +
        "padding:6px 8px;border-radius:8px;border:1px solid rgba(255,255,255,.12);" +
        "background:rgba(30,30,35,.72);color:#cbd5e1;opacity:.85";
      document.body.appendChild(probe);
      setTimeout(() => probe.remove(), 2500);
    }

    function _open() {
      // 1) Wenn die API da ist, direkt nutzen
      if (window.__INSPECTOR_API__?.open) {
        window.__INSPECTOR_API__.open();
      } else {
        // 2) Sonst Event feuern (wird von compat-Shim/inspector.core gehandelt)
        window.dispatchEvent(new CustomEvent("cb:inspector-open"));
        showProbe();
      }
      log("Inspector open requested.");
    }

    function _close() {
      if (window.__INSPECTOR_API__?.close) {
        window.__INSPECTOR_API__.close();
      } else {
        window.dispatchEvent(new CustomEvent("cb:inspector-close"));
        showProbe();
      }
      log("Inspector close requested.");
    }

    function _toggle(force) {
      if (window.__INSPECTOR_API__?.toggle) {
        window.__INSPECTOR_API__.toggle(force);
      } else {
        // Kein API? → kompatibles Toggle-Event
        window.dispatchEvent(new CustomEvent("cb:inspector-toggle", { detail: { force } }));
        showProbe();
      }
      log("Inspector toggle requested.", force);
    }

    // Doppel-Toggle vermeiden: wenn Core die Events konsumiert, sind wir kompatibel.
    return { open: _open, close: _close, toggle: _toggle };
  })();

  // Öffentliche Oberfläche für die FABs
  window.GameUI = window.GameUI || {};
  window.GameUI.openBuild       = Build.open;
  window.GameUI.closeBuild      = Build.close;
  window.GameUI.toggleBuild     = Build.toggle;

  window.GameUI.openInspector   = Inspector.open;
  window.GameUI.closeInspector  = Inspector.close;
  window.GameUI.toggleInspector = Inspector.toggle;

  log(`bereit (${VER}).`);
})();
