function asUnitId(value) {
  const id = String(value ?? '').trim();
  if (!/^unit:\d{8}$/.test(id)) throw new TypeError(`carrierId requires unit stable id: ${value}`);
  return id;
}

function asWaitingCycles(value) {
  const cycles = Number(value ?? 0);
  if (!Number.isSafeInteger(cycles) || cycles < 0) throw new TypeError(`waitingCycles must be a non-negative safe integer: ${value}`);
  return cycles;
}

function normalizeContenders(value) {
  if (!Array.isArray(value) || value.length === 0) throw new TypeError('contenders must be a non-empty array');
  const contenders = value.map((entry, index) => {
    if (!entry || typeof entry !== 'object') throw new TypeError(`contenders[${index}] must be an object`);
    return Object.freeze({
      carrierId: asUnitId(entry.carrierId),
      waitingCycles: asWaitingCycles(entry.waitingCycles)
    });
  });
  if (new Set(contenders.map(entry => entry.carrierId)).size !== contenders.length) throw new Error('contender carrierIds must be unique');
  return contenders;
}

function comparePriority(a, b) {
  if (a.waitingCycles !== b.waitingCycles) return b.waitingCycles - a.waitingCycles;
  if (a.carrierId < b.carrierId) return -1;
  if (a.carrierId > b.carrierId) return 1;
  return 0;
}

export class DeterministicWaitPriorityPolicy {
  static decide({ contenders } = {}) {
    const ordered = normalizeContenders(contenders).slice().sort(comparePriority);
    const winner = ordered[0];
    return Object.freeze({
      kind: 'wait-priority-decision',
      winnerCarrierId: winner.carrierId,
      winnerWaitingCycles: winner.waitingCycles,
      loserCarrierIds: Object.freeze(ordered.slice(1).map(entry => entry.carrierId)),
      priorityOrder: Object.freeze(ordered.map(entry => Object.freeze({ carrierId:entry.carrierId, waitingCycles:entry.waitingCycles })))
    });
  }
}
