/* ============================================================================
 * Datei   : core/carrier.runtime.js
 * Projekt : Neue Siedler – Epoche 1
 * Version : v26.08.31-carrier-runtime-v3
 *
 * Zweck:
 *   Runtime-Schicht zwischen JobEngine und GameUnits.
 *   Baustellenjobs behalten Prioritaet; freie Traeger duerfen aber mehrere
 *   Produktions-Abholjobs parallel uebernehmen.
 * ========================================================================== */
(function () {
  'use strict';

  const TAG = '[carrier.runtime]';
  const VER = 'v26.08.31-carrier-runtime-v3';
  const EMIT_UNIT_STEP = (typeof globalThis.EMIT_UNIT_STEP === 'boolean')
    ? globalThis.EMIT_UNIT_STEP
    : false;
  globalThis.EMIT_UNIT_STEP = EMIT_UNIT_STEP;

  const LOG  = (...a) => (window.CBLog?.ok   ?? console.log)(TAG, ...a);
  const INFO = (...a) => (window.CBLog?.info ?? console.log)(TAG, ...a);
  const WARN = (...a) => (window.CBLog?.warn ?? console.warn)(TAG, ...a);

  // JobEngine.pop() priorisiert bereits alle Nicht-carry Jobs. Daher muessen wir
  // Produktionsabholungen nicht auf genau einen Carrier kuenstlich drosseln.
  // Vier parallele carry-Jobs sind fuer den aktuellen Start-Carriersatz genug,
  // ohne bei grossen Produktionslagern sofort alle Carrier zu binden.
  const MAX_CARRY_ACTIVE = 4;
  const MAX_ASSIGN_PER_TICK = 8;

  let enabled = false;
  const _lastTileByUnitId = new Map();

  function _isFiniteNumber(n) {
    return typeof n === 'number' && Number.isFinite(n);
  }

  function _toTile(n) {
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
      const id = u?.id ?? u?.uid ?? u?.carrierId ?? u?.i;
      if (id == null) continue;

      const rawTx = _isFiniteNumber(u.tx) ? u.tx : u.x;
      const rawTy = _isFiniteNumber(u.ty) ? u.ty : u.y;
      if (!_isFiniteNumber(rawTx) || !_isFiniteNumber(rawTy)) continue;

      const tx = _toTile(rawTx);
      const ty = _toTile(rawTy);
      const key = String(id);
      const last = _lastTileByUnitId.get(key);
      if (last && last.tx === tx && last.ty === ty) continue;

      _lastTileByUnitId.set(key, { tx, ty });

      if (EMIT_UNIT_STEP) {
        window.dispatchEvent(new CustomEvent('cb:unit:step', {
          detail: {
            id,
            tx, ty,
            x: u.x, y: u.y,
            type: u.type || 'carrier',
            role: u.role || 'worker'
          }
        }));
      }
    }
  }

  function _activeCarryCount(GU){
    try {
      const units=(typeof GU.getUnits==='function') ? GU.getUnits() : (GU.list || []);
      return (units || []).filter(u=>
        u && u.type==='carrier' && u.task && u.task.job?.type==='carry'
      ).length;
    } catch(_e){
      return 0;
    }
  }

  function _takeJobsAndAssign() {
    const GU = window.GameUnits;
    const JE = window.JobEngine;
    if (!GU?.needsJob || !GU?.assignJob || !JE?.pop) return;

    let assigned = 0;

    while (assigned < MAX_ASSIGN_PER_TICK && GU.needsJob()) {
      const job = JE.pop();
      if (!job) break;

      if (job?.type === 'carry' && _activeCarryCount(GU) >= MAX_CARRY_ACTIVE) {
        if (typeof JE.add === 'function') JE.add(job);
        break;
      }

      try {
        const ok=GU.assignJob(job);
        if(ok===false){
          // Kein freier Carrier trotz needsJob-Rennen: Job erhalten.
          if(typeof JE.add==='function') JE.add(job);
          break;
        }
        LOG('Job → Carrier:', job);
        assigned++;
      } catch (e) {
        WARN('assignJob Fehler – Job wird zurueckgestellt:', job, e);
        if(typeof JE.add==='function') JE.add(job);
        break;
      }
    }
  }

  function tick(dt) {
    if (!enabled) return;
    try {
      _takeJobsAndAssign();
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

  window.addEventListener('cb:game:start', () => start());

  window.CarrierRuntime = {
    start,
    stop,
    tick,
    isRunning: () => enabled,
    _lastTileByUnitId,
    limits:{maxCarryActive:MAX_CARRY_ACTIVE,maxAssignPerTick:MAX_ASSIGN_PER_TICK}
  };

  INFO('bereit', VER);
})();
