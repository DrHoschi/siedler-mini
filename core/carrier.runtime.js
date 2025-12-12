/* ============================================================================
 * Datei   : core/carrier.runtime.js
 * Projekt : Neue Siedler – Epoche 1
 * Version : v25.12.12-carrier-runtime-v2 (tick-driven, no-RAF)
 *
 * Zweck   :
 *   "Runtime"-Schicht zwischen JobEngine und GameUnits.
 *   - Holt Jobs aus JobEngine
 *   - Weist Jobs freien Carriern in GameUnits zu
 *   - Emitiert cb:unit:step bei Tile-Wechsel (für PathOverlay / Traces / Debug)
 *
 * WICHTIG:
 *   - Diese Datei bewegt NICHT die Units selbst.
 *   - Bewegung/Animation bleibt in GameUnits.tick(dt).
 *   - carrier.runtime.js ist nur "Dispatcher/Orchestrator".
 *
 * Erwartete Globals (bestehender Projekt-Stand):
 *   window.JobEngine.pop()            -> Job | null
 *   window.GameUnits.needsJob()       -> boolean
 *   window.GameUnits.assignJob(job)   -> void
 *   window.GameUnits.getUnits()       -> Unit[]
 *
 * Events:
 *   - Lauscht : cb:game:start
 *   - Sendet  : cb:unit:step { id, tx, ty, x, y, type, role }
 *
 * Struktur : Imports → Konstanten → Hilfsfunktionen → Klassen → Hauptlogik → Exports
 * ============================================================================ */
(function () {
  'use strict';

  /* =========================
   * Konstanten / Logging
   * ========================= */
  const TAG = '[carrier.runtime]';
  const VER = 'v25.12.12-carrier-runtime-v2';

  // Sanftes Logging (passt zu deinem Projekt: CBLog wenn vorhanden, sonst console)
  const LOG  = (...a) => (window.CBLog?.ok   ?? console.log)(TAG, ...a);
  const INFO = (...a) => (window.CBLog?.info ?? console.log)(TAG, ...a);
  const WARN = (...a) => (window.CBLog?.warn ?? console.warn)(TAG, ...a);

  // Pro tick maximal so viele Job-Zuweisungen (verhindert "Job-Sturm" bei großen Queues)
  const MAX_ASSIGN_PER_TICK = 8;

  /* =========================
   * Interner State
   * ========================= */
  let enabled = false;

  // Für cb:unit:step (Tile-Wechsel) merken wir uns die letzte Tile-Position je Unit
  const _lastTileByUnitId = new Map();

  /* =========================
   * Hilfsfunktionen
   * ========================= */

  function _isFiniteNumber(n) {
    return typeof n === 'number' && Number.isFinite(n);
  }

  // Wir normalisieren Tile-Koordinaten robust (falls Units float x/y nutzen)
  function _toTile(n) {
    // "klassisch" im Projekt: Tiles sind integer; wir runden auf nearest-int
    // (damit bei float-Positionen nicht dauernd step-events flackern)
    return Math.round(n);
  }

  function _safeGetUnits() {
    try {
      return window.GameUnits?.getUnits?.() || [];
    } catch (e) {
      WARN('GameUnits.getUnits() Fehler:', e);
      return [];
    }
  }

  function _emitUnitStepIfChanged() {
    const units = _safeGetUnits();
    if (!units || !units.length) return;

    for (const u of units) {
      // Wir tracken primär Carrier/Worker; falls du später filterst: hier ist der zentrale Punkt.
      // Aktuell lassen wir ALLE Units step-events emitieren -> gut für Debug/Trampelpfade.
      const id = u?.id ?? u?.uid ?? u?.carrierId ?? u?.i;
      if (id == null) continue;

      // bevorzugt tx/ty (tile coords), fallback x/y
      const rawTx = _isFiniteNumber(u.tx) ? u.tx : u.x;
      const rawTy = _isFiniteNumber(u.ty) ? u.ty : u.y;
      if (!_isFiniteNumber(rawTx) || !_isFiniteNumber(rawTy)) continue;

      const tx = _toTile(rawTx);
      const ty = _toTile(rawTy);

      const key = String(id);
      const last = _lastTileByUnitId.get(key);
      if (last && last.tx === tx && last.ty === ty) continue; // nichts geändert

      _lastTileByUnitId.set(key, { tx, ty });

      // Event für PathOverlay/Traces/Debug
      window.dispatchEvent(new CustomEvent('cb:unit:step', {
        detail: {
          id: id,
          tx, ty,
          x: u.x, y: u.y,          // world/tile float falls vorhanden
          type: u.type || 'carrier',
          role: u.role || 'worker'
        }
      }));
    }
  }

  function _takeJobsAndAssign() {
    const GU = window.GameUnits;
    const JE = window.JobEngine;

    if (!GU?.needsJob || !GU?.assignJob) return;
    if (!JE?.pop) return;

    let assigned = 0;

    // Solange es freie Carrier gibt UND Jobs vorhanden sind → zuweisen
    while (assigned < MAX_ASSIGN_PER_TICK && GU.needsJob()) {
      const job = JE.pop();
      if (!job) break;

      try {
        GU.assignJob(job);
        LOG('Job → Carrier:', job);
        assigned++;
      } catch (e) {
        // Wenn assignJob fehlschlägt, ist es besser NICHT automatisch requeue zu machen,
        // sonst kann man sich Endlos-Loops bauen.
        WARN('assignJob Fehler – Job verworfen:', job, e);
        break;
      }
    }
  }

  /* =========================
   * Hauptlogik
   * ========================= */

  /**
   * tick(dt)
   * Wird idealerweise von deinem zentralen Ticker aufgerufen (game.tick.js / game.js).
   * dt ist optional – wir brauchen es hier nicht zwingend, aber behalten es für spätere Erweiterungen.
   */
  function tick(dt) {
    if (!enabled) return;

    try {
      // 1) Jobs -> Carrier
      _takeJobsAndAssign();

      // 2) Step-Events (Trampelpfade / Debug)
      _emitUnitStepIfChanged();

    } catch (e) {
      WARN('tick()', e);
    }
  }

  function start() {
    if (enabled) return;
    enabled = true;
    LOG('gestartet', VER);
  }

  function stop() {
    if (!enabled) return;
    enabled = false;
    LOG('gestoppt');
  }

  /* =========================
   * Event Hooks
   * ========================= */

  // Standard: nach cb:game:start aktivieren
  window.addEventListener('cb:game:start', () => {
    start();
  });

  /* =========================
   * Exports (global)
   * ========================= */
  window.CarrierRuntime = {
    start,
    stop,
    tick,
    isRunning: () => enabled,

    // Debug: letzter Tile-Stand (hilft bei "springt komisch" / falscher Layer / etc.)
    _lastTileByUnitId
  };

  INFO('bereit', VER);
})();
