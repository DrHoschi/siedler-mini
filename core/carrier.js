/* ============================================================================
 * Datei: core/carrier.js
 * Projekt: Neue Siedler
 * Version: v1.0.0
 * Zweck: Transport-Logik (Push/Pull) – vereinfachte Zuweisung.
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

const CARRIER_VERSION="v1.0.0";
class CarrierAI{ static assignJobs(){ CBLog.info("[carrier] assignJobs – (Stub)"); } }
window.CarrierAI = CarrierAI;
