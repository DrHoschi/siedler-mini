import { parseStableId } from '../world/stable-id.js';

function stable(value, kind) {
  if (parseStableId(value)?.kind !== kind) throw new TypeError(`${kind} id required`);
  return value;
}
function integer(value, positive = false) {
  if (!Number.isSafeInteger(value) || value < (positive ? 1 : 0)) throw new TypeError('safe integer simulation milliseconds required');
  return value;
}
function unique(values, key) {
  if (!Array.isArray(values)) throw new TypeError('production timing array required');
  if (new Set(values.map(key)).size !== values.length) throw new Error('duplicate production timing identity');
  return Object.freeze([...values].sort((a, b) => key(a).localeCompare(key(b))));
}

export class ProductionCycleTimeContract {
  static definition({ buildingId, durationMs } = {}) {
    return Object.freeze({ kind: 'production-cycle-time-definition', buildingId: stable(buildingId, 'building'), durationMs: integer(durationMs, true) });
  }
  static progression({ buildingId, cycleId, assignmentId, requiredDurationMs, elapsedMs = 0 } = {}) {
    if (!/^im25-cycle-\d{8,}$/.test(cycleId) || !Number.isSafeInteger(Number(cycleId.slice(11))) || Number(cycleId.slice(11)) < 1) throw new TypeError('IM-25 cycle identity required');
    if (cycleId !== `im25-cycle-${String(Number(cycleId.slice(11))).padStart(8, '0')}`) throw new Error('non-canonical IM-25 cycle identity');
    const required = integer(requiredDurationMs, true), elapsed = integer(elapsedMs);
    if (elapsed > required) throw new Error('production elapsed time exceeds duration');
    return Object.freeze({ kind: 'production-cycle-progression', buildingId: stable(buildingId, 'building'), cycleId,
      assignmentId: stable(assignmentId, 'assignment'), requiredDurationMs: required, elapsedMs: elapsed });
  }
  static advance(value, dtMs) {
    const current = this.progression(value), dt = integer(dtMs);
    // Avoid overflow even when a caller supplies a very large valid step.
    return this.progression({ ...current, elapsedMs: current.elapsedMs + Math.min(dt, current.requiredDurationMs - current.elapsedMs) });
  }
  static ratio(value) { const p = this.progression(value); return p.elapsedMs / p.requiredDurationMs; }
  static definitions(values) { return unique(values.map(value => this.definition(value)), value => value.buildingId); }
  static progressions(values) { return unique(values.map(value => this.progression(value)), value => value.buildingId); }
  static settlementId(value) { return `production-settlement:im22:${value.buildingId}:${value.cycleId}`; }

  static validate({ times, progressions, recipes, buildings, workforceBindings, productionSettlementIds, productionEffectReceipts }) {
    if (!Array.isArray(times) || !Array.isArray(progressions) || times.some(v => v?.kind !== 'production-cycle-time-definition') || progressions.some(v => v?.kind !== 'production-cycle-progression')) throw new Error('invalid production timing section kinds');
    const definitions = this.definitions(times), active = this.progressions(progressions);
    const fences = new Set(productionSettlementIds), receipts = productionEffectReceipts;
    for (const definition of definitions) {
      if (!buildings.has(definition.buildingId) || recipes.filter(r => r.buildingId === definition.buildingId).length !== 1) throw new Error('production time requires one existing building recipe');
    }
    for (const p of active) {
      if (!definitions.some(d => d.buildingId === p.buildingId)) throw new Error('active production duration definition missing');
      if (workforceBindings.filter(b => b.buildingId === p.buildingId && b.assignmentId === p.assignmentId).length !== 1) throw new Error('active production workforce binding missing');
      const settlementId = this.settlementId(p);
      if (fences.has(settlementId) || receipts.some(r => r.settlementId === settlementId)) throw new Error('active production contradicts settlement evidence');
      const prefix = `production-settlement:im22:${p.buildingId}:`;
      const history = receipts.filter(r => r.buildingId === p.buildingId).map(r => {
        if (!fences.has(r.settlementId) || !r.settlementId.startsWith(prefix)) throw new Error('invalid production history evidence');
        const id = r.settlementId.slice(prefix.length);
        if (!/^im25-cycle-\d{8,}$/.test(id)) throw new Error('invalid IM-25 production history');
        return Number(id.slice(11));
      }).sort((a, b) => a - b);
      for (const id of fences) if (id.startsWith(prefix) && !receipts.some(r => r.settlementId === id)) throw new Error('production history fence without receipt');
      if (history.some((n, i) => n !== i + 1) || Number(p.cycleId.slice(11)) !== history.length + 1) throw new Error('active cycle is not frozen IM-25 successor identity');
    }
    return Object.freeze({ definitions, progressions: active });
  }
}
