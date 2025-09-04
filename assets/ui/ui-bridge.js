/* ============================================================================
   assets/ui/ui-bridge.js — v17.8.1
   Aufgaben:
   - Öffnen/Schließen: Build-Panel & Inspector
   - Events: cb:build-open/close, cb:inspector-open/close, cb:inspector-ready (listener)
   - Body-Klasse "has-build-open" pflegen
   - Robust gegen „Inspector noch nicht geladen“
   ============================================================================ */
(function () {
  "use strict";

  const VERSION = "v17.8.1";
  const ok   = (t, ...a) => (window.CBLog?.ok   || console.log)(`[ui-bridge] ${t}`, ...a);
  const warn = (t, ...a) => (window.CBLog?.warn || console.warn)(`[ui-bridge] ${t}`, ...a);

  // ----------------------------- Build-Dock ----------------------------------
  const Build = (() => {
    let isOpen = false;
    const panel = () => document.getElementById("build-panel");

    const ensure = () => {
      const el = panel();
      if (!el) warn("Build-Panel fehlt (id=build-panel).");
      return el;
    };

    function open() {
      const el = ensure(); if (!el || isOpen) return;
      isOpen = true;
      el.classList.add("open");
      document.body.classList.add("has-build-open");
      window.dispatchEvent(new CustomEvent("cb:build-open"));
      ok("Build geöffnet (%s).", VERSION);
    }
    function close() {
      const el = ensure(); if (!el || !isOpen) return;
      isOpen = false;
      el.classList.remove("open");
      document.body.classList.remove("has-build-open");
      window.dispatchEvent(new CustomEvent("cb:build-close"));
      ok("Build geschlossen.");
    }
    function toggle(force) {
      const targetOpen = (force == null) ? !isOpen : !!force;
      targetOpen ? open() : close();
    }
    return { open, close, toggle };
  })();

  // --------------------------- Inspector Bridge ------------------------------
  const InspectorBridge = (() => {
    let probeEl = null;

    function removeProbe() {
      if (probeEl) { probeEl.remove(); probeEl = null; }
    }
    function ensureProbe() {
      if (probeEl || window.__INSPECTOR_API__) return;
      probeEl = document.createElement("div");
      probeEl.id = "inspector-probe";
      probeEl.textContent = "Inspector lädt…";
      probeEl.style.cssText =
        "position:fixed;right:16px;bottom:64px;font:12px/1.2 system-ui;opacity:.55;color:#cbd5e1;z-index:2147483646;" +
        "background:rgba(30,30,35,.72);padding:6px 8px;border-radius:8px;border:1px solid rgba(255,255,255,.06)";
      document.body.appendChild(probeEl);
    }

    // Fallback-Panel (nur bis __INSPECTOR_API__ da ist)
    function fallbackOpen() {
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
      box.style.display = "block";
    }
    function fallbackClose() {
      const box = document.getElementById("inspector-fallback");
      if (box) box.style.display = "none";
    }
    function fallbackDestroy() {
      const box = document.getElementById("inspector-fallback");
      if (box) box.remove();
    }

    function open() {
      if (window.__INSPECTOR_API__?.open) {
        fallbackDestroy(); removeProbe();
        return window.__INSPECTOR_API__.open();
      }
      fallbackOpen();
      window.dispatchEvent(new CustomEvent("cb:inspector-open"));
      ok("Inspector (Fallback) geöffnet.");
    }
    function close() {
      if (window.__INSPECTOR_API__?.close) return window.__INSPECTOR_API__.close();
      fallbackClose();
      window.dispatchEvent(new CustomEvent("cb:inspector-close"));
      ok("Inspector (Fallback) geschlossen.");
    }
    function toggle(force) {
      if (window.__INSPECTOR_API__?.toggle) {
        fallbackDestroy(); removeProbe();
        return window.__INSPECTOR_API__.toggle(force);
      }
      const box = document.getElementById("inspector-fallback");
      const willOpen = (force == null) ? !(box && box.style.display !== "none") : !!force;
      willOpen ? open() : close();
    }

    // Nach ~1,2s kleine Probe einblenden (kein Flackern direkt beim Laden)
    setTimeout(() => { if (!window.__INSPECTOR_API__) ensureProbe(); }, 1200);

    // Wenn der Inspector bereit ist: Probe + Fallback weg
    window.addEventListener("cb:inspector-ready", () => {
      removeProbe();
      fallbackDestroy();
      ok("Inspector ready signal empfangen.");
    }, { once: false });

    return { open, close, toggle };
  })();

  // ----------------------------- Public API ---------------------------------
  window.GameUI = window.GameUI || {};
  window.GameUI.toggleBuild     = Build.toggle;
  window.GameUI.openBuild       = Build.open;
  window.GameUI.closeBuild      = Build.close;

  window.GameUI.toggleInspector = InspectorBridge.toggle;
  window.GameUI.openInspector   = InspectorBridge.open;
  window.GameUI.closeInspector  = InspectorBridge.close;

  ok("bereit (%s).", VERSION);
})();
