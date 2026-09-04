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
  return Object.freeze([...carrierIds].sort());
}

function normalizeResolutionDecision(decision, carrierId, deadlockCarrierIds) {
  if (!decision || decision.kind!=='deadlock-resolution-decision' || decision.strategy!=='HIGHEST_STABLE_ID_YIELDS') {
    throw new TypeError('resolutionDecision must be a CR-16C deadlock resolution decision');
  }
  const yieldingCarrierId=asUnitId(decision.yieldingCarrierId);
  if (yieldingCarrierId!==carrierId) throw new TypeError('carrierId must equal CR-16C yieldingCarrierId');
  if (!deadlockCarrierIds.includes(yieldingCarrierId)) throw new TypeError('yielding carrier must belong to triggering deadlock');
  return yieldingCarrierId;
}

export class YieldRecoveryIntentContract {
  static define({carrierId,triggeringDeadlock,resolutionDecision,status='PENDING'}={}) {
    const normalizedCarrierId=asUnitId(carrierId);
    const carrierIds=normalizeDeadlock(triggeringDeadlock);
    normalizeResolutionDecision(resolutionDecision,normalizedCarrierId,carrierIds);
    if(status!=='PENDING') throw new TypeError('CR-17A recovery intent status must be PENDING');

    return Object.freeze({
      kind:'yield-recovery-intent',
      carrierId:normalizedCarrierId,
      triggeringDeadlock:Object.freeze({kind:'deadlock',carrierIds}),
      resolutionStrategy:'HIGHEST_STABLE_ID_YIELDS',
      status:'PENDING'
    });
  }
}
