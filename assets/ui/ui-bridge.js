/* ============================================================================
 * assets/ui/ui-bridge.js — v17.8.2
 * Aufgaben:
 *   - Öffnen/Schließen: Build-Panel & Inspector
 *   - Events: cb:build-open/close, cb:inspector-open/close
 *   - Body-Klasse "has-build-open" pflegen
 *   - Robuster Inspector-Fallback (Overlay zentriert, max z-Index)
 * CODE-STYLE: sanfte Logs via CBLog (Fallback console)
 * ========================================================================== */
(function () {
  "use strict";

  var VER = "v17.8.2";
  var log  = (t, ...a) => (window.CBLog?.ok   || console.log)  (`[ui-bridge] ${t}`, ...a);
  var warn = (t, ...a) => (window.CBLog?.warn || console.warn) (`[ui-bridge] ${t}`, ...a);

  // -------- Build-Dock -------------------------------------------------------
  var Build = (function(){
    var open = false;
    function panel(){ return document.getElementById("build-panel"); }
    function ensure(){ var el=panel(); if(!el) warn("Build-Panel fehlt (#build-panel)"); return el; }
    function _open(){ var el=ensure(); if(!el||open) return; open=true; el.classList.add("open");
      document.body.classList.add("has-build-open");
      window.dispatchEvent(new CustomEvent("cb:build-open"));
      log("Build geöffnet (%s).", VER);
    }
    function _close(){ var el=ensure(); if(!el||!open) return; open=false; el.classList.remove("open");
      document.body.classList.remove("has-build-open");
      window.dispatchEvent(new CustomEvent("cb:build-close"));
      log("Build geschlossen.");
    }
    function toggle(force){ var el=ensure(); if(!el) return; (force==null? !open:!!force)?_open():_close(); }
    return { open:_open, close:_close, toggle };
  })();

  // -------- Inspector Bridge + Fallback -------------------------------------
  function ensureFallbackOverlay(){
    var root = document.getElementById("inspector-root");
    if (!root) {
      root = document.createElement("div");
      root.id = "inspector-root";
      root.className = "inspector-root is-open";
      // Minimal CSS falls inspector.css fehlt
      root.style.cssText = [
        "position:fixed","inset:0","z-index:2147483646",
        "display:flex","align-items:center","justify-content:center"
      ].join(";");

      var backdrop = document.createElement("div");
      backdrop.className = "inspector-backdrop";
      backdrop.style.cssText = "position:absolute;inset:0;background:rgba(0,0,0,.55)";
      var panel = document.createElement("div");
      panel.className = "inspector-panel";
      panel.style.cssText = "position:relative;max-width:960px;width:94vw;max-height:92vh;overflow:auto;background:#101416;color:#e2e8f0;border:1px solid #2a2f35;border-radius:12px;box-shadow:0 24px 80px rgba(0,0,0,.55)";

      var head = document.createElement("div");
      head.className="inspector-head";
      head.style.cssText = "display:flex;align-items:center;gap:10px;padding:10px 12px;border-bottom:1px solid #232a2e;background:#12181b";
      var title = document.createElement("div");
      title.textContent = "Inspector (Fallback)";
      title.style.cssText = "font-weight:700;letter-spacing:.2px";
      var sp = document.createElement("div"); sp.style.cssText="flex:1";
      var btn = document.createElement("button");
      btn.textContent = "Schließen";
      btn.style.cssText = "border:none;border-radius:10px;padding:8px 12px;background:#24313a;color:#fff;cursor:pointer";
      btn.onclick = function(){ root.style.display="none"; window.dispatchEvent(new CustomEvent("cb:inspector-close")); };

      head.appendChild(title); head.appendChild(sp); head.appendChild(btn);

      var body = document.createElement("div");
      body.className="inspector-body";
      body.style.cssText = "padding:12px";
      body.innerHTML = "<div>Inspector lädt…</div>";

      panel.appendChild(head); panel.appendChild(body);
      root.appendChild(backdrop); root.appendChild(panel);
      document.body.appendChild(root);
    }
    return root;
  }

  var InspectorBridge = (function(){
    function open(){
      if (window.__INSPECTOR_API__?.open) return window.__INSPECTOR_API__.open();
      var r=ensureFallbackOverlay(); r.style.display="flex";
      window.dispatchEvent(new CustomEvent("cb:inspector-open"));
      log("Inspector (Fallback) geöffnet.");
    }
    function close(){
      if (window.__INSPECTOR_API__?.close) return window.__INSPECTOR_API__.close();
      var r=document.getElementById("inspector-root"); if (r) r.style.display="none";
      window.dispatchEvent(new CustomEvent("cb:inspector-close"));
      log("Inspector (Fallback) geschlossen.");
    }
    function toggle(force){
      if (window.__INSPECTOR_API__?.toggle) return window.__INSPECTOR_API__.toggle(force);
      var r=document.getElementById("inspector-root");
      var willOpen = (force==null)? !(r && r.style.display!=="none"): !!force;
      willOpen ? open() : close();
    }
    return { open, close, toggle };
  })();

  // -------- Export nach window.GameUI ---------------------------------------
  window.GameUI = window.GameUI || {};
  window.GameUI.toggleBuild     = Build.toggle;
  window.GameUI.openBuild       = Build.open;
  window.GameUI.closeBuild      = Build.close;

  window.GameUI.toggleInspector = InspectorBridge.toggle;
  window.GameUI.openInspector   = InspectorBridge.open;
  window.GameUI.closeInspector  = InspectorBridge.close;

  // Kleines Diagnose-Badge, falls Inspector nicht initialisiert
  setTimeout(function(){
    if (!window.__INSPECTOR_API__){
      var probe = document.createElement("div");
      probe.textContent = "Inspector lädt…";
      probe.style.cssText = "position:fixed;right:16px;bottom:64px;font:12px/1.2 system-ui;opacity:.60;color:#cbd5e1;z-index:2147483646;background:rgba(30,35,40,.78);padding:6px 8px;border-radius:8px;border:1px solid rgba(255,255,255,.06)";
      probe.id = "inspector-probe";
      document.body.appendChild(probe);
      setTimeout(()=>probe.remove(), 4000);
    }
  }, 800);

  (window.CBLog?.ok||console.log)(`[ui-bridge] bereit (${VER}).`);
})();
