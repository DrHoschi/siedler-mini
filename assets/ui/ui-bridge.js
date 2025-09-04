/* ============================================================================
   assets/ui/ui-bridge.js — v17.8.0
   Aufgaben:
   - Öffnen/Schließen: Build-Panel & Inspector
   - Einheitliche Events: cb:build-open/close, cb:inspector-open/close
   - Body-Klasse "has-build-open" pflegen (für FAB-Hochrücken)
   - Defensive: funktioniert auch, wenn Inspector/Build noch nicht geladen
   CODE-STYLE:
   - Keine externen Abhängigkeiten
   - Sanfte Logs via CBLog (falls vorhanden), sonst console.log
   ============================================================================ */

(function () {
  "use strict";

  const VERSION = "v17.8.0";
  const log  = (t, ...a) => (window.CBLog?.ok || console.log)(`[ui-bridge] ${t}`, ...a);
  const warn = (t, ...a) => (window.CBLog?.warn || console.warn)(`[ui-bridge] ${t}`, ...a);

  // --- Build-Dock Steuerung -------------------------------------------------
  const Build = (() => {
    let open = false;
    const panel = () => document.getElementById("build-panel");

    function ensurePanel() {
      const el = panel();
      if (!el) { warn("Build-Panel fehlt (id=build-panel)."); }
      return el;
    }

    function _open() {
      const el = ensurePanel();
      if (!el) return;
      if (open) return;
      open = true;
      el.classList.add("open");
      document.body.classList.add("has-build-open");
      window.dispatchEvent(new CustomEvent("cb:build-open"));
      log("Build geöffnet (%s).", VERSION);
    }

    function _close() {
      const el = ensurePanel();
      if (!el) return;
      if (!open) return;
      open = false;
      el.classList.remove("open");
      document.body.classList.remove("has-build-open");
      window.dispatchEvent(new CustomEvent("cb:build-close"));
      log("Build geschlossen.");
    }

    function toggle(force) {
      const el = ensurePanel();
      if (!el) return;
      (force == null ? !open : !!force) ? _open() : _close();
    }

    return { open: _open, close: _close, toggle };
  })();

  // --- Inspector Bridge (nur API, UI kommt aus assets/inspector/inspector.js)
  const InspectorBridge = (() => {
    // Diese drei Funktionen werden von inspector.js überschrieben.
    // Falls inspector.js noch nicht geladen ist, liefern wir eine Fallback-UI.
    function fallbackEnsureBox() {
      let box = document.getElementById("inspector-fallback");
      if (!box) {
        box = document.createElement("div");
        box.id = "inspector-fallback";
        box.style.cssText =
          "position:fixed;right:16px;bottom:96px;max-width:90vw;width:420px;max-height:70vh;overflow:auto;" +
          "background:rgba(20,20,20,.94);color:#eee;border:1px solid #333;border-radius:10px;padding:12px;z-index:2147483646;" +
          "box-shadow:0 24px 64px rgba(0,0,0,.45)";
        box.textContent = "Inspector lädt…";
        document.body.appendChild(box);
      }
      return box;
    }

    function open() {
      if (window.__INSPECTOR_API__?.open) return window.__INSPECTOR_API__.open();
      const box = fallbackEnsureBox();
      box.style.display = "block";
      window.dispatchEvent(new CustomEvent("cb:inspector-open"));
      log("Inspector (Fallback) geöffnet.");
    }

    function close() {
      if (window.__INSPECTOR_API__?.close) return window.__INSPECTOR_API__.close();
      const box = document.getElementById("inspector-fallback");
      if (box) box.style.display = "none";
      window.dispatchEvent(new CustomEvent("cb:inspector-close"));
      log("Inspector (Fallback) geschlossen.");
    }

    function toggle(force) {
      if (window.__INSPECTOR_API__?.toggle) return window.__INSPECTOR_API__.toggle(force);
      const box = document.getElementById("inspector-fallback");
      const willOpen = force == null ? (box ? box.style.display === "none" : true) : !!force;
      willOpen ? open() : close();
    }

    return { open, close, toggle };
  })();

  // --- Öffentliche API für die FAB-Buttons ---------------------------------
  window.GameUI = window.GameUI || {};
  window.GameUI.toggleBuild     = Build.toggle;
  window.GameUI.openBuild       = Build.open;
  window.GameUI.closeBuild      = Build.close;

  window.GameUI.toggleInspector = InspectorBridge.toggle;
  window.GameUI.openInspector   = InspectorBridge.open;
  window.GameUI.closeInspector  = InspectorBridge.close;

  // Diagnose-Badge (klein rechts unten), falls Inspector nicht initialisiert wird
  (function tinyProbe() {
    setTimeout(() => {
      if (!window.__INSPECTOR_API__) {
        const probe = document.createElement("div");
        probe.textContent = "Inspector lädt…";
        probe.style.cssText =
          "position:fixed;right:16px;bottom:64px;font:12px/1.2 system-ui;opacity:.55;color:#cbd5e1;z-index:2147483646;" +
          "background:rgba(30,30,35,.72);padding:6px 8px;border-radius:8px;border:1px solid rgba(255,255,255,.06)";
        probe.id = "inspector-probe";
        document.body.appendChild(probe);
        setTimeout(() => probe.remove(), 4000);
      }
    }, 800);
  })();

  log("bereit (%s).", VERSION);
})();
