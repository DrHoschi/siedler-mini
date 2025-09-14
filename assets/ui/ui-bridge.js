/* =============================================================================
Datei: assets/ui/ui-bridge.js
Version: v18.0.0
Zweck:
  - Inspector-Button → euren vorhandenen Inspector (ALT+NEU) + Events + Root-Fallback.
  - Build-Button → UIBuild.open/close/toggle + Body-Klasse für FAB-Offset.
  - Keine neue UI, keine Überschreibungen.
============================================================================= */
(function(){
  const logI = (m)=> (window.CBLog?.info||console.log)(`[ui-bridge] ${m}`);
  const logW = (m)=> (window.CBLog?.warn||console.warn)(`[ui-bridge] ${m}`);
  const logE = (m)=> (window.CBLog?.error||console.error)(`[ui-bridge] ${m}`);

  /* ---------- Build ---------- */
  function ensureBuildRoot(){
    let el = document.getElementById("build-dock") || document.getElementById("build-panel");
    if(!el){
      el = document.createElement("div");
      el.id = "build-dock";
      el.className = "ui-build-dock";
      el.setAttribute("aria-label","Bau-Menü");
      document.body.appendChild(el);
      logW("BuildDock: #build-dock fallback erzeugt (fehlte im DOM).");
    } else {
      el.classList.add("ui-build-dock");
    }
    return el;
  }
  function isOpen(el){ return !!el?.classList.contains("is-open"); }
  function markOpen(){ document.body.classList.add("has-build-open"); }
  function markClose(){ document.body.classList.remove("has-build-open"); }

  window.GameUI = window.GameUI || {};
  window.GameUI.toggleBuild = function(){
    const root = ensureBuildRoot();
    if (window.UIBuild && typeof window.UIBuild.open === "function"){
      isOpen(root) ? window.UIBuild.close("toggle") : window.UIBuild.open("toggle");
      return;
    }
    // Fallback: Sichtbarkeit direkt toggeln + Events spiegeln (neu & legacy)
    const visible = root.style.display !== "none";
    root.style.display = visible ? "none" : "block";
    root.classList.toggle("is-open", !visible);
    (!visible ? markOpen : markClose)();
    ["cb:build:open","cb:build-open","build:open"].forEach(evt=>{
      try{ window.dispatchEvent(new CustomEvent(visible?evt.replace("open","close"):evt,{detail:{from:"ui-bridge"}})); }catch(_){}
    });
  };

  /* ---------- Inspector ---------- */
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
  const TOGGLE_EVENTS = [
    "inspector:toggle",          // alt
    "cb:inspector-toggle",       // legacy
    "cb:inspector:toggle"        // neu
  ];

  function tryInspectorAPIs(){
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

  window.GameUI.toggleInspector = function(){
    if (tryInspectorAPIs()) return;
    // Events für alle Welten feuern
    TOGGLE_EVENTS.forEach(e => { try{ window.dispatchEvent(new CustomEvent(e,{detail:{from:"ui-bridge"}})); }catch(_){ } });
    // letzter sanfter Fallback: Root sichtbar/unsichtbar schalten
    const r = findInspectorRoot();
    if (r){
      const vis = r.classList.contains("is-open") || (r.style.display && r.style.display!=="none");
      if (vis){ r.classList.remove("is-open"); r.style.display="none"; }
      else    { r.style.display="block";       r.classList.add("is-open"); }
      return;
    }
    logE("Inspector nicht erreichbar (keine API/Listener/Root). Prüfe Reihenfolge & Root-Selektor.");
  };

  document.addEventListener("DOMContentLoaded", ()=> logI("bereit (v18.0.0)"));
})();
