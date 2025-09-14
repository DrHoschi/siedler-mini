/* =============================================================================
Datei: assets/ui/ui-bridge.js
Projekt: Neue Siedler
Version: v17.9.0
Zweck:
  - Brücke zwischen UI-Buttons/Hotkeys und bestehenden UI-Modulen.
  - Nutzt ausschließlich die vorhandenen Module:
      • Build-Dock:   window.UIBuild (assets/ui/ui-build.js)
      • Inspector:    window.Inspector (assets/inspector/*.js)
  - KEIN Fallback-Inspector, KEIN Ersatz-UI — wir benutzen deinen alten Inspector.
Events:
  - Build:     cb:build:open|close (+ Legacy cb:build-open|close) → nur zum Body-Flag
  - Inspector: nutzt NUR die API von window.Inspector; optional werden Signale gefeuert,
               falls eure Implementierung sie ohnehin konsumiert (keine eigene UI).
Hinweise:
  - Script wird per <script defer> eingebunden, kein ES-Module.
  - Robust gegen fehlende DOM-Knoten: Build-Dock-Root wird bei Bedarf angelegt.
============================================================================= */

/* ========================== 1) Utils & Logs ========================== */
const UIBRIDGE_VERSION = "v17.9.0";
function LOK(m){ (window.CBLog?.ok   || console.log)(`[ui-bridge] ${m}`); }
function LIN(m){ (window.CBLog?.info || console.log)(`[ui-bridge] ${m}`); }
function LWR(m){ (window.CBLog?.warn || console.warn)(`[ui-bridge] ${m}`); }
function LER(m){ (window.CBLog?.error|| console.error)(`[ui-bridge] ${m}`); }
function emit(name, detail){ try{ window.dispatchEvent(new CustomEvent(name, { detail: detail||{} })); }catch(_){ } }

/* ====================== 2) Build-Dock Bridging ======================= */
/** Akzeptiert #build-dock ODER #build-panel (Legacy), ergänzt Klasse ui-build-dock. */
function ensureBuildRoot(){
  let el = document.getElementById("build-dock") || document.getElementById("build-panel");
  if (!el){
    el = document.createElement("div");
    el.id = "build-dock";
    el.className = "ui-build-dock";
    el.setAttribute("aria-label","Bau-Menü");
    document.body.appendChild(el);
    LIN("BuildDock: #build-dock automatisch erstellt (fehlte im DOM).");
  } else {
    el.classList.add("ui-build-dock");
  }
  return el;
}
function isOpen(el){ return !!el?.classList.contains("is-open"); }

/* ====================== 3) Inspector Bridging ======================== */
/** Strikt an euren bestehenden Inspector gebunden – KEINE Ersatz-UI. */
function inspHasAPI(){
  return !!(window.Inspector && (
    typeof window.Inspector.toggle === "function" ||
    typeof window.Inspector.open   === "function" ||
    typeof window.Inspector.close  === "function"
  ));
}
function inspToggle(){
  if (!inspHasAPI()){ LER("Inspector-API nicht gefunden (window.Inspector.*). Prüfe Includes in index.html."); return; }
  if (typeof window.Inspector.toggle === "function") return window.Inspector.toggle();

  // Wenn es kein .toggle gibt, simuliere es über open/close plus Status.
  const root = document.getElementById("inspector-root") || document.querySelector(".inspector-root");
  const isShown = !!root && root.classList.contains("is-open");
  if (isShown && typeof window.Inspector.close === "function") return window.Inspector.close();
  if (!isShown && typeof window.Inspector.open === "function")  return window.Inspector.open();

  // Optional: Signale ausgeben (nur, falls eure Implementierung sie ohnehin hört).
  emit("cb:inspector:toggle"); emit("cb:inspector-toggle");
}
function inspOpen(){
  if (!inspHasAPI()){ LER("Inspector-API nicht gefunden."); return; }
  if (typeof window.Inspector.open === "function") return window.Inspector.open();
  // Fallback-Signal (kein UI-Bau!)
  emit("cb:inspector:open"); emit("cb:inspector-open");
}
function inspClose(reason){
  if (!inspHasAPI()){ LER("Inspector-API nicht gefunden."); return; }
  if (typeof window.Inspector.close === "function") return window.Inspector.close(reason);
  emit("cb:inspector:close", {reason}); emit("cb:inspector-close", {reason});
}

/* ========================= 4) Globales API =========================== */
window.GameUI = window.GameUI || {};

/** Build-Dock umschalten (nutzt ausschließlich window.UIBuild). */
window.GameUI.toggleBuild = function(){
  const root = ensureBuildRoot();
  if (!window.UIBuild || typeof window.UIBuild.open !== "function"){
    LER("UIBuild fehlt/noch nicht geladen (assets/ui/ui-build.js).");
    return;
  }
  if (isOpen(root)) window.UIBuild.close("toggle");
  else              window.UIBuild.open("toggle");
};

/** Inspector umschalten – bindet ausschließlich euren alten Inspector an. */
window.GameUI.toggleInspector = function(){ inspToggle(); };

/** (Optional) Direkte Aufrufe – falls ihr sie intern nutzen wollt */
window.GameUI.openInspector  = function(){ inspOpen(); };
window.GameUI.closeInspector = function(r){ inspClose(r||"ui"); };

/* ============================ 5) Boot ================================ */
document.addEventListener("DOMContentLoaded", ()=>{
  ensureBuildRoot();
  LIN(`bereit (${UIBRIDGE_VERSION})`);
});

/* Hotkeys (minimal & kollisionsarm) */
window.addEventListener("keydown", (ev)=>{
  if (!ev.key) return;
  const k = ev.key.toLowerCase();
  if (k === "b") { window.GameUI.toggleBuild(); }     // Build-Dock öffnen/schließen
  if (k === "i") { window.GameUI.toggleInspector(); } // Inspector öffnen/schließen
});

/* Body-Klasse für FAB-Abstand – hört auf beide Event-Varianten aus ui-build.js */
function markOpen(){ document.body.classList.add("has-build-open"); }
function markClose(){ document.body.classList.remove("has-build-open"); }
window.addEventListener("cb:build:open",  markOpen);
window.addEventListener("cb:build:close", markClose);
window.addEventListener("cb:build-open",  markOpen);   // Legacy
window.addEventListener("cb:build-close", markClose);  // Legacy
