/* ============================================================================
 * Datei   : ui/ui-start.js
 * Projekt : Neue Siedler
 * Version : v25.10.16-1
 * Zweck   : Startfenster (Holzrahmen-Quadrat, zentriert); Hintergrundbild via body::before
 * Events  : emit cb:ui-ready, emit req:game:start, emit req:game:continue
 * ============================================================================
 */
(function(){
  const LOG = (m)=> (window.CBLog?.ok || console.log)(`[ui-start] ${m}`);
  const root = document.getElementById("ui-root");

  const panel = document.createElement("div");
  panel.id = "start-panel";
  panel.innerHTML = `
    <div class="box wood-frame">
      <h1>Neue Siedler</h1>
      <div class="actions">
        <button id="btn-start">Spiel starten</button>
        <button id="btn-continue" title="Fortsetzen (falls Save vorhanden)">Weiterspielen</button>
      </div>
    </div>
  `;
  root.appendChild(panel);

  // UI bereit
  LOG("Startpanel bereit → cb:ui-ready");
  window.dispatchEvent(new CustomEvent("cb:ui-ready"));

  // Start
  panel.querySelector("#btn-start").addEventListener("click", ()=>{
    LOG("Start → req:game:start");
    window.dispatchEvent(new CustomEvent("req:game:start"));
    panel.remove();                 // Panel sofort weg
    // body::before fade-out wird in game.bootstrap per .is-started ausgelöst
  });

  // Continue (Stub)
  panel.querySelector("#btn-continue").addEventListener("click", ()=>{
    LOG("Weiterspielen → req:game:continue");
    window.dispatchEvent(new CustomEvent("req:game:continue"));
    panel.remove();
  });
})();
