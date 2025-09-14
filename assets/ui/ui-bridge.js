/* =============================================================================
Datei: assets/ui/ui-bridge.js
Version: v17.9.0
Zweck: Bridging für Build-Dock & alten Inspector. KEIN Fallback, KEIN neues UI.
============================================================================= */
const UIBRIDGE_VERSION = "v17.9.0";
function logI(m){(window.CBLog?.info||console.log)(`[ui-bridge] ${m}`);}
function logE(m){(window.CBLog?.error||console.error)(`[ui-bridge] ${m}`);}

function ensureBuildRoot(){
  let el = document.getElementById("build-dock") || document.getElementById("build-panel");
  if(!el){
    el = document.createElement("div");
    el.id = "build-dock";
    el.className = "ui-build-dock";
    el.setAttribute("aria-label","Bau-Menü");
    document.body.appendChild(el);
    logI("BuildDock: #build-dock erzeugt (fehlte).");
  } else {
    el.classList.add("ui-build-dock");
  }
  return el;
}
function isOpen(el){ return !!el?.classList.contains("is-open"); }

window.GameUI = window.GameUI || {};

/* ---------- Build ---------- */
window.GameUI.toggleBuild = function(){
  const root = ensureBuildRoot();
  if(!window.UIBuild || typeof window.UIBuild.open!=="function"){
    logE("UIBuild fehlt/noch nicht geladen (assets/ui/ui-build.js).");
    return;
  }
  isOpen(root) ? window.UIBuild.close("toggle") : window.UIBuild.open("toggle");
};

/* ---------- Inspector (alter, bestehender) ---------- */
function inspAPI(){
  return (window.Inspector && (
    typeof window.Inspector.toggle==="function" ||
    typeof window.Inspector.open  ==="function" ||
    typeof window.Inspector.close ==="function"
  )) ? window.Inspector : null;
}
window.GameUI.toggleInspector = function(){
  const I = inspAPI();
  if(!I){ logE("Inspector-API nicht gefunden (window.Inspector.*). Prüfe Index-Includes."); return; }
  if(typeof I.toggle==="function") return I.toggle();
  // falls kein toggle vorhanden, simuliere via open/close + Sichtbarkeit
  const root = document.getElementById("inspector-root") || document.querySelector(".inspector-root");
  const shown = !!root && root.classList.contains("is-open");
  if(shown && typeof I.close==="function") return I.close("toggle");
  if(!shown && typeof I.open==="function")  return I.open("toggle");
};

document.addEventListener("DOMContentLoaded", ()=> logI(`bereit (${UIBRIDGE_VERSION})`));
window.addEventListener("keydown",(ev)=>{
  if(!ev.key) return;
  const k = ev.key.toLowerCase();
  if(k==="b") window.GameUI.toggleBuild();
  if(k==="i") window.GameUI.toggleInspector();
});

/* Body-Klasse (für FAB-Abstand) – reagiert auf beide Varianten aus ui-build.js */
function markOpen(){ document.body.classList.add("has-build-open"); }
function markClose(){ document.body.classList.remove("has-build-open"); }
window.addEventListener("cb:build:open",  markOpen);
window.addEventListener("cb:build:close", markClose);
window.addEventListener("cb:build-open",  markOpen);
window.addEventListener("cb:build-close", markClose);
