/* ============================================================================
 * Datei   : ui/ui-start.js
 * Version : v25.10.16-3
 * Zweck   : Startfenster (klein, 4 Buttons), Fade-Out direkt beim Start-Klick
 * Events  : cb:ui-ready, req:game:start, req:game:continue, req:game:reset
============================================================================ */
(function(){
  const LOG = (m)=> (window.CBLog?.ok || console.log)(`[ui-start] ${m}`);
  const root = document.getElementById("ui-root");

  // Panel
  const panel = document.createElement("div");
  panel.id = "start-panel";
  panel.innerHTML = `
    <div class="box wood-frame">
      <h1>Neue Siedler</h1>
      <div class="actions">
        <button id="btn-start">Spiel starten</button>
        <button id="btn-continue" title="Fortsetzen (falls Save vorhanden)">Weiterspielen</button>
        <button id="btn-reset" title="Alle Spielstände/Cache zurücksetzen">Reset</button>
        <button id="btn-fullscreen" title="Vollbild umschalten">Vollbild</button>
      </div>
    </div>
  `;
  root.appendChild(panel);

  // UI ready
  LOG("Startpanel bereit → cb:ui-ready");
  window.dispatchEvent(new CustomEvent("cb:ui-ready"));

  // Helper: Fullscreen (iOS Safari tolerant)
  async function toggleFullscreen(){
    const el = document.documentElement;
    try{
      if(!document.fullscreenElement){
        await (el.requestFullscreen?.() || el.webkitRequestFullscreen?.call(el));
      }else{
        await (document.exitFullscreen?.() || document.webkitExitFullscreen?.());
      }
    }catch(e){ LOG("ℹ️ Vollbild evtl. blockiert (iOS Restriktionen)."); }
  }

  // Start → sofort Body-Fade, Event raus, Panel weg
  panel.querySelector("#btn-start").addEventListener("click", ()=>{
    document.body.classList.add("is-started");     // sofort fade
    window.dispatchEvent(new CustomEvent("req:game:start"));
    panel.remove();
  });

  panel.querySelector("#btn-continue").addEventListener("click", ()=>{
    document.body.classList.add("is-started");     // gleicher Fade
    window.dispatchEvent(new CustomEvent("req:game:continue"));
    panel.remove();
  });

  panel.querySelector("#btn-reset").addEventListener("click", ()=>{
    try{ localStorage.clear(); }catch(e){}
    window.dispatchEvent(new CustomEvent("req:game:reset"));
    LOG("Reset ausgelöst");
  });

  panel.querySelector("#btn-fullscreen").addEventListener("click", toggleFullscreen);
})();
