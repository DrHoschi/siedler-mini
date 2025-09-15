/* =============================================================================
   Datei: assets/ui/ui-bridge.js
   Zweck: Stellt die alte Inspector-Verknüpfung wieder her (ALT + NEU + Events).
   Keine Styles, kein UI-Umbau. Nur Button→Inspector.
   Standard: Imports → Konstanten → Hilfsfunktionen → Klassen → Hauptlogik → Exports
============================================================================= */

/* -------------------------------- Konstanten -------------------------------- */
const UI_BRIDGE_VER = "v18.0.1-min";
const L = (m)=> (window.CBLog?.info || console.log)(`[ui-bridge] ${m}`);

/* ------------------------------- Hilfsfunktionen ---------------------------- */
function findInspectorRoot(){
  // Deckt die üblichen Bezeichnungen aus deinem Projekt ab (alt & neu)
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
function fireAllToggleEvents(){
  // Feuert ALLE bekannten Event-Namen – das war der funktionierende Stand
  ["inspector:toggle","cb:inspector-toggle","cb:inspector:toggle"].forEach(name=>{
    try{ window.dispatchEvent(new CustomEvent(name,{detail:{from:"ui-bridge"}})); }catch(_){}
  });
}

/* --------------------------------- Hauptlogik ------------------------------- */
(function init(){
  window.GameUI = window.GameUI || {};

  // Build: NICHTS ändern – nur weiterreichen, falls vorhanden (sonst no-op)
  window.GameUI.toggleBuild = function(){
    if (window.UIBuild?.toggle) return window.UIBuild.toggle("button");
    const root = document.getElementById("build-dock") || document.getElementById("build-panel");
    if (!root) return;
    const open = !root.classList.contains("is-open");
    root.classList.toggle("is-open", open);
    root.style.display = open ? "block":"none";
    document.body.classList.toggle("has-build-open", open);
  };

  // Inspector: exakt wie früher – API (alt/neu) → sonst Events → sonst Root sichtbar
  window.GameUI.toggleInspector = function(){
    // 1) ALT (monolithisch)
    if (window.UIInspector){
      if (typeof window.UIInspector.toggle === "function") return window.UIInspector.toggle();
      const root = findInspectorRoot();
      const vis  = !!root && (root.classList.contains("is-open") || (root.style.display && root.style.display!=="none"));
      if (vis && typeof window.UIInspector.close === "function") return window.UIInspector.close("toggle");
      if (!vis && typeof window.UIInspector.open  === "function") return window.UIInspector.open("toggle");
    }
    // 2) NEU (gesplittet)
    if (window.Inspector){
      if (typeof window.Inspector.toggle === "function") return window.Inspector.toggle();
      const root = findInspectorRoot();
      const vis  = !!root && (root.classList.contains("is-open") || (root.style.display && root.style.display!=="none"));
      if (vis && typeof window.Inspector.close === "function") return window.Inspector.close("toggle");
      if (!vis && typeof window.Inspector.open  === "function")  return window.Inspector.open("toggle");
    }
    // 3) Events wie im alten Stand
    fireAllToggleEvents();

    // 4) letzter Fallback: vorhandenen Root sichtbar/unsichtbar schalten (keine neue UI!)
    const r = findInspectorRoot();
    if (r){
      const vis = r.classList.contains("is-open") || (r.style.display && r.style.display!=="none");
      if (vis){ r.classList.remove("is-open"); r.style.display="none"; }
      else    { r.style.display="block";       r.classList.add("is-open"); }
    }
  };

  document.addEventListener("DOMContentLoaded", ()=> L(`bereit (${UI_BRIDGE_VER})`));
})();
