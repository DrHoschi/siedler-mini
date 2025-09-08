/* ============================================================================
 * assets/ui/ui-bridge.js — v17.8.3 (fix: Fallback entkoppelt, Auto-Cleanup)
 * Aufgaben:
 *   - Öffnen/Schließen: Build-Panel & Inspector
 *   - Events: cb:build-open/close (nur für Build)
 *   - Robuster Inspector-Fallback, der den echten Inspector NICHT beeinflusst
 *   - Automatischer Cleanup, sobald __INSPECTOR_API__ bereit ist
 * ========================================================================== */
(function () {
  "use strict";

  var VER = "v17.8.3";
  var ok   = (t, ...a) => (window.CBLog?.ok   || console.log)  (`[ui-bridge] ${t}`, ...a);
  var warn = (t, ...a) => (window.CBLog?.warn || console.warn) (`[ui-bridge] ${t}`, ...a);

  // ---------- kleine Helfer --------------------------------------------------
  function $(id){ return document.getElementById(id); }
  function rm(id){ var n=$(id); if(n && n.remove) n.remove(); }

  // Entfernt alle Fallback-Reste (Overlay + Probe)
  function nukeInspectorFallback(){
    rm("inspector-root");
    rm("inspector-probe");
  }

  // ---------- Build-Dock -----------------------------------------------------
  var Build = (function(){
    var open = false;
    function panel(){ return document.getElementById("build-panel"); }
    function ensure(){ var el=panel(); if(!el) warn("Build-Panel fehlt (#build-panel)"); return el; }
    function _open(){
      var el=ensure(); if(!el||open) return;
      open=true; el.classList.add("open");
      document.body.classList.add("has-build-open");
      window.dispatchEvent(new CustomEvent("cb:build-open"));
      ok("Build geöffnet.");
    }
    function _close(){
      var el=ensure(); if(!el||!open) return;
      open=false; el.classList.remove("open");
      document.body.classList.remove("has-build-open");
      window.dispatchEvent(new CustomEvent("cb:build-close"));
      ok("Build geschlossen.");
    }
    function toggle(force){ var el=ensure(); if(!el) return; (force==null? !open:!!force)?_open():_close(); }
    return { open:_open, close:_close, toggle };
  })();

  // ---------- Inspector: Fallback-Overlay (nur wenn wirklich nötig) ----------
  function ensureFallbackOverlay(){
    var root = $("inspector-root");
    if (root) return root;

    root = document.createElement("div");
    root.id = "inspector-root";
    root.className = "inspector-root is-open";
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
    // WICHTIG: Fallback-Schließen feuert KEIN cb:inspector-close!
    btn.onclick = function(){ root.style.display="none"; };

    head.appendChild(title); head.appendChild(sp); head.appendChild(btn);

    var body = document.createElement("div");
    body.className="inspector-body";
    body.style.cssText = "padding:12px";
    body.innerHTML = "<div>Inspector lädt…</div>";

    panel.appendChild(head); panel.appendChild(body);
    root.appendChild(backdrop); root.appendChild(panel);
    document.body.appendChild(root);

    return root;
  }

  // ---------- Inspector-Bridge ----------------------------------------------
  var InspectorBridge = (function(){
    // Wenn die echte API auftaucht: Fallback restlos entfernen
    function onReadyCleanup(){
      if (window.__INSPECTOR_API__ || document.getElementById("inspector")) {
        nukeInspectorFallback();
      }
    }
    window.addEventListener("cb:inspector-ready", onReadyCleanup);
    // Safety: falls core ohne Event lädt, trotzdem aufräumen
    var _probeReadyTimer = setInterval(function(){
      if (window.__INSPECTOR_API__ || document.getElementById("inspector")){
        clearInterval(_probeReadyTimer);
        onReadyCleanup();
      }
    }, 2500);

    function open(){
      if (window.__INSPECTOR_API__?.open) {
        nukeInspectorFallback();
        return window.__INSPECTOR_API__.open();
      }
      var r=ensureFallbackOverlay(); r.style.display="flex";
      ok("Inspector (Fallback) geöffnet.");
      // Nachladen überwachen: sobald API da -> Fallback schließen + echten öffnen
      var hand = setInterval(function(){
        if (window.__INSPECTOR_API__?.open){
          clearInterval(hand);
          r.style.display="none";
          window.__INSPECTOR_API__.open();
          nukeInspectorFallback();
        }
      }, 500);
    }

    function close(){
      if (window.__INSPECTOR_API__?.close) {
        nukeInspectorFallback();
        return window.__INSPECTOR_API__.close();
      }
      var r=$("inspector-root"); if (r) r.style.display="none";
      ok("Inspector (Fallback) geschlossen.");
    }

    function toggle(force){
      if (window.__INSPECTOR_API__?.toggle) {
        nukeInspectorFallback();
        return window.__INSPECTOR_API__.toggle(force);
      }
      var r=$("inspector-root");
      var willOpen = (force==null)? !(r && r.style.display!=="none"): !!force;
      willOpen ? open() : close();
    }

    return { open, close, toggle };
  })();

  // ---------- Export nach window.GameUI -------------------------------------
  window.GameUI = window.GameUI || {};
  window.GameUI.toggleBuild     = Build.toggle;
  window.GameUI.openBuild       = Build.open;
  window.GameUI.closeBuild      = Build.close;

  window.GameUI.toggleInspector = InspectorBridge.toggle;
  window.GameUI.openInspector   = InspectorBridge.open;
  window.GameUI.closeInspector  = InspectorBridge.close;

  // ---------- Diagnose-Badge (nur falls wirklich kein Inspector) ------------
  setTimeout(function(){
    if (!window.__INSPECTOR_API__ && !document.getElementById("inspector")){
      var probe = document.createElement("div");
      probe.id = "inspector-probe";
      probe.textContent = "Inspector lädt…";
      probe.style.cssText = "position:fixed;right:16px;bottom:64px;font:12px/1.2 system-ui;opacity:.60;color:#cbd5e1;z-index:2147483646;background:rgba(30,35,40,.78);padding:6px 8px;border-radius:8px;border:1px solid rgba(255,255,255,.06)";
      document.body.appendChild(probe);
      setTimeout(()=>rm("inspector-probe"), 4000);
    }
  }, 800);

 
