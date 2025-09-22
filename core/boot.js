/* ============================================================================
 * Datei: core/boot.js
 * Projekt: Neue Siedler
 * Version: v1.0.0
 * Zweck: Bootstrap & Lifecycle – steuert Preload, Registry & Game-Start.
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

const BOOT_VERSION="v1.0.0";
(function initBoot(){
  CBLog.ok("[boot] Modul geladen ("+BOOT_VERSION+")");
  window.addEventListener('cb:ui-ready', async ()=>{ CBLog.info("[boot] UI bereit → Assets laden"); await Asset.loadAll(); });
  window.addEventListener('cb:assets-ready', async ()=>{ CBLog.info("[boot] Assets ok → Registry initialisieren"); await Registry.initFromData(); });
  window.addEventListener('cb:registry:ready', ()=>{ CBLog.info("[boot] Registry ok → Game init/start"); Game.init(); Game.start("map_ch1"); });
})();
window.__cb = Object.assign(window.__cb||{}, { bootVersion: BOOT_VERSION });
