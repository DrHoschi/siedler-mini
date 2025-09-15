/* =============================================================================
   assets/ui/ui-bridge.js – v18.1.0
   Zweck:
     - Reicht FAB-Clicks an bestehende APIs durch.
     - Überschreibt NICHT die Inspector-Methoden, wenn sie schon da sind.
============================================================================= */

(function(){
  const logI = (m)=> (window.CBLog?.info || console.log)(`[ui-bridge] ${m}`);

  window.GameUI = window.GameUI || {};

  // Build (falls kein UIBuild vorhanden → einfacher Fallback)
  window.GameUI.toggleBuild = function(){
    if (window.UIBuild?.toggle) return window.UIBuild.toggle("button");
    const root = document.getElementById("build-dock") || document.getElementById("build-panel");
    if (!root) return;
    const open = !root.classList.contains("is-open");
    root.classList.toggle("is-open", open);
    root.style.display = open ? "block":"none";
    document.body.classList.toggle("has-build-open", open);
    logI(`Build ${open?"open":"close"} (fallback)`);
  };

  // Inspector – NICHT überschreiben, wenn Compat/Core schon gesetzt hat
  if (typeof window.GameUI.toggleInspector !== "function"){
    window.GameUI.toggleInspector = function(){
      if (window.UIInspector?.toggle) return window.UIInspector.toggle();
      if (window.Inspector?.toggle)  return window.Inspector.toggle();
      // letzter Ausweg: Event feuern – Compat greift das auf DOM-Fallback auf
      try{ window.dispatchEvent(new CustomEvent("cb:inspector:toggle",{detail:{from:"ui-bridge"}})); }catch(_){}
      try{ window.dispatchEvent(new CustomEvent("cb:inspector-toggle",{detail:{from:"ui-bridge"}})); }catch(_){}
      try{ window.dispatchEvent(new CustomEvent("inspector:toggle",{detail:{from:"ui-bridge"}})); }catch(_){}
    };
    logI("toggleInspector bereitgestellt (bridge)");
  } else {
    logI("toggleInspector vorhanden (compat/core) – Bridge überschreibt NICHT");
  }

  document.addEventListener("DOMContentLoaded", ()=> logI("bereit (v18.1.0)"));
})();
