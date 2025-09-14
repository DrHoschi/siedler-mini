/* =============================================================================
Datei: assets/ui/ui-bridge.js
Version: v17.8.6
Zweck: Brücke für FABs/Hotkeys.
Fix: Inspector-Button ruft wahlweise Inspector.toggle(), Inspector.open()/close()
     oder feuert alle bekannten Events (toggle/open/close, neu & legacy).
     Build-Dock weiterhin #build-dock/#build-panel kompatibel.
============================================================================= */

const UIBRIDGE_VERSION = "v17.8.6";
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

window.GameUI = window.GameUI || {};

/* ---------- Build ---------- */
window.GameUI.toggleBuild = function(){
  const root = findBuildRoot();
  if(!window.UIBuild || typeof window.UIBuild.open !== "function"){
    LER("UIBuild fehlt/noch nicht geladen.");
    return;
  }
  isOpen(root) ? window.UIBuild.close("toggle") : window.UIBuild.open("toggle");
};

/* ---------- Inspector ---------- */
let __inspectorState = { open:false };

function inspectorOpen(){
  if (window.Inspector?.open)       return window.Inspector.open();
  ["cb:inspector:open","cb:inspector-open","inspector:open","inspector-open"].forEach(e=>emit(e));
  __inspectorState.open = true;
}
function inspectorClose(){
  if (window.Inspector?.close)      return window.Inspector.close();
  ["cb:inspector:close","cb:inspector-close","inspector:close","inspector-close"].forEach(e=>emit(e));
  __inspectorState.open = false;
}
function inspectorToggle(){
  if (window.Inspector?.toggle)     return window.Inspector.toggle();
  ["cb:inspector:toggle","cb:inspector-toggle","inspector:toggle","inspector-toggle"].forEach(e=>emit(e));
  __inspectorState.open = !__inspectorState.open;
}

window.GameUI.toggleInspector = function(){
  try{
    // Versuche echte Toggle-API
    if (window.Inspector && typeof window.Inspector.toggle === "function") return inspectorToggle();

    // Wenn es ein Root-Element mit Sichtbarkeitsklasse gibt, nutze hartes Open/Close
    const root = document.getElementById("inspector-root") || document.querySelector(".inspector-root");
    if (root && root.classList.contains("is-open")) return inspectorClose();

    // Fallback: Toggle-Events
    inspectorToggle();
  }catch(e){
    LER("Inspector-Toggle Fehler: "+(e?.message||e));
  }
};

/* ---------- Boot ---------- */
document.addEventListener("DOMContentLoaded", ()=>{
  findBuildRoot();
  LIN(`bereit (${UIBRIDGE_VERSION})`);
});

window.addEventListener("keydown", ev=>{
  if(!ev.key) return;
  if(ev.key.toLowerCase()==="b") window.GameUI.toggleBuild();
});

/* Body-Klasse für FAB-Abstand (neu & legacy) */
function markOpen(){ document.body.classList.add("has-build-open"); }
function markClose(){ document.body.classList.remove("has-build-open"); }
["cb:build:open","cb:build-open"].forEach(e=>window.addEventListener(e, markOpen));
["cb:build:close","cb:build-close"].forEach(e=>window.addEventListener(e, markClose));
