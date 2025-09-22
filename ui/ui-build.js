/* ============================================================================
 * Datei: ui/ui-build.js
 * Projekt: Neue Siedler
 * Version: v1.0.0
 * Zweck: BuildDock – Auswahl & Platziermodus (Stub).
 * Datum: 2025-09-21
 * Struktur: Imports → Konstanten → Hilfsfunktionen → Klassen → Hauptlogik → Exports
 * Hinweis: Debug/Inspector NIE entfernen. Ereignisse nutzen (cb:*).
 * ============================================================================ */

// --- CBLog (Fallback) --------------------------------------------------------
window.CBLog = window.CBLog || {
  ok:   (...a)=>console.log('✅', ...a),
  info: (...a)=>console.log('ℹ️', ...a),
  warn: (...a)=>console.warn('⚠️', ...a),
  error:(...a)=>console.error('❌', ...a),
};

const UIBUILD_VERSION="v1.0.0";
(function initBuildDock(){
  CBLog.ok("[ui-build] Modul geladen ("+UIBUILD_VERSION+")");
  const dock=document.getElementById('build-dock');
  const btnBuild=document.getElementById('btn-build');
  btnBuild?.addEventListener('click',()=>{
    const vis=dock.style.display==='block';
    dock.style.display=vis?'none':'block';
    window.dispatchEvent(new CustomEvent(vis?'cb:build:close':'cb:build:open',{ detail:{ from:'HUD' } }));
    if(!vis) renderCategories();
  });
  function renderCategories(){
    dock.innerHTML="<strong>Bauen:</strong> HQ, Holzfällerhütte, Fischerhütte, Steinbruch (Demo)";
  }
})();
