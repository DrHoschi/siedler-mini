/* ============================================================================
 * Datei: ui/ui-dialog.js
 * Projekt: Neue Siedler
 * Version: v1.0.0
 * Zweck: Dialogsystem – Stub-API.
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

const UIDIALOG_VERSION="v1.0.0";
class UIDialog{
  static open(opts){ CBLog.info("[dialog] open", opts?.type||'info'); window.dispatchEvent(new CustomEvent('cb:dialog:open',{ detail: opts||{} })); }
}
window.UIDialog = UIDialog;
