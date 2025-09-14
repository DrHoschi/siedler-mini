/* =============================================================================
   Datei: assets/ui/ui-bridge.js
   Zweck: Nur Verbindung von FAB-Buttons → BuildDock / Inspector
============================================================================= */

(function(){
  const log = (m)=>console.log("[ui-bridge]", m);

  function findBuildRoot(){
    return document.getElementById("build-dock") || document.getElementById("build-panel");
  }

  // Build-Dock
  window.GameUI = window.GameUI || {};
  window.GameUI.toggleBuild = function(){
    const root = findBuildRoot();
    if(!root){ log("Build-Root fehlt"); return; }
    if(root.classList.contains("is-open")){
      root.classList.remove("is-open"); root.style.display="none";
      document.body.classList.remove("has-build-open");
    }else{
      root.classList.add("is-open"); root.style.display="block";
      document.body.classList.add("has-build-open");
    }
  };

  // Inspector
  window.GameUI.toggleInspector = function(){
    if(window.UIInspector && typeof UIInspector.toggle==="function"){
      UIInspector.toggle();
      return;
    }
    if(window.Inspector && typeof Inspector.toggle==="function"){
      Inspector.toggle();
      return;
    }
    log("Inspector-API nicht gefunden");
  };

  log("bereit");
})();
