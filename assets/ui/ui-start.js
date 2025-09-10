/* ============================================================================
 * UI Start – v17.8.4
 *  - Startpanel initialisieren
 *  - Hintergrundbild laden
 *  - Events: cb:ui-ready, cb:game-start
 *  - Robust gegen Mehrfach-Init
 * ========================================================================== */

(function(){
  const MOD = "[ui-start]";
  const VER = "v17.8.4";

  // Einmalig initialisieren
  if (window.__uiStartInit) return;
  window.__uiStartInit = true;

  const log = {
    info: (msg)=> (window.CBLog?.info || console.log)(`${MOD} ${msg}`),
    ok  : (msg)=> (window.CBLog?.ok   || console.log)(`${MOD} ${msg}`),
    warn: (msg)=> (window.CBLog?.warn || console.warn)(`${MOD} ${msg}`),
    err : (msg)=> (window.CBLog?.error|| console.error)(`${MOD} ${msg}`),
  };

  // DOM-Hooks
  const root   = document.getElementById("start-panel");
  const bg     = root?.querySelector(".ui-start-bg");
  const panel  = root?.querySelector(".ui-start-panel");
  const btn    = root?.querySelector("#btnStart");

  // Sanity Checks
  if(!root || !bg || !panel){
    log.warn("Start-Panel HTML nicht gefunden – Events werden dennoch dispatcht.");
    // Dispatch dennoch (z.B. wenn Panel absichtlich entfernt wurde)
    dispatchReadyThenStart();
    return;
  }

  // Hintergrund laden → verhindert „weißes Blitzen“ bei schwächerem Netz
  primeBackground(bg)
    .catch(()=>{/* ignoriere Bildfehler */})
    .finally(()=>{
      // Jetzt Panel interaktiv machen
      mountButton();
      log.info(`geladen (${VER})`);
    });

  function primeBackground(bgEl){
    return new Promise((res)=> {
      // Pfad aus CSS-Var lesen
      const style = getComputedStyle(document.documentElement);
      let raw = style.getPropertyValue("--start-bg").trim();
      // raw z.B.: url("assets/ui/start-bg.jpeg")
      const m = raw.match(/url\((['"]?)(.+?)\1\)/i);
      const url = m ? m[2] : null;
      if(!url){ res(); return; }

      const img = new Image();
      img.onload  = ()=> res();
      img.onerror = ()=> res();
      img.src = url;
    });
  }

  function mountButton(){
    if(!btn){
      log.warn("Start-Button #btnStart nicht gefunden – starte automatisch.");
      dispatchReadyThenStart();
      hidePanel();
      return;
    }

    let pressed = false;
    btn.addEventListener("click", () => {
      if (pressed) return; // Doppelklick-Schutz
      pressed = true;
      btn.disabled = true;

      // 1) UI bereit
      window.dispatchEvent(new CustomEvent("cb:ui-ready"));
      // 2) Spiel starten
      window.dispatchEvent(new CustomEvent("cb:game-start"));

      log.ok("cb:ui-ready & cb:game-start dispatcht");

      // Panel ausblenden
      hidePanel();

      // Sicherheit: nach kurzer Zeit Button wieder freigeben
      setTimeout(()=> { btn.disabled = false; }, 1200);
    }, { passive:true });
  }

  function hidePanel(){
    try{
      root.classList.add("is-hidden");
    }catch(_){}
  }

  function dispatchReadyThenStart(){
    try{
      window.dispatchEvent(new CustomEvent("cb:ui-ready"));
      window.dispatchEvent(new CustomEvent("cb:game-start"));
      log.ok("cb:ui-ready & cb:game-start dispatcht (Fallback)");
    }catch(err){
      log.err("Events konnten nicht dispatcht werden: " + err?.message);
    }
  }
})();
