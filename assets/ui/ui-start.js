/* ============================================================================
 * UI Start-Layer (v17.8.5)
 *  - Initialisiert Startscreen
 *  - feuert 'cb:ui-ready' direkt nach Setup
 *  - blendet beim Start aus und feuert anschließend 'cb:game-start'
 * ========================================================================== */
(function(){
  const log = (window.CBLog?.info || console.log).bind(console, "[ui-start]");
  const ok  = (window.CBLog?.ok   || console.log).bind(console, "[ui-start]");
  const warn= (window.CBLog?.warn || console.warn).bind(console, "[ui-start]");

  function qs(sel){ return document.querySelector(sel); }

  function dispatch(name, detail){
    try { window.dispatchEvent(new CustomEvent(name, { detail })); }
    catch(e){ console.warn("[ui-start] Event-Dispatch fehlgeschlagen:", name, e); }
  }

  function setup(){
    const panel = qs("#start-panel");
    const bg    = panel?.querySelector(".ui-start-bg");
    const btn   = qs("#btnStart");

    if(!panel || !btn){
      warn("Start-Panel oder Button fehlt – überspringe Start-Layer.");
      // Falls das Panel fehlt, trotzdem das Ready-Event schicken:
      dispatch("cb:ui-ready");
      return;
    }

    // Ready-Event direkt nach Setup
    dispatch("cb:ui-ready");
    ok("geladen (v17.8.5)");

    // Klick-Handler robust (einmalig binden)
    if(!btn.__bound){
      btn.addEventListener("click", ()=>{
        ok("Start klick");
        // sanft ausblenden
        panel.classList.add("hidden");

        // nach Ende der Transition Interaktionen deaktivieren & playing-Flag setzen
        const after = ()=>{
          panel.removeEventListener("transitionend", after);
          document.body.classList.add("playing"); // CSS entfernt Panel komplett
          // Signal an Bootstrap/Spielwelt
          dispatch("cb:game-start");
          log("cb:game-start dispatcht");
        };

        // Fallback, falls „transitionend“ nicht feuert (ältere Browser)
        setTimeout(after, 400);
        panel.addEventListener("transitionend", after);
      }, { passive: true });
      btn.__bound = true;
    }

    // Falls jemand den Start früher extern triggern will:
    window.addEventListener("ui:start", ()=>{
      if(panel && !panel.classList.contains("hidden")){
        btn?.click();
      }
    });
  }

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", setup, { once:true });
  }else{
    setup();
  }
})();
