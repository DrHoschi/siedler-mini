/* =============================================================================
Datei: assets/ui/ui-bridge.js
Projekt: Neue Siedler
Version: v17.9.1
Zweck: Bridging der FAB-Buttons/Hotkeys auf bestehende Module (UIBuild, Inspector).
       - KEINE neue UI, KEIN Fallback: nutzt euren alten Inspector.
       - Build-Dock: #build-dock ODER #build-panel; legt notfalls #build-dock an.
============================================================================= */

const UIBRIDGE_VERSION = "v17.9.1";
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
    logI("BuildDock: #build-dock automatisch erstellt (fehlte).");
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

/* ---------- Inspector (alter Bestand) ---------- */
function insp(){ return window.Inspector || null; }

window.GameUI.toggleInspector = function(){
  const I = insp();
  if(!I){ logE("Inspector-API nicht gefunden (window.Inspector.*). Prüfe Index-Includes."); return; }
  if (typeof I.toggle === "function") return I.toggle();
  // Falls nur open/close vorhanden: Toggle simulieren
  const root = document.getElementById("inspector-root") || document.querySelector(".inspector-root");
  const shown = !!root && root.classList.contains("is-open");
  if (shown && typeof I.close === "function") return I.close("toggle");
  if (!shown && typeof I.open === "function")  return I.open("toggle");
};

/* ---------- Boot + Hotkeys ---------- */
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
