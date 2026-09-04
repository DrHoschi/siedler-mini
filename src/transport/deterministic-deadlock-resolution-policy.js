function asUnitId(value) {
  const id=String(value ?? '').trim();
  if (!/^unit:\d{8}$/.test(id)) throw new TypeError(`carrierId requires unit stable id: ${value}`);
  return id;
}

function normalizeDeadlock(deadlock) {
  if (!deadlock || deadlock.kind!=='deadlock' || !Array.isArray(deadlock.carrierIds)) {
    throw new TypeError('deadlock must be a CR-16B deadlock result');
  }
  if (deadlock.carrierIds.length<2) throw new TypeError('deadlock requires at least two carriers');
  const carrierIds=deadlock.carrierIds.map(asUnitId);
  if (new Set(carrierIds).size!==carrierIds.length) throw new TypeError('deadlock carrierIds must be unique');
  return carrierIds;
}

export class DeterministicDeadlockResolutionPolicy {
  static decide(deadlock) {
    const carrierIds=normalizeDeadlock(deadlock);
    const sorted=[...carrierIds].sort();
    const yieldingCarrierId=sorted[sorted.length-1];
    return Object.freeze({
      kind:'deadlock-resolution-decision',
      strategy:'HIGHEST_STABLE_ID_YIELDS',
      yieldingCarrierId,
      retainedCarrierIds:Object.freeze(sorted.filter(id=>id!==yieldingCarrierId))
    });
  }
}
