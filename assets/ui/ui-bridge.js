/* =============================================================================
   Datei: assets/ui/ui-bridge.js
   Standard: CODE_STYLE (Imports → Konstanten → Hilfsfunktionen → Klassen → Hauptlogik → Exports)
   Zweck:
     - Stellt die Monolith-Verknüpfung wieder her:
         index.html onclick="GameUI.toggleInspector()" → öffnet euren bestehenden Inspector.
     - Kein neues UI, keine Überschreibungen. Nur Brücke.
     - Unterstützt ALT (UIInspector), NEU (Inspector), alte & neue Toggle-Events.
     - Build-Toggle bleibt kompatibel (#build-dock ODER #build-panel), inkl. FAB-Abstand.
============================================================================= */

/* ---------------------------------- Imports --------------------------------- */
// (keine)

/* -------------------------------- Konstanten -------------------------------- */
const UI_BRIDGE_VER = "v18.0.0-mono";
const logI = (m)=> (window.CBLog?.info || console.log)(`[ui-bridge] ${m}`);
const logW = (m)=> (window.CBLog?.warn || console.warn)(`[ui-bridge] ${m}`);
const logE = (m)=> (window.CBLog?.error|| console.error)(`[ui-bridge] ${m}`);

// Events, die in deinem Monolith-Stand üblich waren/sein können:
const INSPECTOR_TOGGLE_EVENTS = [
  "inspector:toggle",        // alt (monolithisch)
  "cb:inspector-toggle",     // legacy
  "cb:inspector:toggle"      // neu
];

/* ------------------------------- Hilfsfunktionen ---------------------------- */
function ensureBuildRoot(){
  // Akzeptiert alten und neuen Anker
  let el = document.getElementById("build-dock") || document.getElementById("build-panel");
  if (!el){
    // Fallback: NICHT neu gestalten – nur minimalen Anker bereitstellen
    el = document.createElement("div");
    el.id = "build-dock";
    el.className = "ui-build-dock";
    el.setAttribute("aria-label","Bau-Menü");
    document.body.appendChild(el);
    logW("BuildDock: #build-dock (fallback) angelegt – fehlte im DOM.");
  } else {
    el.classList.add("ui-build-dock");
  }
  return el;
}
function isOpen(el){ return !!el && el.classList.contains("is-open"); }

function findInspectorRoot(){
  // Breites Set an Selektoren aus deinen Ständen
  return (
    document.getElementById("inspector-root") ||
    document.getElementById("inspectorOverlay") ||
    document.getElementById("inspector") ||
    document.getElementById("ui-inspector") ||
    document.querySelector("#overlay-inspector") ||
    document.querySelector(".inspector-root") ||
    document.querySelector(".inspector-overlay") ||
    document.querySelector("[data-inspector-root]") ||
    null
  );
}

function fireToggleEvents(detail){
  INSPECTOR_TOGGLE_EVENTS.forEach(name=>{
    try{ window.dispatchEvent(new CustomEvent(name,{detail})); }catch(_){}
  });
}

/* ---------------------------------- Klassen -------------------------------- */
// (keine)

/* --------------------------------- Hauptlogik ------------------------------- */
(function initBridge(){
  // Build-API
  function markOpen(){ document.body.classList.add("has-build-open"); }
  function markClose(){ document.body.classList.remove("has-build-open"); }

  function toggleBuild(){
    const root = ensureBuildRoot();

    // Bevorzugt eure Build-API (falls ui-build.js geladen ist)
    if (window.UIBuild && typeof window.UIBuild.open === "function"){
      isOpen(root) ? window.UIBuild.close("toggle") : window.UIBuild.open("toggle");
      return;
    }

    // Sanfter Fallback: Nur Sichtbarkeit schalten + Events spiegeln
    const visible = root.style.display !== "none";
    root.style.display = visible ? "none" : "block";
    root.classList.toggle("is-open", !visible);
    (!visible ? markOpen : markClose)();
    const ev = !visible ? "cb:build:open" : "cb:build:close";
    try{ window.dispatchEvent(new CustomEvent(ev,{detail:{from:"ui-bridge"}})); }catch(_){}
  }

  // Inspector-API (Monolith-Verknüpfung)
  function toggleInspector(){
    const d = { from: "ui-bridge" };

    // 1) ALT (monolithischer Inspector): window.UIInspector
    if (window.UIInspector){
      if (typeof window.UIInspector.toggle === "function"){ window.UIInspector.toggle(); return; }
      const r = findInspectorRoot();
      const vis = !!r && (r.classList.contains("is-open") || (r.style.display && r.style.display!=="none"));
      if (vis && typeof window.UIInspector.close === "function"){ window.UIInspector.close("toggle"); return; }
      if (!vis && typeof window.UIInspector.open  === "function"){ window.UIInspector.open("toggle");  return; }
    }

    // 2) NEU (gesplittet): window.Inspector
    if (window.Inspector){
      if (typeof window.Inspector.toggle === "function"){ window.Inspector.toggle(); return; }
      const r = findInspectorRoot();
      const vis = !!r && (r.classList.contains("is-open") || (r.style.display && r.style.display!=="none"));
      if (vis && typeof window.Inspector.close === "function"){ window.Inspector.close("toggle"); return; }
      if (!vis && typeof window.Inspector.open  === "function"){ window.Inspector.open("toggle");  return; }
    }

    // 3) Events (alt + legacy + neu) → trifft euren bisherigen Stand sicher
    fireToggleEvents(d);

    // 4) letzter Fallback: vorhandene Root lediglich sichtbar/unsichtbar schalten
    const r = findInspectorRoot();
    if (r){
      const vis = r.classList.contains("is-open") || (r.style.display && r.style.display!=="none");
      if (vis){ r.classList.remove("is-open"); r.style.display = "none"; }
      else    { r.style.display = "block";     r.classList.add("is-open"); }
      return;
    }

    logE("Inspector nicht erreichbar (keine API/Listener/Root). Prüfe Reihenfolge & Root-Selektor.");
  }

  // Exports (globale API für index.html Buttons)
  window.GameUI = window.GameUI || {};
  window.GameUI.toggleBuild = toggleBuild;
  window.GameUI.toggleInspector = toggleInspector;

  document.addEventListener("DOMContentLoaded", ()=> logI(`bereit (${UI_BRIDGE_VER})`));
})();

/* ----------------------------------- Exports -------------------------------- */
// window.GameUI (oben gesetzt)
