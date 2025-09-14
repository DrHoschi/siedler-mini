/* =============================================================================
Datei: assets/ui/ui-bridge.js
Projekt: Neue Siedler
Version: v17.8.7
Zweck: Brücke für FABs/Hotkeys.
 - Build-Dock: #build-dock ODER #build-panel; legt notfalls Dock an.
 - Inspector: ruft UIInspector/Inspector APIs ODER feuert alle bekannten Events.
============================================================================= */

const UIBRIDGE_VERSION = "v17.8.7";
function LOK(m){(window.CBLog?.ok||console.log)(`[ui-bridge] ${m}`);}
function LIN(m){(window.CBLog?.info||console.log)(`[ui-bridge] ${m}`);}
function LER(m){(window.CBLog?.error||console.error)(`[ui-bridge] ${m}`);}

function findBuildRoot(){
  let el = document.getElementById("build-dock") || document.getElementById("build-panel");
  if(!el){
    el = document.createElement("div");
    el.id = "build-dock";
    el.className = "ui-build-dock";
    el.setAttribute("aria-label", "Bau-Menü");
    document.body.appendChild(el);
    LIN("Fallback: #build-dock erzeugt.");
  } else {
    el.classList.add("ui-build-dock");
  }
  return el;
}
function isOpen(el){ return !!el?.classList.contains("is-open"); }
function emit(n,d){ try{ window.dispatchEvent(new CustomEvent(n,{detail:d||{}})); }catch(e){} }

/* -------- Globales UI-Objekt -------- */
window.GameUI = window.GameUI || {};

/* ---------- Build ---------- */
window.GameUI.toggleBuild = function(){
  const root = findBuildRoot();
  if(!window.UIBuild || typeof window.UIBuild.open !== "function"){
    LER("UIBuild fehlt/noch nicht geladen (assets/ui/ui-build.js).");
    return;
  }
  isOpen(root) ? window.UIBuild.close("toggle") : window.UIBuild.open("toggle");
};

/* ---------- Inspector ---------- */
/* Einheitlicher Aufruf – probiert mehrere Varianten durch */
window.GameUI.toggleInspector = function(){
  try{
    if (window.UIInspector?.toggle) return window.UIInspector.toggle();
    if (window.Inspector?.toggle)   return window.Inspector.toggle();

    // Fallback: Events (neu & legacy)
    ["cb:inspector:toggle","cb:inspector-toggle","inspector:toggle","inspector-toggle"]
      .forEach(e=>emit(e));
  }catch(e){
    LER("Inspector-Toggle Fehler: "+(e?.message||e));
  }
};

/* ---------- Boot ---------- */
document.addEventListener("DOMContentLoaded", ()=>{
  findBuildRoot();
  LIN(`bereit (${UIBRIDGE_VERSION})`);
});

/* Hotkey „B“ → Build-Dock */
window.addEventListener("keydown", ev=>{
  if(!ev.key) return;
  if(ev.key.toLowerCase()==="b") window.GameUI.toggleBuild();
});

/* Body-Klasse für FAB-Abstand (neu & legacy) */
function markOpen(){ document.body.classList.add("has-build-open"); }
function markClose(){ document.body.classList.remove("has-build-open"); }
["cb:build:open","cb:build-open"].forEach(e=>window.addEventListener(e, markOpen));
["cb:build:close","cb:build-close"].forEach(e=>window.addEventListener(e, markClose));
