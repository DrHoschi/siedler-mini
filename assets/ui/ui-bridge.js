/* ============================================================================
 * ui-bridge.js – v17.8.4
 * Aufgabe:
 *   - Stabiles Öffnen/Schließen von Build-Panel & Inspector
 *   - Einmalige (idempotente) Initialisierung
 *   - Kleines Fallback-Badge "Inspector lädt…" bis core da ist
 *   - Kein Auto-Open
 * Events:
 *   - cb:build-open/close
 *   - cb:inspector-open/close
 * Public:
 *   - GameUI.open/close/toggleBuild()
 *   - GameUI.open/close/toggleInspector()
 * ========================================================================== */

(function(){
  "use strict";

  if (window.__UI_BRIDGE_INIT__) return; // idempotent
  window.__UI_BRIDGE_INIT__ = true;

  const VER = "v17.8.4";
  const ok   = (t,...a)=>(window.CBLog?.ok||console.log)(`[ui-bridge] ${t}`,...a);
  const warn = (t,...a)=>(window.CBLog?.warn||console.warn)(`[ui-bridge] ${t}`,...a);

  // ---------- Build-Dock ----------------------------------------------------
  const Build = (() => {
    let open = false;
    const panel = () => document.getElementById("build-panel");

    function ensure() {
      const el = panel();
      if (!el) warn("Build-Panel fehlt (#build-panel).");
      return el;
    }

    function _open(){
      const el = ensure(); if (!el || open) return;
      open = true;
      el.classList.add("open");
      document.body.classList.add("has-build-open");
      window.dispatchEvent(new CustomEvent("cb:build-open"));
      ok("Build geöffnet.");
    }
    function _close(){
      const el = ensure(); if (!el || !open) return;
      open = false;
      el.classList.remove("open");
      document.body.classList.remove("has-build-open");
      window.dispatchEvent(new CustomEvent("cb:build-close"));
      ok("Build geschlossen.");
    }
    function toggle(force){
      const el = ensure(); if (!el) return;
      (force==null? !open : !!force) ? _open() : _close();
    }
    return { open:_open, close:_close, toggle };
  })();

  // ---------- Inspector Bridge ----------------------------------------------
  // Fallback-Badge (nicht das alte große Fallback-Fenster!)
  let probe = null;
  function showProbe(){
    if (probe || window.__INSPECTOR_API__) return;
    probe = document.createElement("div");
    probe.id = "inspector-probe";
    probe.textContent = "Inspector lädt…";
    probe.style.cssText =
      "position:fixed;right:16px;bottom:72px;z-index:2147483646;"+
      "background:rgba(30,30,35,.72);color:#cbd5e1;padding:6px 8px;"+
      "border:1px solid rgba(255,255,255,.08);border-radius:8px;"+
      "font:12px/1.2 system-ui";
    document.body.appendChild(probe);
    // Sicherheitsentfernung nach 6s
    setTimeout(hideProbe, 6000);
  }
  function hideProbe(){
    if (probe){ try{ probe.remove(); }catch{} probe=null; }
  }

  // Auf Core warten, dann Probe schließen
  (function waitCoreOnce(){
    const check = () => {
      if (window.__INSPECTOR_API__){
        hideProbe();
        ok("Inspector-Core erkannt.");
        return true;
      }
      return false;
    };
    if (check()) return;
    // 1) kurzer Delay (nach Script-Laden)
    setTimeout(()=>{ if (!check()) showProbe(); }, 400);
    // 2) fallback polling kurzzeitig (max 3s)
    let t0 = Date.now();
    const iv = setInterval(()=>{
      if (check() || Date.now()-t0>3000) clearInterval(iv);
    }, 150);
  })();

  const Inspector = (() => {
    function _open(){
      if (window.__INSPECTOR_API__?.open) return window.__INSPECTOR_API__.open();
      // Kein großes Fallback erzeugen – nur Probe zeigen
      showProbe();
      ok("Inspector (Probe/Fallback) sichtbar – warte auf Core.");
    }
    function _close(){
      if (window.__INSPECTOR_API__?.close) return window.__INSPECTOR_API__.close();
      // Fallback-Case: nur Probe ausblenden
      hideProbe();
      warn("Inspector-Core fehlt; nur Probe verborgen.");
    }
    function toggle(force){
      if (window.__INSPECTOR_API__?.toggle) return window.__INSPECTOR_API__.toggle(force);
      // minimaler Toggle ohne Core
      const willOpen = force==null ? true : !!force;
      willOpen ? _open() : _close();
    }
    return { open:_open, close:_close, toggle };
  })();

  // ---------- Public API -----------------------------------------------------
  window.GameUI = window.GameUI || {};
  window.GameUI.openBuild       = Build.open;
  window.GameUI.closeBuild      = Build.close;
  window.GameUI.toggleBuild     = Build.toggle;

  window.GameUI.openInspector   = Inspector.open;
  window.GameUI.closeInspector  = Inspector.close;
  window.GameUI.toggleInspector = Inspector.toggle;

  ok(`bereit (${VER}).`);
})();
