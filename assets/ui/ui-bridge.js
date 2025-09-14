/* =============================================================================
Datei: assets/ui/ui-bridge.js
Version: v17.9.9
Ziel:
  - Inspector-Button: spricht ALT & NEU an (UIInspector, Inspector, Events).
  - Letzte Stufe: vorhandene Inspector-Root nur sichtbar/unsichtbar schalten.
  - Build-Button: toggelt Dock + Body-Klasse (Offset für FABs).
  - Keine neue UI, kein DOM-Umbau außer optionales #build-dock (Fallback).
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
    // Fallback: Sichtbarkeit direkt toggeln + Events spiegeln
    const visible = root.style.display !== "none";
    root.style.display = visible ? "none" : "block";
    root.classList.toggle("is-open", !visible);
    (!visible ? markOpen : markClose)();
    const ev = !visible ? "cb:build:open" : "cb:build:close";
    window.dispatchEvent(new CustomEvent(ev,{detail:{from:"ui-bridge"}}));
  };

  /* ---------- Inspector ---------- */
  // Sehr breites Selektor-Set, um deinen Bestand sicher zu treffen
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
      document.querySelector('[role="dialog"][data-role="inspector"]') ||
      null
    );
  }

  const TOGGLE_EVENTS = [
    // neu
    "cb:inspector:toggle",
    // legacy
    "cb:inspector-toggle","inspector:toggle","inspector-toggle",
    // kurz (manche Stände)
    "cb:insp:toggle","cb:insp-toggle"
  ];

  function tryAPIs(){
    // 1) ALT: monolithischer Inspector
    if (window.UIInspector){
      if (typeof window.UIInspector.toggle === "function"){ window.UIInspector.toggle(); return true; }
      const r = findInspectorRoot();
      const vis = !!r && (r.classList.contains("is-open") || (r.style.display && r.style.display!=="none"));
      if (vis && typeof window.UIInspector.close === "function"){ window.UIInspector.close("toggle"); return true; }
      if (!vis && typeof window.UIInspector.open  === "function"){ window.UIInspector.open("toggle");  return true; }
    }
    // 2) NEU: gesplitteter Inspector
    if (window.Inspector){
      if (typeof window.Inspector.toggle === "function"){ window.Inspector.toggle(); return true; }
      const r = findInspectorRoot();
      const vis = !!r && (r.classList.contains("is-open") || (r.style.display && r.style.display!=="none"));
      if (vis && typeof window.Inspector.close === "function"){ window.Inspector.close("toggle"); return true; }
      if (!vis && typeof window.Inspector.open  === "function"){ window.Inspector.open("toggle");  return true; }
    }
    return false;
  }

  function fireEvents(){
    TOGGLE_EVENTS.forEach(e => window.dispatchEvent(new CustomEvent(e,{detail:{from:"ui-bridge"}})));
  }

  function toggleRootOnly(){
    const r = findInspectorRoot();
    if (!r) return false;
    const vis = r.classList.contains("is-open") || (r.style.display && r.style.display!=="none");
    if (vis){ r.classList.remove("is-open"); r.style.display = "none"; }
    else    { r.style.display = "block";     r.classList.add("is-open"); }
    return true;
  }

  window.GameUI.toggleInspector = function(){
    if (tryAPIs()) return;
    fireEvents();
    if (toggleRootOnly()) return;
    logE("Inspector nicht erreichbar (keine API/Listener/Root). Prüfe Script-Reihenfolge & Root-Selektoren.");
  };

  document.addEventListener("DOMContentLoaded", ()=> logI("bereit (v17.9.9)"));
})();
