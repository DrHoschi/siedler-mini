/* ============================================================================
 * Datei: assets/ui/ui-bridge.js
 * Version: v17.8.3
 * Aufgabe:
 *   - Öffnen/Schließen: Build-Panel & Inspector
 *   - Einheitliche Events: cb:build-open/close, cb:inspector-open/close
 *   - Body-Klasse "inspector-open" / "has-build-open" pflegen
 *   - Robuster Fallback, der NICHT das eigentliche Overlay schließt
 *   - Keine Mehrfach-Hooks, kein Doppel-Toggle
 *
 * Abhängigkeiten:
 *   - Inspector-Core registriert sich unter window.__INSPECTOR_API__
 *   - Build-Dock ist ein DIV#build-panel (optional)
 * ========================================================================== */
(function () {
  "use strict";

  var VER = "v17.8.3";
  var MOD = "[ui-bridge]";

  // ---- Logging --------------------------------------------------------------
  function ok(msg)   { try{ (window.CBLog?.ok   || console.log)(MOD+" "+msg); }catch(_){ console.log(MOD+" "+msg); } }
  function warn(msg) { try{ (window.CBLog?.warn || console.warn)(MOD+" "+msg);}catch(_){ console.warn(MOD+" "+msg); } }

  // ========================================================================== //
  // BUILD-DOCK
  // ========================================================================== //
  var Build = (function(){
    var open = false;
    function _panel(){ return document.getElementById("build-panel"); }

    function ensure(){
      var el = _panel();
      if (!el) warn("Build-Panel fehlt (id=build-panel).");
      return !!el;
    }
    function fire(ev){ try{ window.dispatchEvent(new CustomEvent(ev)); }catch(_){/*noop*/} }

    function _open(){
      if (!ensure()) return;
      if (open) return;
      open = true;
      document.body.classList.add("has-build-open");
      fire("cb:build-open");
      ok("Build geöffnet.");
    }
    function _close(){
      if (!ensure()) return;
      if (!open) return;
      open = false;
      document.body.classList.remove("has-build-open");
      fire("cb:build-close");
      ok("Build geschlossen.");
    }
    function toggle(force){
      if (!ensure()) return;
      var willOpen = (force == null) ? !open : !!force;
      willOpen ? _open() : _close();
    }
    return { open:_open, close:_close, toggle:toggle };
  })();

  // ========================================================================== //
  // INSPECTOR BRIDGE
  //  - Greift auf window.__INSPECTOR_API__ zu, wenn vorhanden.
  //  - Zeigt andernfalls ein kleines, eigenes Fallback-Badge an, das
  //    NICHT das Inspector-Overlay ersetzt/überlagert und es auch NICHT schließt.
  // ========================================================================== //
  var Inspector = (function(){
    var api = null;
    var probeId = "inspector-probe";
    var fbId    = "inspector-fallback";

    function _api(){ return (api = window.__INSPECTOR_API__ || api || null); }
    function _fire(ev){ try{ window.dispatchEvent(new CustomEvent(ev)); }catch(_){/*noop*/} }

    // Kleines Badge rechts unten: „Inspector lädt…“ (automatisch verschwindend)
    function showProbe(){
      if (document.getElementById(probeId)) return;
      var p = document.createElement("div");
      p.id = probeId;
      p.textContent = "Inspector lädt…";
      p.style.cssText =
        "position:fixed;right:16px;bottom:64px;z-index:2147483646;padding:6px 8px;border-radius:8px;"+
        "background:rgba(30,30,35,.72);color:#cbd5e1;font:12px/1.2 system-ui;border:1px solid rgba(255,255,255,.08)";
      document.body.appendChild(p);
      setTimeout(function(){ try{ p.remove(); }catch(_){/*noop*/} }, 3500);
    }

    // Kleines Fallback-Fenster (nur Info), das NICHT das Overlay schließt.
    function ensureFallbackBox(){
      var b = document.getElementById(fbId);
      if (b) return b;
      b = document.createElement("div");
      b.id = fbId;
      b.style.cssText =
        "position:fixed;right:16px;bottom:112px;max-width:90vw;width:340px;max-height:60vh;overflow:auto;"+
        "background:rgba(20,20,20,.92);color:#eee;border:1px solid #333;border-radius:10px;padding:12px;"+
        "z-index:2147483646;box-shadow:0 24px 64px rgba(0,0,0,.45);display:none";
      var txt = document.createElement("div");
      txt.textContent = "Inspector lädt… (Core noch nicht initialisiert)";
      txt.style.marginBottom = "8px";
      var close = document.createElement("button");
      close.type = "button";
      close.textContent = "Nur dieses Hinweisfenster schließen";
      close.style.cssText = "padding:6px 10px;border:0;border-radius:6px;background:#444;color:#fff;cursor:pointer";
      close.addEventListener("click", function(){
        // Nur das Fallback verstecken – NICHT den Inspector schließen!
        b.style.display = "none";
      });
      b.appendChild(txt);
      b.appendChild(close);
      document.body.appendChild(b);
      return b;
    }

    function open(){
      // Wenn der Core da ist: regulär öffnen
      if (_api() && typeof api.open === "function"){
        api.open();
        document.body.classList.add("inspector-open");
        _fire("cb:inspector-open");
        ok("Inspector geöffnet (Core).");
        return;
      }
      // Sonst: Fallback anzeigen (kleines Hinweisfenster) und Probe
      showProbe();
      var box = ensureFallbackBox();
      box.style.display = "block";
      document.body.classList.add("inspector-open"); // erlaubt ESC/Styles, schadet nicht
      _fire("cb:inspector-open");
      ok("Inspector (Fallback) geöffnet.");
    }

    function close(){
      if (_api() && typeof api.close === "function"){
        api.close();
        document.body.classList.remove("inspector-open");
        _fire("cb:inspector-close");
        ok("Inspector geschlossen (Core).");
        return;
      }
      // Nur Fallback-Fenster verstecken, Body-Klasse aber entfernen
      var box = document.getElementById(fbId);
      if (box) box.style.display = "none";
      document.body.classList.remove("inspector-open");
      _fire("cb:inspector-close");
      ok("Inspector (Fallback) geschlossen.");
    }

    function toggle(force){
      // Wenn Core togglen kann → verwenden
      if (_api() && typeof api.toggle === "function"){
        api.toggle(force);
        var isOpen = document.body.classList.contains("inspector-open");
        if (force == null){
          // Core pflegt normalerweise selbst die Klasse; zur Sicherheit synchronisieren
          if (!isOpen) document.body.classList.add("inspector-open");
        }else{
          if (force) document.body.classList.add("inspector-open");
          else document.body.classList.remove("inspector-open");
        }
        return;
      }
      // Fallback-Logik
      var box = document.getElementById(fbId);
      var visible = !!(box && box.style.display !== "none");
      var willOpen = (force == null) ? !visible : !!force;
      willOpen ? open() : close();
    }

    // ESC schließt nur den Inspector (egal ob Core/Fallback)
    window.addEventListener("keydown", function(ev){
      if (ev.key === "Escape"){
        try{ toggle(false); }catch(_){/*noop*/ }
      }
    });

    return { open:open, close:close, toggle:toggle, _probe:showProbe };
  })();

  // ========================================================================== //
  // ÖFFENTLICHE API
  // ========================================================================== //
  window.GameUI = window.GameUI || {};
  window.GameUI.toggleBuild     = Build.toggle;
  window.GameUI.openBuild       = Build.open;
  window.GameUI.closeBuild      = Build.close;

  window.GameUI.toggleInspector = Inspector.toggle;
  window.GameUI.openInspector   = Inspector.open;
  window.GameUI.closeInspector  = Inspector.close;

  // Kleines Diagnose-Badge, falls der Core nach ~800ms noch nicht registriert ist
  setTimeout(function(){
    if (!window.__INSPECTOR_API__) Inspector._probe();
  }, 800);

  ok("bereit ("+VER+").");
})();
