/* =============================================================================
 * ui-build.js — v16.1.10
 * Zweck: Bau-Menü + Platzier-Events in die Engine (cb:place) bridgen.
 * Änderungen:
 *  - Führt die Tools 'path','road','bulldozer','wood0','wood1','wood2'
 *  - Beim Klicken aufs Grid: dispatchEvent('cb:place', {tool,x,y})
 *  - Kein Karten-Start hier drin; das macht dein Start-Fenster/Inspector.
 * =========================================================================== */

(() => {
  const V = "v16.1.10";
  const log = (...a)=>console.log(`[${new Date().toLocaleTimeString()}]`,...a);
  const ok  = (m)=>log("✅ (ok)", m);
  const warn= (m)=>log("⚠️ (warn)", m);

  const UI = {
    root: null,
    isOpen: false,
    currentTool: null,
    tools: [
      {id:"path",     label:"Pfad"},
      {id:"road",     label:"Straße"},
      {id:"bulldozer",label:"Bulldozer"},
      {id:"wood0",    label:"Lumberjack T1"},
      {id:"wood1",    label:"Lumberjack T2"},
      {id:"wood2",    label:"Lumberjack T3"},
    ]
  };
  window.GameUI = window.GameUI || {};
  window.GameUI.version = V;

  // --- UI Erzeugen -----------------------------------------------------------
  function buildUI(){
    const host = document.getElementById("ui-root");
    UI.root = host;

    const bar = document.createElement("div");
    bar.id = "build-toolbar";
    bar.style.position = "fixed";
    bar.style.left = "12px";
    bar.style.bottom = "12px";
    bar.style.padding = "8px";
    bar.style.background = "rgba(0,0,0,.55)";
    bar.style.backdropFilter = "blur(6px)";
    bar.style.borderRadius = "10px";
    bar.style.display = "flex";
    bar.style.gap = "8px";
    bar.style.zIndex = "20";

    UI.tools.forEach(t=>{
      const b = document.createElement("button");
      b.textContent = t.label;
      b.title = t.id;
      b.style.padding = "8px 10px";
      b.style.minWidth = "78px";
      b.addEventListener("click", ()=>{
        UI.currentTool = t.id;
        ok(`Tool gesetzt: ${t.id}`);
      });
      bar.appendChild(b);
    });

    host.appendChild(bar);
    ok(`Bau-Menü bereit (ui-build.js ${V})`);
  }

  // --- Platzieren auf Canvas -------------------------------------------------
  function installCanvasPlacer(){
    const c = document.getElementById("game-canvas");
    if (!c){ warn("Kein Canvas gefunden – Platzieren deaktiviert."); return; }
    c.addEventListener("click", (ev)=>{
      if (!UI.currentTool) return;
      const rect = c.getBoundingClientRect();
      const dpr = Math.max(1, Math.round(window.devicePixelRatio||1));
      const xPix = (ev.clientX - rect.left);
      const yPix = (ev.clientY - rect.top);
      const tileSize = window.Game?.getState()?.tileSize || 64;
      const gx = Math.floor(xPix / tileSize);
      const gy = Math.floor(yPix / tileSize);

      // An Engine bridgen:
      window.dispatchEvent(new CustomEvent('cb:place', {
        detail:{ tool:UI.currentTool, x:gx, y:gy }
      }));
      ok(`Platziert: ${UI.currentTool} @ (${gx},${gy})`);
    });
  }

  // --- UI Hooks, die von außen aufgerufen werden können ----------------------
  window.GameUI.openBuildMenu  = function(){ /* Toolbar ist immer sichtbar */ };
  window.GameUI.closeBuildMenu = function(){ /* belassen wir offen */ };
  window.GameUI.onGameStarted  = function(){ ok("Event: cb:game-started empfangen"); };

  // --- Boot ------------------------------------------------------------------
  window.addEventListener("DOMContentLoaded", ()=>{
    buildUI();
    installCanvasPlacer();
  });
})();
