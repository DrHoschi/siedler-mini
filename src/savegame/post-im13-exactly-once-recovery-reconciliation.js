import { SettlementEffectReceiptContract } from './settlement-effect-receipt-contract.js';

const DECISION = Object.freeze({
  SETTLE_AND_COMPLETE: 'SETTLE_AND_COMPLETE',
  COMPLETE_ONLY: 'COMPLETE_ONLY',
  ALREADY_COMPLETE_NOOP: 'ALREADY_COMPLETE_NOOP',
  REJECTED_FAIL_CLOSED: 'REJECTED_FAIL_CLOSED'
});

function frozen(value) { return Object.freeze(value); }
function reject(reason, details = null) { return frozen({ decision: DECISION.REJECTED_FAIL_CLOSED, reason, details }); }
function status(value) { return String(value ?? '').trim().toUpperCase(); }

function validateReceiptFenceConsistency({ productionReceipts = [], goldReceipts = [], productionSettlementIds = [], goldSettlementIds = [] } = {}) {
  let production;
  let gold;
  try {
    production = SettlementEffectReceiptContract.productionList(productionReceipts);
    gold = SettlementEffectReceiptContract.goldList(goldReceipts);
  } catch (error) {
    return reject('INVALID_EFFECT_RECEIPT', String(error.message));
  }
  const productionFences = new Set(productionSettlementIds);
  const goldFences = new Set(goldSettlementIds);
  const productionReceiptIds = new Set(production.map(value => value.settlementId));
  const goldReceiptIds = new Set(gold.map(value => value.settlementId));
  if (productionFences.size !== productionSettlementIds.length || goldFences.size !== goldSettlementIds.length) return reject('DUPLICATE_SETTLEMENT_FENCE');
  for (const id of productionFences) if (!productionReceiptIds.has(id)) return reject('PRODUCTION_FENCE_WITHOUT_RECEIPT', id);
  for (const id of productionReceiptIds) if (!productionFences.has(id)) return reject('PRODUCTION_RECEIPT_WITHOUT_FENCE', id);
  for (const id of goldFences) if (!goldReceiptIds.has(id)) return reject('GOLD_FENCE_WITHOUT_RECEIPT', id);
  for (const id of goldReceiptIds) if (!goldFences.has(id)) return reject('GOLD_RECEIPT_WITHOUT_FENCE', id);
  return frozen({ decision: 'CONSISTENT', production, gold });
}

function transportPlan({ job, execution, claim, carrierBinding, carrier, schedulerRegistered = false } = {}) {
  if (!job || !execution || !claim || !carrier) return reject('TRANSPORT_OWNER_MISSING');
  if (execution.kind !== 'transport-execution' || execution.jobId !== job.id) return reject('TRANSPORT_EXECUTION_JOB_MISMATCH');
  if (execution.unitId !== carrier.unitId) return reject('TRANSPORT_EXECUTION_CARRIER_MISMATCH');
  const jobState = status(job.status);
  const executionState = status(execution.state);
  const claimState = status(claim.state);
  const carrierState = status(carrier.state);

  if (claimState === 'CONSUMED' && jobState !== 'PENDING' && carrierState === 'AVAILABLE' && carrierBinding == null && !schedulerRegistered) {
    return frozen({ decision: DECISION.ALREADY_COMPLETE_NOOP, reason: null });
  }
  if (executionState !== 'DELIVERED' || jobState !== 'PENDING') return reject('TRANSPORT_NOT_RECOVERABLE_DELIVERED_PENDING');
  if (!carrierBinding || carrierBinding.jobId !== job.id || carrierBinding.unitId !== carrier.unitId) return reject('TRANSPORT_BINDING_MISMATCH');
  if (carrierState !== 'OCCUPIED') return reject('TRANSPORT_CARRIER_NOT_OCCUPIED');
  if (schedulerRegistered) return reject('TRANSPORT_ALREADY_SCHEDULED_DURING_RECONCILIATION');
  if (claimState === 'ACTIVE') return frozen({ decision: DECISION.SETTLE_AND_COMPLETE, reason: null });
  if (claimState === 'CONSUMED') return frozen({ decision: DECISION.COMPLETE_ONLY, reason: null });
  return reject('TRANSPORT_CLAIM_STATE_CONTRADICTION', claimState);
}

export class PostIM13ExactlyOnceRecoveryReconciliation {
  static get decisions() { return DECISION; }

  static plan(input = {}) {
    const effects = validateReceiptFenceConsistency(input);
    if (effects.decision === DECISION.REJECTED_FAIL_CLOSED) return frozen({ kind: 'im20f-recovery-plan', status: 'REJECTED', effects, transport: null });
    const transport = input.transport == null ? null : transportPlan(input.transport);
    if (transport?.decision === DECISION.REJECTED_FAIL_CLOSED) return frozen({ kind: 'im20f-recovery-plan', status: 'REJECTED', effects, transport });
    return frozen({ kind: 'im20f-recovery-plan', status: 'PLANNED', effects, transport });
  }

  static execute(plan, { settleAndComplete, completeOnly } = {}) {
    if (!plan || plan.kind !== 'im20f-recovery-plan' || plan.status !== 'PLANNED') throw new TypeError('PLANNED IM-20F recovery plan required');
    const decision = plan.transport?.decision;
    if (decision == null || decision === DECISION.ALREADY_COMPLETE_NOOP) return frozen({ kind: 'im20f-recovery-execution', status: 'EXECUTED', decision: decision ?? 'NO_TRANSPORT', result: null });
    if (decision === DECISION.SETTLE_AND_COMPLETE) {
      if (typeof settleAndComplete !== 'function') throw new TypeError('settleAndComplete executor required');
      return frozen({ kind: 'im20f-recovery-execution', status: 'EXECUTED', decision, result: settleAndComplete() });
    }
    if (decision === DECISION.COMPLETE_ONLY) {
      if (typeof completeOnly !== 'function') throw new TypeError('completeOnly executor required');
      return frozen({ kind: 'im20f-recovery-execution', status: 'EXECUTED', decision, result: completeOnly() });
    }
    throw new Error(`unsupported IM-20F decision: ${decision}`);
  }
}
