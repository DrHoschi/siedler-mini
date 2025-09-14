/* =============================================================================
Datei: assets/ui/ui-bridge.js
Projekt: Neue Siedler
Version: v17.9.4
Zweck:
  - Verbindet FABs/Hotkeys mit BESTEHENDEN Modulen.
  - Build-Dock: window.UIBuild (#build-dock ODER #build-panel; legt notfalls #build-dock an).
  - Inspector:  NUR euren vorhandenen Inspector ansprechen:
      1) wenn vorhanden: window.Inspector.toggle()
      2) sonst: alle bekannten Toggle-Events feuern (neu/legacy)
      3) letzte Stufe: vorhandene Inspector-Root nur sichtbar/unsichtbar schalten
  - Keine neue UI, keine DOM-Struktur ersetzen.
============================================================================= */

const UIBRIDGE_VERSION = "v17.9.4";
const logI = (m)=> (window.CBLog?.info || console.log)(`[ui-bridge] ${m}`);
const logE = (m)=> (window.CBLog?.error|| console.error)(`[ui-bridge] ${m}`);

/* ---------- Build-Dock ---------- */
function ensureBuildRoot(){
  let el = document.getElementById("build-dock") || document.getElementById("build-panel");
  if(!el){
    el = document.createElement("div");
    el.id = "build-dock";
    el.className = "ui-build-dock";
    el.setAttribute("aria-label","Bau-Menü");
    document.body.appendChild(el);
    logI("BuildDock: #build-dock automatisch erstellt (fehlte).");
  }else{
    el.classList.add("ui-build-dock");
  }
  return el;
}
function isOpen(el){ return !!el?.classList.contains("is-open"); }

/* ---------- Inspector Root – nur abfragen (nichts neu bauen) ---------- */
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

/* ---------- Events ---------- */
const TOGGLE_EVENTS = [
  "cb:inspector:toggle",   // neu (Doppelpunkt)
  "cb:inspector-toggle",   // legacy (Bindestrich)
  "inspector:toggle",
  "inspector-toggle",
  "cb:insp:toggle",        // Kurzform (Lastenheft-Zukunft)
  "cb:insp-toggle"
];
function emit(name, detail){ try{ window.dispatchEvent(new CustomEvent(name,{detail:detail||{}})); }catch(_){} }

/* ---------- Globales API ---------- */
window.GameUI = window.GameUI || {};

/* Build */
window.GameUI.toggleBuild = function(){
  const root = ensureBuildRoot();
  if(!window.UIBuild || typeof window.UIBuild.open!=="function"){
    logE("UIBuild fehlt/noch nicht geladen (assets/ui/ui-build.js).");
    return;
  }
  isOpen(root) ? window.UIBuild.close("toggle") : window.UIBuild.open("toggle");
};

/* Inspector – nur verbinden, nichts umbauen */
window.GameUI.toggleInspector = function(){
  // 1) echte API vorhanden?
  if (window.Inspector && typeof window.Inspector.toggle === "function"){
    return window.Inspector.toggle();
  }
  // 2) open/close vorhanden? dann über Sichtbarkeit entscheiden
  if (window.Inspector && (typeof window.Inspector.open === "function" || typeof window.Inspector.close === "function")){
    const r = findInspectorRoot();
    const visible = !!r && (r.classList.contains("is-open") || (r.style.display && r.style.display !== "none"));
    if (visible && typeof window.Inspector.close === "function") return window.Inspector.close("toggle");
    if (!visible && typeof window.Inspector.open  === "function") return window.Inspector.open("toggle");
  }
  // 3) Events feuern – alle Varianten (neu/legacy/kurz), damit euer vorhandener Listener trifft
  TOGGLE_EVENTS.forEach(evt => emit(evt, { from:"bridge" }));

  // 4) letzte Stufe: Root sichtbar/unsichtbar schalten (ohne neue UI)
  const root = findInspectorRoot();
  if (root){
    const visible = root.classList.contains("is-open") || (root.style.display && root.style.display !== "none");
    if (visible){ root.classList.remove("is-open"); root.style.display = "none"; }
    else        { root.style.display = "block";     root.classList.add("is-open"); }
    return;
  }
  logE("Inspector nicht erreichbar (keine API/Root/Listener). Prüfe Script-Reihenfolge.");
};

/* ---------- Boot + Hotkeys ---------- */
document.addEventListener("DOMContentLoaded", ()=> logI(`bereit (${UIBRIDGE_VERSION})`));
window.addEventListener("keydown",(ev)=>{
  if(!ev.key) return;
  const k = ev.key.toLowerCase();
  if(k==="b") window.GameUI.toggleBuild();
  if(k==="i") window.GameUI.toggleInspector();
});

/* FAB-Abstand (neu & legacy Build-Events) */
function markOpen(){ document.body.classList.add("has-build-open"); }
function markClose(){ document.body.classList.remove("has-build-open"); }
window.addEventListener("cb:build:open",  markOpen);
window.addEventListener("cb:build:close", markClose);
window.addEventListener("cb:build-open",  markOpen);
window.addEventListener("cb:build-close", markClose);
