/* 
==============================================================================
Datei: ui/ui-build-hook.js
Projekt: Siedler-Mini
Version: v16.6.0
Zweck: Verbindet UI-Elemente (Button/Hotkey) mit UIBuild + setzt Items.
============================================================================== */

// ===== 1) Imports
import UIBuild from './ui-build.js';

// ===== 2) Konstanten
const HOOK_VERSION = "v16.6.0";

// ===== 3) Hilfsfunktionen
function logOK (m){ (window.CBLog?.ok   || console.log)(`[ui-build-hook] ${m}`); }
function logIn (m){ (window.CBLog?.info || console.log)(`[ui-build-hook] ${m}`); }

// ===== 4) Hauptlogik
document.addEventListener("DOMContentLoaded", ()=>{
  // UIBuild ist bereits auto-init (siehe ui-build.js)

  // Items setzen (Quelle: global oder ersetze durch deinen Loader)
  if (Array.isArray(window.__buildItems)) {
    UIBuild.setItems(window.__buildItems);
    logOK(`Items gesetzt (${window.__buildItems.length})`);
  } else {
    logIn("Keine __buildItems gefunden – Dock zeigt Platzhalter/leer.");
  }

  // Button
  const btn = document.getElementById("btn-build");
  if (btn) btn.addEventListener("click", ()=> UIBuild.open("button"));

  // Hotkey „B“
  window.addEventListener("keydown", (ev)=>{
    if (ev.key?.toLowerCase() === "b") UIBuild.open("hotkey");
  });
});
