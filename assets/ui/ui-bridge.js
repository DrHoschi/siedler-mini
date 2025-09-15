/* =============================================================================
   ui-bridge.js  – Inspector & Build Schaltzentrale
   - Inspector: ALT (UIInspector) + NEU (Inspector) + Events + Root-Fallback
   - Build:     UIBuild.open/close/toggle oder Sichtbarkeit + Body-Class
============================================================================= */

/* Imports */
// none

/* Konstanten */
const UI_BRIDGE_VER = "v18.0.1";
const _logI = (m)=> (window.CBLog?.info||console.log)(`[ui-bridge] ${m}`);
const _logE = (m)=> (window.CBLog?.error||console.error)(`[ui-bridge] ${m}`);
const TOGGLE_EVENTS = ["inspector:toggle","cb:inspector-toggle","cb:inspector:toggle"];

/* Hilfsfunktionen */
function ensureBuildRoot(){
  let el = document.getElementById("build-dock") || document.getElementById("build-panel");
  if (!el){
    el = document.createElement("div");
    el.id = "build-dock";
    el.className = "ui-build-dock";
    el.setAttribute("aria-label","Bau-Menü");
    document.body.appendChild(el);
  } else {
    el.classList.add("ui-build-dock");
  }
  return el;
}
function isOpen(el){ return !!el && el.classList.contains("is-open"); }

function findInspectorRoot(){
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

/* Hauptlogik */
(function initBridge(){
  window.GameUI = window.GameUI || {};

  // Build
  function markOpen(){ document.body.classList.add("has-build-open"); }
  function markClose(){ document.body.classList.remove("has-build-open"); }

  GameUI.toggleBuild = function(){
    const root = ensureBuildRoot();

    if (window.UIBuild && typeof window.UIBuild.open === "function"){
      isOpen(root) ? window.UIBuild.close("toggle") : window.UIBuild.open("toggle");
      return;
    }

    // Fallback: Sichtbarkeit + Events
    const visible = root.style.display !== "none";
    root.style.display = visible ? "none" : "block";
    root.classList.toggle("is-open", !visible);
    (!visible ? markOpen : markClose)();

    const ev = !visible ? "cb:build:open" : "cb:build:close";
    try{ window.dispatchEvent(new CustomEvent(ev,{detail:{from:"ui-bridge"}})); }catch(_){}
    try{ window.dispatchEvent(new CustomEvent(ev.replace("cb:build:","cb:build-"),{detail:{from:"ui-bridge"}})); }catch(_){}
  };

  // Inspector
  function tryAPIs(){
    // ALT (monolithisch)
    if (window.UIInspector){
      if (typeof window.UIInspector.toggle === "function"){ window.UIInspector.toggle(); return true; }
      const r = findInspectorRoot();
      const vis = !!r && (r.classList.contains("is-open") || (r.style.display && r.style.display!=="none"));
      if (vis && typeof window.UIInspector.close === "function"){ window.UIInspector.close("toggle"); return true; }
      if (!vis && typeof window.UIInspector.open  === "function"){ window.UIInspector.open("toggle");  return true; }
    }
    // NEU (gesplittet)
    if (window.Inspector){
      if (typeof window.Inspector.toggle === "function"){ window.Inspector.toggle(); return true; }
      const r = findInspectorRoot();
      const vis = !!r && (r.classList.contains("is-open") || (r.style.display && r.style.display!=="none"));
      if (vis && typeof window.Inspector.close === "function"){ window.Inspector.close("toggle"); return true; }
      if (!vis && typeof window.Inspector.open  === "function"){ window.Inspector.open("toggle");  return true; }
    }
    return false;
  }

  GameUI.toggleInspector = function(){
    if (tryAPIs()) return;

    // Events (alt + legacy + neu)
    TOGGLE_EVENTS.forEach(e => { try{ window.dispatchEvent(new CustomEvent(e,{detail:{from:"ui-bridge"}})); }catch(_){} });

    // Letzter sanfter Fallback: Root sichtbar/unsichtbar schalten
    const r = findInspectorRoot();
    if (r){
      const vis = r.classList.contains("is-open") || (r.style.display && r.style.display!=="none");
      if (vis){ r.classList.remove("is-open"); r.style.display="none"; }
      else    { r.classList.add("is-open");   r.style.display="block"; }
      return;
    }
    _logE("Inspector nicht erreichbar (keine API/Listener/Root). Reihenfolge/Selektor prüfen.");
  };

  document.addEventListener("DOMContentLoaded", ()=> _logI(`bereit (${UI_BRIDGE_VER})`));
})();
