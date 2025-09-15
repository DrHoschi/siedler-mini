/* =============================================================================
   Datei: assets/ui/ui-bridge.js
   Version: v18.0.2-min
   Zweck:
     - 🛠 Inspector sicher öffnen/schließen: ALT (UIInspector) + NEU (Inspector) + Events + Root-Fallback.
     - 🧱 Build-Button: nur durchreichen (keine Styles/Layouts).
     - Deutliche Logs, damit sofort klar ist, woran es hängt (Reihenfolge/Root/API).
   Standard: Imports → Konstanten → Hilfsfunktionen → Klassen → Hauptlogik → Exports
============================================================================= */

/* -------------------------------- Konstanten -------------------------------- */
const UI_BRIDGE_VER = "v18.0.2-min";
const logI = (m)=> (window.CBLog?.info || console.log)(`[ui-bridge] ${m}`);
const logW = (m)=> (window.CBLog?.warn || console.warn)(`[ui-bridge] ${m}`);
const logE = (m)=> (window.CBLog?.error|| console.error)(`[ui-bridge] ${m}`);

const TOGGLE_EVENTS = [
  "inspector:toggle",        // alt
  "cb:inspector-toggle",     // legacy
  "cb:inspector:toggle"      // neu
];

/* ------------------------------- Hilfsfunktionen ---------------------------- */
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
function fireAllToggleEvents(){
  TOGGLE_EVENTS.forEach(name=>{
    try{ window.dispatchEvent(new CustomEvent(name,{detail:{from:"ui-bridge"}})); }catch(_){}
  });
}

/* --------------------------------- Hauptlogik ------------------------------- */
(function initBridge(){
  window.GameUI = window.GameUI || {};

  // 🧱 Build (nur durchreichen; falls keine API, ganz simpler Toggle)
  window.GameUI.toggleBuild = function(){
    if (window.UIBuild?.toggle) return window.UIBuild.toggle("button");
    const root = document.getElementById("build-dock") || document.getElementById("build-panel");
    if (!root){ logW("Build-Root fehlt (#build-dock/#build-panel)."); return; }
    const open = !root.classList.contains("is-open");
    root.classList.toggle("is-open", open);
    root.style.display = open ? "block" : "none";
    document.body.classList.toggle("has-build-open", open);
    logI(`Build ${open?"open":"close"} (fallback)`);
  };

  // 🛠 Inspector – Reihenfolge: ALT → NEU → Events → Root-Fallback
  window.GameUI.toggleInspector = function(){
    // 1) ALT (monolithisch)
    if (window.UIInspector){
      if (typeof window.UIInspector.toggle === "function"){ logI("Inspector via UIInspector.toggle()"); return window.UIInspector.toggle(); }
      const r = findInspectorRoot();
      const vis = !!r && (r.classList.contains("is-open") || (r.style.display && r.style.display!=="none"));
      if (vis && typeof window.UIInspector.close === "function"){ logI("Inspector via UIInspector.close()"); return window.UIInspector.close("toggle"); }
      if (!vis && typeof window.UIInspector.open  === "function"){ logI("Inspector via UIInspector.open()");  return window.UIInspector.open("toggle");  }
    }

    // 2) NEU (gesplittet)
    if (window.Inspector){
      if (typeof window.Inspector.toggle === "function"){ logI("Inspector via Inspector.toggle()"); return window.Inspector.toggle(); }
      const r = findInspectorRoot();
      const vis = !!r && (r.classList.contains("is-open") || (r.style.display && r.style.display!=="none"));
      if (vis && typeof window.Inspector.close === "function"){ logI("Inspector via Inspector.close()"); return window.Inspector.close("toggle"); }
      if (!vis && typeof window.Inspector.open  === "function"){ logI("Inspector via Inspector.open()");  return window.Inspector.open("toggle");  }
    }

    // 3) Events (alle Namensräume)
    logW("Inspector-API fehlt – sende Toggle-Events (alt/legacy/neu) …");
    fireAllToggleEvents();

    // 4) Root-Fallback (sichtbar/unsichtbar)
    const r = findInspectorRoot();
    if (r){
      const vis = r.classList.contains("is-open") || (r.style.display && r.style.display!=="none");
      if (vis){ r.classList.remove("is-open"); r.style.display="none";  logI("Inspector Root → close (fallback)"); }
      else    { r.classList.add("is-open");   r.style.display="block"; logI("Inspector Root → open (fallback)"); }
      return;
    }

    logE("Inspector nicht erreichbar: keine API, keine Listener, kein Root. Prüfe Script-Reihenfolge der Inspector-Module.");
  };

  document.addEventListener("DOMContentLoaded", ()=> logI(`bereit (${UI_BRIDGE_VER})`));
})();
