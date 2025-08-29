// assets/ui/ui-bridge.js  — v16.1.18
// Bindet die sichtbaren Buttons an die (bereits vorhandene) Bau-UI an.
// Erwartete globale APIs (mind. eine von beiden):
//   - window.UIBuild: { open(), close(), toggle(), setTool(id), initDock? }
//   - window.GameUI:  { openBuildMenu(), closeBuildMenu(), toggleBuildMenu(), setTool(id) }
//
// Nichts am Layout ändern – nur verdrahten. Viel Logging für den Inspector.

(function(){
  const V = "v16.1.18";
  const $ = (sel)=> document.querySelector(sel);
  const LOG = {
    ok:   (m)=> (window.CBLog?.ok||console.log)(m),
    warn: (m)=> (window.CBLog?.warn||console.warn)(m),
    err:  (m)=> (window.CBLog?.err||console.error)(m),
    log:  (m)=> (window.CBLog?.push||console.log)("LOG", m)
  };

  // UI-Elemente
  const btnBuild   = $("#btn-build");
  const btnInspect = $("#btn-inspector");
  const buildDock  = $("#build-dock");

  // aktuelle Ziel-API (wird dynamisch ermittelt)
  let API = null;

  function detectAPI(){
    // Priorität: UIBuild, dann GameUI
    if (window.UIBuild && (window.UIBuild.open || window.UIBuild.toggle)){
      API = "UIBuild";
      return window.UIBuild;
    }
    if (window.GameUI && (window.GameUI.openBuildMenu || window.GameUI.toggleBuildMenu)){
      API = "GameUI";
      return window.GameUI;
    }
    API = null;
    return null;
  }

  function ensureDock(){
    // Falls deine Bau-UI das Dock selbst befüllt/steuert, tut dies nichts.
    // Andernfalls: kleines Fallback-Dock befüllen (Platzhalter), damit der Button was zeigt.
    if (!buildDock) return;
    if (buildDock.dataset.inited) return;
    buildDock.dataset.inited = "1";

    if (typeof window.UIBuild?.initDock === "function"){
      try { window.UIBuild.initDock(buildDock); return; }
      catch(e){ LOG.warn("UIBuild.initDock Fehler: "+e.message); }
    }

    // Fallback: sehr kleines Raster mit Dummy-Tools (nur optisch)
    const row = document.createElement("div");
    row.className = "row";
    row.innerHTML = `
      <div class="tool" data-tool="road">Straße</div>
      <div class="tool" data-tool="path">Weg</div>
      <div class="tool" data-tool="bulldozer">Abreißen</div>
      <div class="tool" data-tool="wood0">
        <img alt="wood0" src="./assets/tex/building/wood/haeuser_wood1.PNG" />
      </div>
    `;
    buildDock.appendChild(row);

    buildDock.addEventListener("click", (ev)=>{
      const btn = ev.target.closest(".tool");
      if (!btn) return;
      const tool = btn.dataset.tool;
      setTool(tool);
    });
  }

  function openDock(){
    if (!buildDock) return;
    buildDock.classList.add("open");
  }
  function closeDock(){
    if (!buildDock) return;
    buildDock.classList.remove("open");
  }

  function openMenu(){
    const api = detectAPI();
    if (!api){
      LOG.warn("Bau-Menü API nicht gefunden – erwarte globale Variable z.B. window.UIBuild oder window.GameUI.");
      ensureDock(); openDock();
      return;
    }
    try{
      if (API === "UIBuild"){
        api.open?.(buildDock) ?? api.toggle?.(buildDock);
      } else {
        api.openBuildMenu?.() ?? api.toggleBuildMenu?.();
      }
      LOG.ok("Bau-Menü geöffnet ("+(API||"fallback")+")");
    }catch(e){
      LOG.err("Bau-Menü öffnen fehlgeschlagen: "+e.message);
      ensureDock(); openDock();
    }
  }
  function closeMenu(){
    const api = detectAPI();
    if (!api){ closeDock(); return; }
    try{
      if (API === "UIBuild"){
        api.close?.(buildDock) ?? api.toggle?.(buildDock);
      } else {
        api.closeBuildMenu?.() ?? api.toggleBuildMenu?.();
      }
      LOG.ok("Bau-Menü geschlossen");
    }catch(e){
      LOG.err("Bau-Menü schließen Fehlermeldung: "+e.message);
      closeDock();
    }
  }
  function toggleMenu(){
    const api = detectAPI();
    if (!api){ ensureDock(); buildDock.classList.toggle("open"); return; }
    try{
      if (API === "UIBuild"){
        api.toggle?.(buildDock) ?? (buildDock.classList.toggle("open"));
      } else {
        api.toggleBuildMenu?.() ?? (buildDock.classList.toggle("open"));
      }
    }catch(e){
      LOG.err("Bau-Menü toggle Fehlermeldung: "+e.message);
      buildDock.classList.toggle("open");
    }
  }
  function setTool(id){
    const api = detectAPI();
    try{
      if (api){
        if (API === "UIBuild"){
          api.setTool?.(id);
        } else {
          api.setTool?.(id); // GameUI.setTool(id)
        }
        LOG.ok(`Tool gesetzt: ${id}`);
      } else {
        LOG.warn("Tool setzen ohne API – Fallback (nur Anzeige)");
      }
    }catch(e){
      LOG.err("Tool setzen Fehlermeldung: "+e.message);
    }
  }

  // Buttons verdrahten (wenn vorhanden)
  btnBuild?.addEventListener("click", toggleMenu);
  // Inspector-Button klickt dein vorhandenes Inspector-Overlay (dieser Hook lässt dein Layout in Ruhe)
  btnInspect?.addEventListener("click", ()=>{
    try{
      // Dein Inspector exportiert global CBInspector.toggle? Falls nicht, ignorieren.
      window.CBInspector?.open?.() || window.CBInspector?.toggle?.();
    }catch(_){}
  });

  // Spielstart -> Bau-Button sichtbar machen
  function onGameStarted(){
    try{
      ensureDock();
      btnBuild?.classList.add("visible");
      LOG.ok("onGameStarted: Bau-Button aktiviert");
    }catch(e){
      LOG.warn("onGameStarted: "+e.message);
    }
  }

  // Events aus game.js / main.js
  window.addEventListener("cb:game-started", ()=> {
    LOG.log("Event: cb:game-started empfangen");
    onGameStarted();
  });

  // Exporte (falls du sie direkt ansprechen willst)
  window.GameUI = window.GameUI || {};
  window.GameUI.openBuildMenu  = openMenu;
  window.GameUI.closeBuildMenu = closeMenu;
  window.GameUI.toggleBuildMenu= toggleMenu;
  window.GameUI.setTool        = setTool;
  window.GameUI.onGameStarted  = onGameStarted;

  LOG.ok(`ui-bridge.js bereit (${V})`);
})();
