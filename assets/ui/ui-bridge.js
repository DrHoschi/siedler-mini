/* 
====================================================================================
Datei: assets/ui/ui-bridge.js
Projekt: Neue Siedler
Version: v17.8.4
Zweck: Brücke zwischen UI-Buttons (FABs) / Hotkeys und den eigentlichen UI-Modulen.
       — Speziell: Kompatibilität für das Bau-Dock (#build-dock ODER #build-panel).
       — Stellt GameUI.toggleBuild() / GameUI.toggleInspector() bereit.
Hinweis: Diese Datei macht KEIN Layout; sie ruft nur die jeweils zuständigen Module auf.
==================================================================================== */

/* =========================================
   1) Konstanten & Utilities
   ========================================= */
const UIBRIDGE_VERSION = "v17.8.4";

function logOK (m){ (window.CBLog?.ok   || console.log)(`[ui-bridge] ${m}`); }
function logIn (m){ (window.CBLog?.info || console.log)(`[ui-bridge] ${m}`); }
function logEr (m){ (window.CBLog?.error|| console.error)(`[ui-bridge] ${m}`); }

/** sucht ein Element per ID; akzeptiert beide Varianten */
function findBuildRoot() {
  let el = document.getElementById("build-dock") || document.getElementById("build-panel");
  if (!el) {
    // Fallback: Dock automatisch anlegen (moderne ID)
    el = document.createElement("div");
    el.id = "build-dock";
    el.className = "ui-build-dock";
    el.setAttribute("aria-label", "Bau-Menü");
    document.body.appendChild(el);
    logIn("Fallback: #build-dock automatisch erstellt (fehlte im DOM).");
  } else {
    // Sicherstellen, dass die Dock-Klasse vorhanden ist (falls altes Markup)
    el.classList.add("ui-build-dock");
  }
  return el;
}

/** prüft, ob das Dock sichtbar ist (klassischer is-open Marker) */
function isBuildOpen(root) {
  return !!root?.classList.contains("is-open");
}

/* =========================================
   2) GameUI Singletons (öffentliche API)
   ========================================= */
window.GameUI = window.GameUI || {};

/** Öffnet/Schließt das Bau-Menü. Benötigt UIBuild (ui-build.js) */
window.GameUI.toggleBuild = function () {
  const root = findBuildRoot();
  if (!window.UIBuild || typeof window.UIBuild.open !== "function") {
    logEr("UIBuild nicht verfügbar – ui-build.js fehlt oder noch nicht geladen.");
    return;
  }
  if (isBuildOpen(root)) {
    window.UIBuild.close("toggle");
  } else {
    // Items werden in ui-build.js beim DOMContentLoaded aus __buildItems / BuildAssets gesetzt.
    window.UIBuild.open("toggle");
  }
};

/** Beispiel: Inspector (nur weiterreichen; dein Inspector-Modul bleibt unverändert) */
window.GameUI.toggleInspector = function () {
  try {
    // Falls du eigene Inspector-APIs hast, rufe sie hier auf (Platzhalter).
    // Alternativ mit Events arbeiten:
    window.dispatchEvent(new CustomEvent("cb:inspector:toggle"));
  } catch (e) {
    logEr("Inspector-Toggle fehlgeschlagen: " + e?.message);
  }
};

/* =========================================
   3) Boot/Initialisierung
   ========================================= */
(function init() {
  // DOM fertig: Root prüfen (erzeugt ggf. #build-dock) – frühzeitig,
  // damit die FABs / Event-Listener eine feste Anlaufstelle haben.
  document.addEventListener("DOMContentLoaded", () => {
    findBuildRoot();
    logIn(`bereit (${UIBRIDGE_VERSION})`);
  });

  // Komfort: Hotkey „b“ öffnet das Bau-Dock (ESC schließt ui-build intern).
  window.addEventListener("keydown", (ev) => {
    if (!ev.key) return;
    if (ev.key.toLowerCase() === "b") {
      window.GameUI.toggleBuild();
    }
  });

  // Body-Klasse für FAB-Abstand pflegen (unterstützt beide Event-Varianten)
  function setOpen(){ document.body.classList.add("has-build-open"); }
  function setClose(){ document.body.classList.remove("has-build-open"); }
  window.addEventListener("cb:build:open",  setOpen);
  window.addEventListener("cb:build:close", setClose);
  window.addEventListener("cb:build-open",  setOpen);   // Legacy
  window.addEventListener("cb:build-close", setClose);  // Legacy
})();
