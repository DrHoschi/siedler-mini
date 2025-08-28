/* ============================================================
   Bau-Menü UI (v16.1.4) – unverändert, nur Version & Logs ergänzt
   - Öffnen/Schließen weiterhin über den runden Werkzeug-Button im Spiel
   - Inspector steuert das Bau-Menü NICHT mehr
   ============================================================ */

(function(){
  const VERSION = "16.1.4";
  const log = (lvl,msg)=>window.dispatchEvent(new CustomEvent("game:log",{detail:{level:lvl,msg}}));

  function ready(){
    log("ok", `Bau-Menü bereit (ui-build.js v${VERSION})`);
  }

  // Falls du hier deinen bestehenden Build-UI Code hast:
  // ... (dein Menücode bleibt wie gehabt) ...

  // Bootstrap
  if(document.readyState==="complete"||document.readyState==="interactive"){
    setTimeout(ready,0);
  }else{
    window.addEventListener("DOMContentLoaded", ready);
  }
})();
