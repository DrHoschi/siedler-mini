/* ============================================================================
 * Datei   : ui/ui-start.js
 * Projekt : Neue Siedler
 * Version : v25.10.16-2
 * Zweck   : Startfenster (Holzrahmen-Quadrat, 4 Buttons); Startbild via CSS-Var
 * Events  : emit cb:ui-ready, req:game:start, req:game:continue, req:game:reset
 * ============================================================================
 */
(function(){
  const LOG = (m)=> (window.CBLog?.ok || console.log)(`[ui-start] ${m}`);
  const root = document.getElementById("ui-root");

  // --- 1) Start-Hintergrund robust bestimmen --------------------------------
  // Wir testen mehrere Pfade/Schreibweisen und setzen die CSS-Var --start-bg-url
  const candidatePaths = [
    "../../assets/UI/Start-bg.PNG",
    "../../assets/UI/Start-bg.png",
    "../../assets/ui/Start-bg.PNG",
    "../../assets/ui/Start-bg.png",
    "../../assets/ui/start-bg.png",
    "../../assets/ui/start-bg.PNG",
  ];
  (async function pickStartImage(){
    for(const p of candidatePaths){
      const ok = await probeImage(p);
      if(ok){
        document.documentElement.style.setProperty("--start-bg-url", `url("${p}")`);
        LOG("Startbild gesetzt: " + p);
        return;
      }
    }
    LOG("⚠️  Kein Startbild gefunden – Fallback aus ui.css wird verwendet.");
  })();
  function probeImage(src){
    return new Promise(res=>{
      const img = new Image();
      img.onload = ()=> res(true);
      img.onerror = ()=> res(false);
      img.src = src;
    });
  }

  // --- 2) Panel anlegen (quadratisch, 4 Buttons) -----------------------------
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
      <div class="foot"></div>
    </div>
  `;
  root.appendChild(panel);

  // UI bereit
  LOG("Startpanel bereit → cb:ui-ready");
  window.dispatchEvent(new CustomEvent("cb:ui-ready"));

  // --- 3) Button-Handler -----------------------------------------------------
  panel.querySelector("#btn-start").addEventListener("click", ()=>{
    LOG("Start → req:game:start");
    window.dispatchEvent(new CustomEvent("req:game:start"));
    panel.remove(); // Panel sofort weg; body::before fade erfolgt beim cb:game-start (via bootstrap .is-started)
  });

  panel.querySelector("#btn-continue").addEventListener("click", ()=>{
    LOG("Weiterspielen → req:game:continue");
    window.dispatchEvent(new CustomEvent("req:game:continue"));
    panel.remove();
  });

  panel.querySelector("#btn-reset").addEventListener("click", ()=>{
    LOG("Reset → req:game:reset");
    // Optional: lokale Speichersysteme hier leeren (nur Stub – echte Persistenz später)
    try{ localStorage.clear(); }catch(e){}
    window.dispatchEvent(new CustomEvent("req:game:reset"));
  });

  panel.querySelector("#btn-fullscreen").addEventListener("click", async ()=>{
    LOG("Vollbild an/aus");
    const el = document.documentElement;
    try{
      if(!document.fullscreenElement){
        await (el.requestFullscreen?.() || el.webkitRequestFullscreen?.call(el));
      }else{
        await (document.exitFullscreen?.() || document.webkitExitFullscreen?.());
      }
    }catch(e){
      LOG("⚠️ Vollbild nicht unterstützt / verweigert (iOS Safari limitiert).");
    }
  });
})();
