/* =============================================================================
Datei: assets/ui/ui-bridge.js
Version: v17.9.6
Ziel: Nur verbinden – NICHTS am Inspector anfassen/ersetzen.
      1) window.Inspector.toggle() (Split-Inspector)
      2) sonst open/close anhand Root-Sichtbarkeit
      3) Events feuern (neu+legacy)
      4) keinerlei eigene UI
============================================================================= */

(function(){
  const logI = (m)=> (window.CBLog?.info||console.log)(`[ui-bridge] ${m}`);
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
      logI("BuildDock: #build-dock erzeugt (fallback).");
    }else{
      el.classList.add("ui-build-dock");
    }
    return el;
  }
  function isOpen(el){ return !!el?.classList.contains("is-open"); }

  /* ---------- Inspector Root (nur abfragen) ---------- */
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
    "cb:inspector:toggle","cb:inspector-toggle",
    "inspector:toggle","inspector-toggle",
    "cb:insp:toggle","cb:insp-toggle"
  ];
  function emit(name, detail){ try{ window.dispatchEvent(new CustomEvent(name,{detail:detail||{}})); }catch(_){} }

  /* ---------- API ---------- */
  window.GameUI = window.GameUI || {};

  // Build-Dock
  window.GameUI.toggleBuild = function(){
    const root = ensureBuildRoot();
    if(!window.UIBuild || typeof window.UIBuild.open!=="function"){
      // Sichtbarkeit notfalls direkt toggeln, falls ui-build.js (noch) nicht initialisiert ist
      const v = root.style.display !== "none";
      root.style.display = v ? "none" : "block";
      root.classList.toggle("is-open", !v);
      document.body.classList.toggle("has-build-open", !v);
      logI("UIBuild fehlt – Sichtbarkeit direkt getoggelt.");
      return;
    }
    isOpen(root) ? window.UIBuild.close("toggle") : window.UIBuild.open("toggle");
  };

  // Inspector – nur verbinden
  window.GameUI.toggleInspector = function(){
    // 1) echte API (Split)
    if (window.Inspector && typeof window.Inspector.toggle === "function"){
      return window.Inspector.toggle();
    }
    if (window.Inspector && (typeof window.Inspector.open === "function" || typeof window.Inspector.close === "function")){
      const r = findInspectorRoot();
      const vis = !!r && (r.classList.contains("is-open") || (r.style.display && r.style.display!=="none"));
      if (vis && typeof window.Inspector.close === "function") return window.Inspector.close("toggle");
      if (!vis && typeof window.Inspector.open  === "function") return window.Inspector.open("toggle");
    }
    // 2) Events feuern – neu + legacy
    TOGGLE_EVENTS.forEach(evt => emit(evt, { from:"bridge" }));
    // keine eigene UI bauen!
    logE("Inspector-API/Listener nicht gefunden – Events gesendet.");
  };

  document.addEventListener("DOMContentLoaded", ()=> logI("bereit (v17.9.6)"));
})();
