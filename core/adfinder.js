/* ============================================================================
 * Datei: core/adfinder.js
 * Projekt: Neue Siedler
 * Version: v1.0.0
 * Zweck: Hybrid-Pathfinding (A* + Heatmap-Bias) – Stub für Tests.
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

const ADFINDER_VERSION="v1.0.0";
function _fakePath(from,to){ return [from,to]; }
class AdFinder{
  static findPath(from,to,opts={}){
    const path=_fakePath(from,to);
    setTimeout(()=>{ window.dispatchEvent(new CustomEvent('cb:path:test:done',{ detail:{ cases:1, avgLen:path.length, blocked:0 } })); },50);
    return path;
  }
}
window.AdFinder = AdFinder;
