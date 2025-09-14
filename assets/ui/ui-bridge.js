/* =============================================================================
Datei: assets/ui/ui-bridge.js
Version: v17.9.3
Zweck:
  - Verbindet FABs/Hotkeys mit BESTEHENDEN Modulen.
  - Build-Dock: window.UIBuild (legt #build-dock notfalls an).
  - Inspector:  window.Inspector.* (keine Fallback-UI).
    Zusätzlich: erkennt viele Root-IDs/Klassen und kann als letzte Stufe nur
    die Sichtbarkeit toggeln (ohne DOM neu zu bauen).
============================================================================= */

const UIBRIDGE_VERSION = "v17.9.3";
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

// Inspector Root – möglichst viele Varianten abdecken
function findInspectorRoot(){
  return (
    document.getElementById("inspector-root")    ||
    document.querySelector(".inspector-root")    ||
    document.getElementById("inspectorOverlay")  ||
    document.getElementById("inspector")         ||
    document.querySelector("#overlay-inspector") ||
    document.querySelector("[data-inspector-root]") ||
    null
  );
}
function rootToggleOnly(){
  const r = findInspectorRoot();
  if (!r) return false;
  const vis = r.classList.contains("is-open") || (r.style.display && r.style.display !== "none");
  if (vis){ r.classList.remove("is-open"); r.style.display = "none"; }
  else    { r.style.display = "block";     r.classList.add("is-open"); }
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
  // 1) Normale API
  if (I && typeof I.toggle === "function") return I.toggle();
  if (I && (typeof I.open === "function" || typeof I.close === "function")){
    const r = findInspectorRoot();
    const vis = !!r && (r.classList.contains("is-open") || (r.style.display && r.style.display!=="none"));
    if (vis && typeof I.close === "function") return I.close("toggle");
    if (!vis && typeof I.open  === "function") return I.open("toggle");
  }
  // 2) Letzte Stufe: sichtbare Root toggeln (ohne neue UI)
  if (rootToggleOnly()) return;
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
