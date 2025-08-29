<!-- Ablage: ./assets/ui/ui-bridge.js -->
<script>
/**
 * ui-bridge.js  v16.1.18
 * -----------------------------------------------------------
 * Brücke zwischen Spiel (Events/Buttons) und dem Bau-Menü.
 * - zeigt/versteckt den Build-FAB wenn das Spiel startet
 * - ruft window.UIBuild.open/close/setTool() falls vorhanden
 * - loggt alles via CBLog (falls aktiv)
 */
(function(){
  const V = "v16.1.18";
  const log = (lvl,msg)=>{
    try{
      if (window.CBLog){
        const f = window.CBLog[lvl] || window.CBLog.ok;
        f(`${msg}`);
      }else{
        console[lvl==="err"?"error":lvl==="warn"?"warn":"log"](`[ui-bridge] ${msg}`);
      }
    }catch(_){}
  };

  // Elements aus index.html (Layout bleibt unberührt)
  const btnBuild   = document.getElementById("btn-build");
  const btnInspect = document.getElementById("btn-inspector");

  // — Inspector-Button (nur öffnen, eigentlicher Inspector bleibt deiner) —
  if (btnInspect && !btnInspect.__wired){
    btnInspect.__wired = true;
    btnInspect.addEventListener("click", ()=> {
      // Dein Inspector Script hängt sich global an:
      try { window.Inspector?.open?.(); } catch(_){}
    }, {passive:true});
  }

  // — Build-Button an UI-Bibliothek anbinden —
  function wireBuildButton(){
    if (!btnBuild || btnBuild.__wired) return;
    btnBuild.__wired = true;
    btnBuild.addEventListener("click", ()=>{
      try{
        if (window.UIBuild?.isOpen?.()){
          window.UIBuild.close();
        }else{
          window.UIBuild?.open?.();
        }
      }catch(e){
        log("warn", "Bau-Menü API nicht gefunden – erwartete globale Variable z.B. window.UIBuild");
      }
    }, {passive:true});
  }
  wireBuildButton();

  // — auf Spielstart warten → Build-Button einblenden —
  window.addEventListener("cb:game-started", ()=>{
    if (btnBuild){
      btnBuild.classList.add("visible");
      log("ok", "onGameStarted: Bau-Button aktiviert");
    }
  });

  // — Falls Engine erst später lädt: FAB erst nach UI-Ready verdecken —
  window.addEventListener("cb:ui-ready", ()=>{
    // nichts tun – nur sicherstellen, dass Bridge lebt
    log("log", `UI-Bridge bereit (${V})`);
  });

  // — Public shim für GameUI.* (optional, wird von dir genutzt) —
  window.GameUI = window.GameUI || {};
  window.GameUI.openBuildMenu  = ()=> window.UIBuild?.open?.();
  window.GameUI.closeBuildMenu = ()=> window.UIBuild?.close?.();
  window.GameUI.setTool        = (t)=> window.UIBuild?.setTool?.(t);
  window.GameUI.onGameStarted  = ()=> {
    // für ältere Stellen die diesen Hook nutzen
    if (btnBuild){ btnBuild.classList.add("visible"); }
    log("ok", "GameUI.onGameStarted → Bau-Button sichtbar");
  };
})();
</script>
