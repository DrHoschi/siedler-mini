import { SettlementEffectReceiptContract } from '../savegame/settlement-effect-receipt-contract.js';
import { PostIM13ExactlyOnceRecoveryReconciliation as Recovery } from '../savegame/post-im13-exactly-once-recovery-reconciliation.js';

function assert(condition, message) { if (!condition) throw new Error(message); }
function baseTransport(claimState = 'ACTIVE') {
  return {
    job: { id: 'transport-job-1', status: 'PENDING' },
    execution: { kind: 'transport-execution', jobId: 'transport-job-1', unitId: 'unit-1', state: 'DELIVERED' },
    claim: { id: 'claim-1', state: claimState },
    carrierBinding: { kind: 'carrier-job-binding', jobId: 'transport-job-1', unitId: 'unit-1' },
    carrier: { id: 'unit-1', state: 'OCCUPIED' },
    schedulerRegistered: false
  };
}
function effects() {
  return {
    productionSettlementIds: ['prod-1'],
    productionReceipts: [{
      kind: 'production-effect-receipt', settlementId: 'prod-1', buildingId: 'building-1',
      inputs: [{ resourceTypeId: 'resource-type-1', amount: 2 }], outputs: [{ resourceTypeId: 'resource-type-2', amount: 1 }],
      stockBefore: [{ resourceTypeId: 'resource-type-1', quantity: 5 }, { resourceTypeId: 'resource-type-2', quantity: 0 }],
      stockAfter: [{ resourceTypeId: 'resource-type-1', quantity: 3 }, { resourceTypeId: 'resource-type-2', quantity: 1 }]
    }],
    goldSettlementIds: ['gold-1'],
    goldReceipts: [{ kind: 'gold-effect-receipt', settlementId: 'gold-1', balanceBefore: 10, amount: 3, balanceAfter: 13 }]
  };
}

export function runIM20FSelfTest() {
  SettlementEffectReceiptContract.production(effects().productionReceipts[0]);
  SettlementEffectReceiptContract.gold(effects().goldReceipts[0]);
  let plan = Recovery.plan({ ...effects(), transport: baseTransport('ACTIVE') });
  assert(plan.status === 'PLANNED' && plan.transport.decision === 'SETTLE_AND_COMPLETE', 'ACTIVE claim must settle and complete');
  plan = Recovery.plan({ ...effects(), transport: baseTransport('CONSUMED') });
  assert(plan.status === 'PLANNED' && plan.transport.decision === 'COMPLETE_ONLY', 'CONSUMED claim must complete only');
  const terminal = baseTransport('CONSUMED'); terminal.job.status = 'RELEASED'; terminal.carrier.state = 'AVAILABLE'; terminal.carrierBinding = null;
  plan = Recovery.plan({ ...effects(), transport: terminal });
  assert(plan.transport.decision === 'ALREADY_COMPLETE_NOOP', 'terminal transport must be no-op');
  const wrong = baseTransport('ACTIVE'); wrong.carrierBinding.unitId = 'unit-2';
  assert(Recovery.plan({ ...effects(), transport: wrong }).status === 'REJECTED', 'wrong carrier binding must fail closed');
  assert(Recovery.plan({ ...effects(), productionSettlementIds: ['prod-missing'], transport: null }).status === 'REJECTED', 'fence without receipt must fail closed');
  assert(Recovery.plan({ ...effects(), productionSettlementIds: [], transport: null }).status === 'REJECTED', 'receipt without fence must fail closed');
  assert(Recovery.plan({ ...effects(), goldSettlementIds: ['gold-missing'], transport: null }).status === 'REJECTED', 'gold fence without receipt must fail closed');
  assert(Recovery.plan({ ...effects(), goldSettlementIds: [], transport: null }).status === 'REJECTED', 'gold receipt without fence must fail closed');
  return Object.freeze({ kind: 'im20f-self-test-result', status: 'PASS' });
}
