/* ============================================================================
 * Datei: core/path-overlay.js
 * Projekt: Neue Siedler
 * Version: v1.0.0
 * Zweck: Debug-Overlay: Pfade/Heatmap/Kollision – UI-gesteuert.
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

const PATH_OVERLAY_VERSION="v1.0.0";
class PathOverlay{
  static toggle(on=true){ CBLog.info("[path-overlay] toggle", on); }
  static setHeatmap(on=true){ CBLog.info("[path-overlay] heatmap", on); }
}
window.PathOverlay = PathOverlay;
