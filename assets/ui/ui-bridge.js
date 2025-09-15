/* =============================================================================
   Datei: assets/ui/ui-bridge.js
   Version: v18.0.3
   Zweck:
     - 🛠 Inspector sicher öffnen: ALT (UIInspector) → NEU (Inspector) → Events → Root-Fallback
     - 🧱 Build-Button unverändert: ruft UIBuild.toggle() auf; Fallback toggelt Sichtbarkeit
     - Ausführliche Logs, damit du SOFORT siehst, welcher Pfad greift
============================================================================= */

/* -------------------------------- Konstanten -------------------------------- */
const UI_BRIDGE_VER = "v18.0.3";
const L = (lvl,msg)=> (window.CBLog?.[lvl]||console[lvl]||console.log)(`[ui-bridge] ${msg}`);

const EV_TOGGLE = [
  "inspector:toggle",      // alt
  "cb:inspector-toggle",   // legacy
  "cb:inspector:toggle"    // neu
];

/* ------------------------------- Hilfsfunktionen ---------------------------- */
function fireToggleEvents(from="ui-bridge"){
  EV_TOGGLE.forEach(n=>{
    try{ window.dispatchEvent(new CustomEvent(n,{detail:{from}})); }catch(_){}
  });
  L("info", `Toggle-Events gefeuert (${EV_TOGGLE.join(", ")})`);
}

function findInspectorRoot(){
  // deckt sehr viele Stände ab
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

function rootToggleFallback(){
  const r = findInspectorRoot();
  if (!r){ L("error","Kein Inspector-Root im DOM gefunden (Fallback konnte nicht greifen)."); return false; }
  const vis = r.classList.contains("is-open") || (r.style.display && r.style.display!=="none");
  if (vis){ r.classList.remove("is-open"); r.style.display="none";  L("info","Inspector Root → close (Fallback)"); }
  else    { r.classList.add("is-open");   r.style.display="block"; L("info","Inspector Root → open (Fallback)"); }
  return true;
}

/* --------------------------------- Hauptlogik ------------------------------- */
(function init(){
  window.GameUI = window.GameUI || {};

  // 🧱 Build-Toggle (unverändert, minimal)
  window.GameUI.toggleBuild = function(){
    if (window.UIBuild?.toggle){ L("info","Build via UIBuild.toggle()"); return window.UIBuild.toggle("button"); }
    const root = document.getElementById("build-dock") || document.getElementById("build-panel");
    if (!root){ L("warn","Build-Root (#build-dock/#build-panel) fehlt."); return; }
    const open = !root.classList.contains("is-open");
    root.classList.toggle("is-open", open);
    root.style.display = open ? "block" : "none";
    document.body.classList.toggle("has-build-open", open);
    L("info",`Build ${open?"open":"close"} (Fallback)`);
  };

  // 🛠 Inspector-Toggle (ALT → NEU → Events → Fallback)
  window.GameUI.toggleInspector = function(){
    // ALT (monolithisch)
    if (window.UIInspector){
      if (typeof window.UIInspector.toggle === "function"){ L("info","Inspector via UIInspector.toggle()"); return window.UIInspector.toggle(); }
      const r = findInspectorRoot();
      const vis = !!r && (r.classList.contains("is-open") || (r.style.display && r.style.display!=="none"));
      if (vis && typeof window.UIInspector.close === "function"){ L("info","Inspector via UIInspector.close()"); return window.UIInspector.close("toggle"); }
      if (!vis && typeof window.UIInspector.open  === "function"){ L("info","Inspector via UIInspector.open()");  return window.UIInspector.open("toggle");  }
      L("warn","UIInspector vorhanden, aber keine toggle/open/close nutzbar – versuche Events …");
    }

    // NEU (gesplittet)
    if (window.Inspector){
      if (typeof window.Inspector.toggle === "function"){ L("info","Inspector via Inspector.toggle()"); return window.Inspector.toggle(); }
      const r = findInspectorRoot();
      const vis = !!r && (r.classList.contains("is-open") || (r.style.display && r.style.display!=="none"));
      if (vis && typeof window.Inspector.close === "function"){ L("info","Inspector via Inspector.close()"); return window.Inspector.close("toggle"); }
      if (!vis && typeof window.Inspector.open  === "function"){ L("info","Inspector via Inspector.open()");  return window.Inspector.open("toggle");  }
      L("warn","Inspector vorhanden, aber keine toggle/open/close nutzbar – versuche Events …");
    }

    // Events feuern
    fireToggleEvents();

    // Letzter Fallback: Root direkt toggeln
    if (rootToggleFallback()) return;

    L("error","Inspector nicht erreichbar. Prüfe Script-Reihenfolge der Inspector-Module oder benenne mir den Root-Selektor.");
  };

  document.addEventListener("DOMContentLoaded", ()=> L("info",`bereit (${UI_BRIDGE_VER})`));
})();
