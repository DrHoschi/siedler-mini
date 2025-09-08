/* ============================================================================
 * Datei: assets/ui/ui-bridge.js
 * Projekt: Siedler-Mini
 * Version: v17.8.3
 *
 * Aufgaben:
 *  - Einheitliche UI-Brücke für:
 *      • Build-Dock öffnen/schließen/togglen
 *      • Inspector öffnen/schließen/togglen (ohne großes Fallback-Fenster!)
 *  - Saubere Events:
 *      • sendet:  cb:build-open / cb:build-close
 *                 cb:inspector-open-request / cb:inspector-close-request / cb:inspector-toggle-request
 *      • reagiert auf: cb:inspector-ready (vom Inspector-Core)
 *
 * Design-Entscheidung:
 *  - Keine HTML-Injektion eines großen Fallback-Overlays mehr.
 *  - Lediglich ein kleines Diagnose-Badge („Inspector lädt…“) für max. 3s,
 *    damit du Feedback hast, ohne den späteren Inspector zu „verdoppeln“.
 *
 * Garantien:
 *  - Safe to call: Funktionen funktionieren auch, wenn der Inspector-Core noch nicht da ist.
 *  - Kein Auto-Open; der Inspector öffnet nur auf Button/Kommando.
 *  - Keine Doppel-Toggles: Wir halten internen State nur für Build.
 *  - Logging via CBLog (sanft, fällt auf console.* zurück).
 * ========================================================================== */

(function () {
  "use strict";

  var VER = "v17.8.3";
  var MOD = "[ui-bridge]";

  var log  = function(t){ (window.CBLog?.log  || console.log)(MOD+" "+t); };
  var info = function(t){ (window.CBLog?.info || console.info)(MOD+" "+t); };
  var warn = function(t){ (window.CBLog?.warn || console.warn)(MOD+" "+t); };

  // ----------------------------------------------------------------------------
  // Build-Dock
  // ----------------------------------------------------------------------------
  var Build = (function(){
    var open = false;
    var el = null;

    function ensure(){
      if (!el) el = document.getElementById("build-panel");
      if (!el) warn("Build-Panel fehlt (id=build-panel).");
      return !!el;
    }

    function _open(){
      if (!ensure()) return;
      if (open) return;
      open = true;
      el.classList.add("open");
      document.body.classList.add("has-build-open");
      try { window.dispatchEvent(new CustomEvent("cb:build-open")); } catch(_){}
      log("Build geöffnet.");
    }

    function _close(){
      if (!ensure()) return;
      if (!open) return;
      open = false;
      el.classList.remove("open");
      document.body.classList.remove("has-build-open");
      try { window.dispatchEvent(new CustomEvent("cb:build-close")); } catch(_){}
      log("Build geschlossen.");
    }

    function toggle(force){
      if (!ensure()) return;
      var willOpen = (force == null) ? !open : !!force;
      willOpen ? _open() : _close();
    }

    return { open:_open, close:_close, toggle:toggle };
  })();

  // ----------------------------------------------------------------------------
  // Inspector-Bridge
  //   – keine große Fallback-UI, nur Event-Brücke + Mini-Diagnose
  // ----------------------------------------------------------------------------
  var Inspector = (function(){
    var READY = false;
    var PROBE_ID = "inspector-probe-badge";
    var probeTimer = null;

    // Wird vom Inspector-Core gemeldet, sobald __INSPECTOR_API__ bereit ist
    window.addEventListener("cb:inspector-ready", function(){
      READY = true;
      // nachträgliches Badge weg
      var p = document.getElementById(PROBE_ID);
      if (p) p.remove();
      info("Inspector-Core meldet READY.");
    });

    function showProbeOnce(){
      if (document.getElementById(PROBE_ID)) return;
      var badge = document.createElement("div");
      badge.id = PROBE_ID;
      badge.textContent = "Inspector lädt…";
      badge.style.cssText =
        "position:fixed;right:16px;bottom:74px;z-index:2147483646;padding:6px 10px;" +
        "font:12px system-ui;color:#cbd5e1;background:rgba(30,30,35,.72);border:1px solid rgba(255,255,255,.08);" +
        "border-radius:8px;backdrop-filter:blur(3px)";
      document.body.appendChild(badge);
      probeTimer = window.setTimeout(function(){ try{badge.remove();}catch(_){}} , 3000);
    }

    function api(){
      return (window.__INSPECTOR_API__ || null);
    }

    function open(){
      // 1) Wenn API schon da: direkt öffnen
      if (api()?.open) {
        api().open();
        return;
      }
      // 2) Noch nicht bereit → Request + kurzes Probe-Badge
      try { window.dispatchEvent(new CustomEvent("cb:inspector-open-request")); } catch(_){}
      showProbeOnce();

      // 3) Kleiner Retry-Loop (nur kurz), falls der Core in diesem Tick nachlädt
      var tries = 0;
      var t = window.setInterval(function(){
        tries++;
        if (api()?.open){
          window.clearInterval(t);
          api().open();
        }else if (tries > 8){ // ~1.6s
          window.clearInterval(t);
          warn("Inspector-Core nicht bereit – später nochmal versuchen.");
        }
      }, 200);
    }

    function close(){
      if (api()?.close) {
        api().close();
        return;
      }
      // Wenn er noch nicht ready ist, senden wir den Intent (Core kann es aufnehmen)
      try { window.dispatchEvent(new CustomEvent("cb:inspector-close-request")); } catch(_){}
    }

    function toggle(force){
      // wenn die API da ist, deren toggle nutzen
      if (api()?.toggle) {
        api().toggle(force);
        return;
      }
      // Andernfalls: semantischer Toggle-Intent
      try {
        window.dispatchEvent(new CustomEvent("cb:inspector-toggle-request", { detail:{ force: (force==null?undefined:!!force) } }));
      } catch(_){}
      showProbeOnce();

      // kurzer Retry (wie bei open)
      var tries = 0;
      var t = window.setInterval(function(){
        tries++;
        if (api()?.toggle){
          window.clearInterval(t);
          api().toggle(force);
        }else if (api()?.open && (force===true)){
          window.clearInterval(t);
          api().open();
        }else if (tries > 8){
          window.clearInterval(t);
          warn("Inspector-Core nicht bereit – später nochmal togglen.");
        }
      }, 200);
    }

    // Sicherheit: wenn ein Alt-Fallback existiert, räumen wir ihn leise weg,
    // sobald der Core das erste Mal „ready“ meldet.
    window.addEventListener("cb:inspector-ready", function(){
      try{
        var legacy = document.getElementById("inspector-fallback");
        if (legacy) legacy.remove();
      }catch(_){}
    });

    return { open:open, close:close, toggle:toggle };
  })();

  // ----------------------------------------------------------------------------
  // Öffentliche API
  // ----------------------------------------------------------------------------
  window.GameUI = window.GameUI || {};
  window.GameUI.toggleBuild     = Build.toggle;
  window.GameUI.openBuild       = Build.open;
  window.GameUI.closeBuild      = Build.close;

  window.GameUI.toggleInspector = Inspector.toggle;
  window.GameUI.openInspector   = Inspector.open;
  window.GameUI.closeInspector  = Inspector.close;

  info("bereit ("+VER+").");
})();
