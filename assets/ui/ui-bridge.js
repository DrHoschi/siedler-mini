/* =============================================================================
Datei: assets/ui/ui-bridge.js
Version: v17.9.7
Ziel:
  - Inspector-Button: ruft deinen gesplitteten Inspector an (keine neue UI).
  - Build-Button: toggelt Dock; hält FAB-Offset aktuell.
  - Keine DOM-Neubauten außer optionales #build-dock (Fallback).
============================================================================= */
(function(){
  const logI = (m)=> (window.CBLog?.info||console.log)(`[ui-bridge] ${m}`);
  const logW = (m)=> (window.CBLog?.warn||console.warn)(`[ui-bridge] ${m}`);

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
    // Fallback: Sichtbarkeit direkt toggeln, Events spiegeln
    const visible = root.style.display !== "none";
    root.style.display = visible ? "none" : "block";
    root.classList.toggle("is-open", !visible);
    (!visible ? markOpen : markClose)();
    const ev = !visible ? "cb:build:open" : "cb:build:close";
    window.dispatchEvent(new CustomEvent(ev,{detail:{from:"bridge"}}));
  };

  /* ---------- Inspector ---------- */
  // Root nur abfragen (nichts neu bauen)
  function findInspectorRoot(){
    return (
      document.getElementById("inspector-root") ||
      document.querySelector(".inspector-root") ||
      document.getElementById("inspectorOverlay") ||
      document.getElementById("inspector") ||
      document.querySelector("#overlay-inspector") ||
      document.querySelector("[data-inspector-root]") || null
    );
  }
  const TOGGLE_EVENTS = [
    "cb:inspector:toggle","cb:inspector-toggle",
    "inspector:toggle","inspector-toggle",
    "cb:insp:toggle","cb:insp-toggle"
  ];

  window.GameUI.toggleInspector = function(){
    // 1) Bevorzugt echte API aus deinen Split-Modulen
    if (window.Inspector && typeof window.Inspector.toggle === "function"){
      return window.Inspector.toggle();
    }
    if (window.Inspector && (typeof window.Inspector.open === "function" || typeof window.Inspector.close === "function")){
      const r = findInspectorRoot();
      const vis = !!r && (r.classList.contains("is-open") || (r.style.display && r.style.display!=="none"));
      if (vis && typeof window.Inspector.close === "function") return window.Inspector.close("toggle");
      if (!vis && typeof window.Inspector.open  === "function") return window.Inspector.open("toggle");
    }
    // 2) Wenn API fehlt: Events für beide Welten schicken
    TOGGLE_EVENTS.forEach(e => window.dispatchEvent(new CustomEvent(e,{detail:{from:"ui-bridge"}})));
    logW("Inspector-API nicht gefunden – Toggle-Events gesendet.");
  };

  document.addEventListener("DOMContentLoaded", ()=> logI("bereit (v17.9.7)"));
})();
