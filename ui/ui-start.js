/* ============================================================================
 * Datei   : ui/ui-start.js
 * Projekt : Neue Siedler
 * Version : v25.10.16
 * Zweck   : Startfenster (separates UI-Modul) + Hintergrundbild + Fade-Out
 * Events  : emit cb:ui-ready, emit req:game:start
 * ============================================================================
 */
(function(){
  const LOG = (m)=> (window.CBLog?.ok || console.log)(`[ui-start] ${m}`);
  const root = document.getElementById("ui-root");

  // ---- Hintergrundbild (bleibt hinter Canvas bis zum Fade) ------------------
  const bg = document.createElement("div");
  bg.id = "start-bg";
  // ❗ Stelle sicher, dass das Bild existiert; sonst einfach die Zeile anpassen:
  bg.style.backgroundImage = 'url("../../assets/ui/start_bg.jpg")';
  document.body.appendChild(bg);

  // ---- Startpanel -----------------------------------------------------------
  const panel = document.createElement("div");
  panel.id = "start-panel";
  panel.className = "wood-frame";
  panel.innerHTML = `
    <div class="box">
      <h1>Neue Siedler</h1>
      <div class="actions">
        <button id="btn-start">Spiel starten</button>
        <button id="btn-continue" title="Fortsetzen (sofern Save vorhanden)">Weiterspielen</button>
      </div>
    </div>
  `;
  root.appendChild(panel);

  // UI-Bereitschaft melden (Inspector etc. können reagieren)
  LOG("Startfenster erstellt → cb:ui-ready");
  window.dispatchEvent(new CustomEvent("cb:ui-ready"));

  // Klick: Start
  panel.querySelector("#btn-start").addEventListener("click", ()=>{
    LOG("Start → req:game:start");
    window.dispatchEvent(new CustomEvent("req:game:start"));

    // Panel sofort weg, Hintergrund weich ausblenden
    panel.remove();
    bg.classList.add("is-hidden");
    // Option: Hintergrund nach Fade komplett entfernen
    setTimeout(()=> bg.remove(), 600);
  });

  // Optional: Continue (nur ein Stub-Event, echte Save-Logik später)
  panel.querySelector("#btn-continue").addEventListener("click", ()=>{
    LOG("Weiterspielen → req:game:continue");
    window.dispatchEvent(new CustomEvent("req:game:continue"));
    panel.remove();
    bg.classList.add("is-hidden");
    setTimeout(()=> bg.remove(), 600);
  });
})();
