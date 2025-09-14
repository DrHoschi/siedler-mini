/* 
====================================================================================
Datei: assets/ui/ui-bridge.js
Projekt: Neue Siedler
Version: v17.8.5
Zweck: Brücke zwischen Buttons/Hotkeys und UI-Modulen.
Fixes:
- Bau-Dock: akzeptiert #build-dock ODER #build-panel; legt notfalls #build-dock an.
- Inspector: ruft vorhandene API (Inspector.toggle) ODER feuert alle Legacy/Neu-Events.
==================================================================================== */

const UIBRIDGE_VERSION = "v17.8.5";
function LOK(m){(window.CBLog?.ok||console.log)(`[ui-bridge] ${m}`);}
function LIN(m){(window.CBLog?.info||console.log)(`[ui-bridge] ${m}`);}
function LER(m){(window.CBLog?.error||console.error)(`[ui-bridge] ${m}`);}

function findBuildRoot(){
  let el = document.getElementById("build-dock") || document.getElementById("build-panel");
  if(!el){
    el = document.createElement("div");
    el.id = "build-dock";
    el.className = "ui-build-dock";
    el.setAttribute("aria-label","Bau-Menü");
    document.body.appendChild(el);
    LIN("Fallback: #build-dock erzeugt (fehlte im DOM).");
  }else{
    el.classList.add("ui-build-dock");
  }
  return el;
}
function isBuildOpen(root){ return !!root?.classList.contains("is-open"); }

window.GameUI = window.GameUI || {};

/* ------------------- Build Toggle ------------------- */
window.GameUI.toggleBuild = function(){
  const root = findBuildRoot();
  if(!window.UIBuild || typeof window.UIBuild.open!=="function"){
    LER("UIBuild nicht verfügbar – assets/ui/ui-build.js fehlt/noch nicht geladen.");
    return;
  }
  if(isBuildOpen(root)){ window.UIBuild.close("toggle"); }
  else { window.UIBuild.open("toggle"); }
};

/* ------------------- Inspector Toggle ------------------- */
function emit(name,detail){ try{ window.dispatchEvent(new CustomEvent(name,{detail:detail||{}})); }catch(e){} }

window.GameUI.toggleInspector = function(){
  try{
    // 1) Bevorzugt direkte API, falls vorhanden
    if (window.Inspector && typeof window.Inspector.toggle === "function"){
      window.Inspector.toggle();  // dein bisheriger Weg
      return;
    }
    // 2) Events – feuere ALLE Varianten (neu & legacy)
    ["cb:inspector:toggle","cb:inspector-toggle","inspector:toggle","inspector-toggle"]
      .forEach(evt=>emit(evt));
  }catch(e){
    LER("Inspector-Toggle Fehler: "+(e?.message||e));
  }
};

/* ------------------- Boot ------------------- */
document.addEventListener("DOMContentLoaded", ()=>{
  findBuildRoot();
  LIN(`bereit (${UIBRIDGE_VERSION})`);
});

// Hotkey „B“ öffnet Bau-Menü
window.addEventListener("keydown", ev=>{
  if(!ev.key) return;
  if(ev.key.toLowerCase()==="b"){ window.GameUI.toggleBuild(); }
});

// Body-Klasse für FAB-Abstand – unterstützt beide Event-Varianten
function markOpen(){ document.body.classList.add("has-build-open"); }
function markClose(){ document.body.classList.remove("has-build-open"); }
window.addEventListener("cb:build:open",  markOpen);
window.addEventListener("cb:build:close", markClose);
window.addEventListener("cb:build-open",  markOpen);   // legacy
window.addEventListener("cb:build-close", markClose);  // legacy
