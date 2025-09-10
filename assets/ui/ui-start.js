/* ============================================================================
 * UI-Start – v17.8.6
 * - Overlay mit Hintergrundbild + Start-Button
 * - Beim Klick: cb:ui-ready + cb:game-start dispatchen
 * - Overlay sauber ausblenden und ENTFERNEN (kein dunkler Layer bleibt!)
 * ========================================================================== */
(function(){
  "use strict";
  var MOD = "[ui-start]";
  var VER = "v17.8.6";

  var ok   = function(m){ try{ (window.CBLog?.ok   || console.log   )(MOD+" "+m); }catch(_){ console.log(MOD+" "+m); } };
  var info = function(m){ try{ (window.CBLog?.info || console.log   )(MOD+" "+m); }catch(_){ console.log(MOD+" "+m); } };
  var warn = function(m){ try{ (window.CBLog?.warn || console.warn  )(MOD+" "+m); }catch(_){ console.warn(MOD+" "+m); } };
  var err  = function(m){ try{ (window.CBLog?.err  || console.error )(MOD+" "+m); }catch(_){ console.error(MOD+" "+m); } };

  function byId(id){ return document.getElementById(id); }

  function wire(){
    var root = byId("start-panel");
    var btn  = byId("btnStart");
    if (!root || !btn){
      warn("Start-Panel oder Button fehlt.");
      return;
    }
    if (btn.__wired) return;  // Doppel-Wiring verhindern
    btn.__wired = true;

    btn.addEventListener("click", function(){
      info("Start klick");
      try{
        // UI-/Game-Start signalisieren
        window.dispatchEvent(new CustomEvent("cb:ui-ready"));
        window.dispatchEvent(new CustomEvent("cb:game-start"));
        info("cb:game-start dispatcht");
      }catch(_){}

      // Sauber ausblenden und entfernen
      try{
        root.classList.add("is-hiding");
        // nach Ende des Fades entfernen (Fallback Timeout)
        var done = false;
        var cleanup = function(){
          if (done) return;
          done = true;
          try{ root.remove(); ok("Start-Overlay entfernt."); }catch(e){ err("Entfernen: "+e.message); }
        };
        root.addEventListener("transitionend", cleanup, { once:true });
        setTimeout(cleanup, 400); // Fallback
      }catch(e){
        err("Fade/Remove: "+e.message);
        try{ root.remove(); }catch(_){}
      }
    });

    ok("geladen ("+VER+")");
  }

  if (document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", wire, { once:true });
  } else {
    wire();
  }
})();
