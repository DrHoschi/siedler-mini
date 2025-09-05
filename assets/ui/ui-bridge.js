/* ============================================================================
 * assets/ui/ui-bridge.js — v17.8.3
 * Aufgaben:
 *  - Öffnen/Schließen: Build-Panel & Inspector (über __INSPECTOR_API__)
 *  - Events: cb:build-open/close, cb:inspector-open/close (kommen aus Core)
 *  - Fallback: kleines "Inspector lädt…" Badge, falls Core noch nicht da
 *  - Body-Klasse "has-build-open" pflegen
 * ========================================================================== */
(function () {
  "use strict";

  const VER = "v17.8.3";
  const log  = (t, ...a) => (window.CBLog?.ok   || console.log)(`[ui-bridge] ${t}`, ...a);
  const warn = (t, ...a) => (window.CBLog?.warn || console.warn)(`[ui-bridge] ${t}`, ...a);

  // Build-Dock
  const Build = (() => {
    let open = false;
    const panel = () => document.getElementById("build-panel");
    function ensurePanel(){ const el = panel(); if(!el) warn("Build-Panel fehlt (id=build-panel)"); return el; }

    function _open(){
      const el = ensurePanel(); if(!el || open) return;
      open = true;
      el.classList.add("open");
      document.body.classList.add("has-build-open");
      try { window.dispatchEvent(new CustomEvent("cb:build-open")); } catch {}
      log("Build geöffnet (%s).", VER);
    }
    function _close(){
      const el = ensurePanel(); if(!el || !open) return;
      open = false;
      el.classList.remove("open");
      document.body.classList.remove("has-build-open");
      try { window.dispatchEvent(new CustomEvent("cb:build-close")); } catch {}
      log("Build geschlossen.");
    }
    function toggle(force){
      const el = ensurePanel(); if(!el) return;
      (force == null ? !open : !!force) ? _open() : _close();
    }
    return { open:_open, close:_close, toggle };
  })();

  // Inspector Bridge
  const Inspector = (() => {
    function badge(){
      let probe = document.getElementById("inspector-probe");
      if (!probe){
        probe = document.createElement("div");
        probe.id = "inspector-probe";
        probe.textContent = "Inspector lädt…";
        probe.style.cssText = "position:fixed;right:16px;bottom:64px;font:12px/1.2 system-ui;" +
          "opacity:.65;color:#cbd5e1;z-index:2147483646;background:rgba(30,30,35,.72);" +
          "padding:6px 8px;border-radius:8px;border:1px solid rgba(255,255,255,.06)";
        document.body.appendChild(probe);
        setTimeout(()=>probe.remove(), 3000);
      }
    }
    function open(){
      if (window.__INSPECTOR_API__?.open) return window.__INSPECTOR_API__.open();
      badge(); log("Inspector-Core fehlt noch → Probe gezeigt.");
    }
    function close(){
      if (window.__INSPECTOR_API__?.close) return window.__INSPECTOR_API__.close();
      // kein eigener Fallback-Container mehr
    }
    function toggle(force){
      if (window.__INSPECTOR_API__?.toggle) return window.__INSPECTOR_API__.toggle(force);
      // kein Core: pragmatisch öffnen → Badge
      if (force !== false) open(); else close();
    }
    return { open, close, toggle };
  })();

  // Export
  window.GameUI = Object.assign(window.GameUI || {}, {
    toggleBuild: Build.toggle, openBuild: Build.open, closeBuild: Build.close,
    toggleInspector: Inspector.toggle, openInspector: Inspector.open, closeInspector: Inspector.close
  });

  log("bereit (%s).", VER);
})();
