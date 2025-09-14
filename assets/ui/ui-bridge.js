/* =============================================================================
Datei: assets/ui/ui-bridge.js
Projekt: Neue Siedler
Version: v17.9.2
Zweck:
  - Verbindet FABs/Hotkeys mit BESTEHENDEN Modulen.
  - Build-Dock: window.UIBuild (legt #build-dock notfalls an).
  - Inspector:  window.Inspector.* (keine Fallback-UI).
    Falls .toggle/.open/.close fehlen, sorgt inspector.compat.js dafür.
    Zusätzlich: letzte Sicherheitsstufe → sichtbare Root klassisch ein-/ausblenden.
============================================================================= */

const UIBRIDGE_VERSION = "v17.9.2";
const logI = (m)=> (window.CBLog?.info||console.log)(`[ui-bridge] ${m}`);
const logE = (m)=> (window.CBLog?.error||console.error)(`[ui-bridge] ${m}`);

function ensureBuildRoot(){
  let el = document.getElementById("build-dock") || document.getElementById("build-panel");
  if(!el){
    el = document.createElement("div");
    el.id = "build-dock";
    el.className = "ui-build-dock";
    el.setAttribute("aria-label","Bau-Menü");
    document.body.appendChild(el);
    logI("BuildDock: #build-dock automatisch erstellt (fehlte).");
  } else {
    el.classList.add("ui-build-dock");
  }
  return el;
}
function isOpen(el){ return !!el?.classList.contains("is-open"); }

// Inspector Root-Finder (nur ABFRAGE)
function findInspectorRoot(){
  return (
    document.getElementById("inspector-root") ||
    document.querySelector(".inspector-root") ||
    document.getElementById("inspector") ||
    document.querySelector("[data-inspector-root]") ||
    null
  );
}
function toggleRootVisibility(){
  // Letzte Sicherheitsstufe: vorhandenes Root zeigt/versteckt sich (kein neues UI!)
  const r = findInspectorRoot();
  if (!r) return false;
  const vis = r.classList.contains("is-open") || (r.style.display && r.style.display !== "none");
  if (vis){
    r.classList.remove("is-open"); r.style.display = "none";
  } else {
    r.style.display = "block"; r.classList.add("is-open");
  }
  return true;
}

window.GameUI = window.GameUI || {};

/* ------------------- Build ------------------- */
window.GameUI.toggleBuild = function(){
  const root = ensureBuildRoot();
  if(!window.UIBuild || typeof window.UIBuild.open!=="function"){
    logE("UIBuild fehlt/noch nicht geladen (assets/ui/ui-build.js).");
    return;
  }
  isOpen(root) ? window.UIBuild.close("toggle") : window.UIBuild.open("toggle");
};

/* ------------------- Inspector ------------------- */
window.GameUI.toggleInspector = function(){
  const I = window.Inspector;
  // 1) Bevorzugt echte API
  if (I && typeof I.toggle === "function") return I.toggle();
  if (I && (typeof I.open === "function" || typeof I.close === "function")){
    const r = findInspectorRoot();
    const vis = !!r && (r.classList.contains("is-open") || (r.style.display && r.style.display!=="none"));
    if (vis && typeof I.close === "function") return I.close("toggle");
    if (!vis && typeof I.open === "function")  return I.open("toggle");
  }
  // 2) Kompat-Datei sollte Events/Methode liefern – falls noch nicht geladen:
  //    Wir versuchen als allerletztes die sichtbare Root zu toggeln (wenn vorhanden).
  if (toggleRootVisibility()) return;
  logE("Inspector-API/Root nicht gefunden. Prüfe Reihenfolge in index.html (compat.js vor ui-bridge.js).");
};

/* ------------------- Boot + Hotkeys ------------------- */
document.addEventListener("DOMContentLoaded", ()=> logI(`bereit (${UIBRIDGE_VERSION})`));
window.addEventListener("keydown",(ev)=>{
  if(!ev.key) return;
  const k = ev.key.toLowerCase();
  if(k==="b") window.GameUI.toggleBuild();
  if(k==="i") window.GameUI.toggleInspector();
});

/* FAB-Abstand (reagiert auf beide Varianten aus ui-build.js) */
function markOpen(){ document.body.classList.add("has-build-open"); }
function markClose(){ document.body.classList.remove("has-build-open"); }
window.addEventListener("cb:build:open",  markOpen);
window.addEventListener("cb:build:close", markClose);
window.addEventListener("cb:build-open",  markOpen);
window.addEventListener("cb:build-close", markClose);
