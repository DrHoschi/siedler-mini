/* ============================================================================
 * ui-bridge.js – v17.8.3
 *  - FAB-API für Build/Inspector
 *  - Kein persistentes Fallback-Fenster mehr (nur kurze Probe)
 *  - Doppeltoggle-Schutz
 * ========================================================================== */
(function(){
  "use strict";
  const VER = "v17.8.3";
  const ok   = (t,...a)=>(window.CBLog?.ok||console.log)(`[ui-bridge] ${t}`,...a);
  const warn = (t,...a)=>(window.CBLog?.warn||console.warn)(`[ui-bridge] ${t}`,...a);

  // --- Build-Dock ------------------------------------------------------------
  const Build = (()=>{
    let open=false;
    const el = ()=>document.getElementById("build-panel");
    function ensure(){ const n=el(); if(!n) warn("Build-Panel fehlt (#build-panel)"); return !!n; }
    function _open(){ if(!ensure()||open) return; open=true; el().classList.add("open"); document.body.classList.add("has-build-open"); window.dispatchEvent(new CustomEvent("cb:build-open")); ok("Build geöffnet (%s).",VER); }
    function _close(){ if(!ensure()||!open) return; open=false; el().classList.remove("open"); document.body.classList.remove("has-build-open"); window.dispatchEvent(new CustomEvent("cb:build-close")); ok("Build geschlossen."); }
    function toggle(force){ (force==null ? !open : !!force) ? _open() : _close(); }
    return {open:_open,close:_close,toggle};
  })();

  // --- Inspector Bridge ------------------------------------------------------
  const Inspector = (()=>{
    let toggling=false; // Doppelklick-Schutz
    function callCore(method, force){
      const api = window.__INSPECTOR_CORE__?.api;
      if (!api || typeof api[method]!=="function") return false;
      if (toggling) return true;
      toggling=true;
      try{ api[method](force); } finally { setTimeout(()=>toggling=false, 60); }
      return true;
    }

    // kleine, automatische Probe (nur Badge – KEIN Fenster)
    setTimeout(()=>{ 
      if (!window.__INSPECTOR_CORE__) {
        const probe=document.createElement("div");
        probe.textContent="Inspector lädt…";
        probe.id="inspector-probe";
        probe.style.cssText="position:fixed;right:16px;bottom:64px;font:12px system-ui;opacity:.6;color:#cbd5e1;z-index:2147483646;background:rgba(30,30,35,.72);padding:6px 8px;border-radius:8px;border:1px solid rgba(255,255,255,.06)";
        document.body.appendChild(probe);
        setTimeout(()=>probe.remove(), 2000);
      }
    }, 500);

    return {
      toggle:(f)=> callCore("toggle", f) || warn("Inspector-Core fehlt"),
      open:  ()=> callCore("open")  || warn("Inspector-Core fehlt"),
      close: ()=> callCore("close") || warn("Inspector-Core fehlt"),
    };
  })();

  // --- API an Fenster --------------------------------------------------------
  window.GameUI = window.GameUI || {};
  window.GameUI.toggleBuild     = Build.toggle;
  window.GameUI.openBuild       = Build.open;
  window.GameUI.closeBuild      = Build.close;

  window.GameUI.toggleInspector = Inspector.toggle;
  window.GameUI.openInspector   = Inspector.open;
  window.GameUI.closeInspector  = Inspector.close;

  ok("bereit (%s).", VER);
})();
