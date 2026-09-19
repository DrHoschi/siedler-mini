import assert from 'node:assert/strict';
import { Runtime } from '../runtime/runtime.js';
import { RuntimeConfig } from '../runtime/config.js';
import { createBaselineMiniworldScenario } from '../diagnostics/baseline-miniworld-scenario.js';
import { BrowserSaveGameStorageAdapter } from '../savegame/browser-savegame-storage-adapter.js';
import { PostIM13ActiveRuntimeCaptureAdapter } from '../savegame/post-im13-active-runtime-capture-adapter.js';
import { PostIM13AuthoritativeSnapshotIntegration } from '../savegame/post-im13-authoritative-snapshot-integration.js';
import { PostIM13BrowserSaveContinueLifecycle } from '../savegame/post-im13-browser-save-continue-lifecycle.js';
import { PostIM13SaveGameRestoreIntegration } from '../savegame/post-im13-savegame-restore-integration.js';
import { PostIM13SaveGameValidationContract } from '../savegame/post-im13-savegame-validation-contract.js';
import { PostContinueTransportExecutionAdapter } from '../transport/post-continue-transport-execution-adapter.js';
import { SettlementEffectReceiptContract } from '../savegame/settlement-effect-receipt-contract.js';
import { PostIM13ExactlyOnceRecoveryReconciliation as Recovery } from '../savegame/post-im13-exactly-once-recovery-reconciliation.js';

class MemoryStorage {
  values = new Map();
  getItem(key) { return this.values.get(key) ?? null; }
  setItem(key, value) { this.values.set(key, String(value)); }
  removeItem(key) { this.values.delete(key); }
}

const clone = value => structuredClone(value);
const hasError = (validation, code) => validation.errors.some(error => error.code === code);

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

function capturedBaseline() {
  const active = createBaselineMiniworldScenario({ includeSaveContinuity: true });
  const snapshot = PostIM13ActiveRuntimeCaptureAdapter.capture(active, 7);
  return { active, snapshot };
}

function deliveredSnapshot(snapshot) {
  const value = clone(snapshot);
  value.authoritative.transportExecutions[0].state = 'DELIVERED';
  return value;
}

function productionReceiptSnapshot(snapshot) {
  const value = clone(snapshot);
  const job = Object.values(value.domains.jobs.state.items)[0];
  const receipt = {
    kind: 'production-effect-receipt',
    settlementId: 'production-settlement:im20f:00000001',
    buildingId: job.targetId,
    inputs: [],
    outputs: [{ resourceTypeId: job.definitionId, amount: 1 }],
    stockBefore: [{ resourceTypeId: job.definitionId, quantity: 0 }],
    stockAfter: [{ resourceTypeId: job.definitionId, quantity: 1 }],
  };
  value.authoritative.buildingStocks.push({
    kind: 'building-stock', buildingId: job.targetId, resourceTypeId: job.definitionId, quantity: 1,
  });
  value.authoritative.settlementFences.production = [receipt.settlementId];
  value.authoritative.settlementEffectReceipts.production = [receipt];
  return value;
}

export async function runIM20FSelfTest() {
  SettlementEffectReceiptContract.production(effects().productionReceipts[0]);
  SettlementEffectReceiptContract.gold(effects().goldReceipts[0]);

  let plan = Recovery.plan({ ...effects(), transport: baseTransport('ACTIVE') });
  assert.equal(plan.status, 'PLANNED'); assert.equal(plan.transport.decision, 'SETTLE_AND_COMPLETE');
  plan = Recovery.plan({ ...effects(), transport: baseTransport('CONSUMED') });
  assert.equal(plan.transport.decision, 'COMPLETE_ONLY');
  const terminal = baseTransport('CONSUMED'); terminal.job.status = 'RELEASED'; terminal.carrier.state = 'AVAILABLE'; terminal.carrierBinding = null;
  assert.equal(Recovery.plan({ ...effects(), transport: terminal }).transport.decision, 'ALREADY_COMPLETE_NOOP');

  const wrong = baseTransport('ACTIVE'); wrong.carrierBinding.unitId = 'unit-2';
  assert.equal(Recovery.plan({ ...effects(), transport: wrong }).status, 'REJECTED');
  assert.equal(Recovery.plan({ ...effects(), productionSettlementIds: ['prod-missing'], transport: null }).status, 'REJECTED');
  assert.equal(Recovery.plan({ ...effects(), productionSettlementIds: [], transport: null }).status, 'REJECTED');
  assert.equal(Recovery.plan({ ...effects(), goldSettlementIds: ['gold-missing'], transport: null }).status, 'REJECTED');
  assert.equal(Recovery.plan({ ...effects(), goldSettlementIds: [], transport: null }).status, 'REJECTED');
  const missingBinding = baseTransport('ACTIVE'); missingBinding.carrierBinding = null;
  assert.equal(Recovery.plan({ ...effects(), transport: missingBinding }).status, 'REJECTED');
  const wrongExecution = baseTransport('ACTIVE'); wrongExecution.execution.jobId = 'transport-job-2';
  assert.equal(Recovery.plan({ ...effects(), transport: wrongExecution }).status, 'REJECTED');
  const scheduled = baseTransport('ACTIVE'); scheduled.schedulerRegistered = true;
  assert.equal(Recovery.plan({ ...effects(), transport: scheduled }).status, 'REJECTED');

  let settleCalls = 0, completeCalls = 0;
  plan = Recovery.plan({ ...effects(), transport: baseTransport('ACTIVE') });
  Recovery.execute(plan, { settleAndComplete: () => { settleCalls += 1; return 'done'; } });
  plan = Recovery.plan({ ...effects(), transport: baseTransport('CONSUMED') });
  Recovery.execute(plan, { completeOnly: () => { completeCalls += 1; return 'done'; } });
  assert.equal(settleCalls, 1); assert.equal(completeCalls, 1);
  assert.equal(Recovery.execute(Recovery.plan({ ...effects(), transport: terminal }), {}).decision, 'ALREADY_COMPLETE_NOOP');

  const { active: originalActive, snapshot } = capturedBaseline();
  assert.equal(PostIM13SaveGameValidationContract.validate(snapshot).status, 'VALID');
  assert.equal(PostIM13SaveGameRestoreIntegration.restore(snapshot).status, 'RESTORED');

  const goldMismatch = clone(snapshot); goldMismatch.economy.gold.balance += 1;
  assert.equal(hasError(PostIM13SaveGameValidationContract.validate(goldMismatch), 'GOLD_EFFECT_RECEIPT_BALANCE_MISMATCH'), true);
  const goldFenceWithoutReceipt = clone(snapshot); goldFenceWithoutReceipt.authoritative.settlementEffectReceipts.gold = [];
  assert.equal(hasError(PostIM13SaveGameValidationContract.validate(goldFenceWithoutReceipt), 'SETTLEMENT_FENCE_WITHOUT_EFFECT_RECEIPT'), true);
  const goldEffectWithoutFence = clone(snapshot); goldEffectWithoutFence.authoritative.settlementFences.gold = [];
  assert.equal(hasError(PostIM13SaveGameValidationContract.validate(goldEffectWithoutFence), 'SETTLEMENT_EFFECT_RECEIPT_WITHOUT_FENCE'), true);

  const production = productionReceiptSnapshot(snapshot);
  assert.equal(PostIM13SaveGameValidationContract.validate(production).status, 'VALID');
  assert.equal(PostIM13SaveGameRestoreIntegration.restore(production).status, 'RESTORED');
  const laterProductionStockChange = clone(production);
  const producedStock = laterProductionStockChange.authoritative.buildingStocks
    .find(stock => stock.buildingId === production.authoritative.settlementEffectReceipts.production[0].buildingId
      && stock.resourceTypeId === production.authoritative.settlementEffectReceipts.production[0].outputs[0].resourceTypeId);
  producedStock.quantity = 2;
  assert.equal(PostIM13SaveGameValidationContract.validate(laterProductionStockChange).status, 'VALID');
  const invalidProductionReceipt = clone(production);
  invalidProductionReceipt.authoritative.settlementEffectReceipts.production[0].stockAfter[0].quantity = 2;
  assert.equal(hasError(PostIM13SaveGameValidationContract.validate(invalidProductionReceipt), 'INVALID_SETTLEMENT_EFFECT_RECEIPT'), true);
  const productionFenceWithoutReceipt = clone(production); productionFenceWithoutReceipt.authoritative.settlementEffectReceipts.production = [];
  assert.equal(hasError(PostIM13SaveGameValidationContract.validate(productionFenceWithoutReceipt), 'SETTLEMENT_FENCE_WITHOUT_EFFECT_RECEIPT'), true);
  const productionEffectWithoutFence = clone(production); productionEffectWithoutFence.authoritative.settlementFences.production = [];
  assert.equal(hasError(PostIM13SaveGameValidationContract.validate(productionEffectWithoutFence), 'SETTLEMENT_EFFECT_RECEIPT_WITHOUT_FENCE'), true);

  const delivered = deliveredSnapshot(snapshot);
  const memory = new MemoryStorage();
  const storage = new BrowserSaveGameStorageAdapter({ storage: memory });
  const serializedDelivered = PostIM13AuthoritativeSnapshotIntegration.serialize(delivered);
  memory.setItem(storage.key, serializedDelivered);
  const runtime = new Runtime(RuntimeConfig); runtime.boot();
  let active = originalActive;
  const constructionBefore = JSON.stringify(delivered.authoritative.constructionProgress);
  const lifecycle = new PostIM13BrowserSaveContinueLifecycle({
    storage, runtime, getComposition: () => active, publishComposition: value => { active = value; },
  });
  const continued = lifecycle.continueFromStorage();
  assert.equal(continued.status, 'CONTINUED');
  runtime.pause();
  assert.equal(continued.schedulerRegistrationCount, 0);
  const jobId = delivered.authoritative.carrierBindings[0].jobId;
  const unitId = delivered.authoritative.carrierBindings[0].unitId;
  assert.equal(active.authoritative.domains.jobs.get(jobId).status, 'RELEASED');
  assert.equal(active.authoritative.domains.units.get(unitId).carrier.state, 'AVAILABLE');
  assert.equal(active.authoritative.carrierBindings.length, 0);
  assert.equal(active.authoritative.transportExecutions.length, 0);

  await lifecycle.save();
  const recaptured = JSON.parse(storage.read());
  assert.equal(recaptured.authoritative.carrierBindings.length, 0);
  assert.equal(recaptured.authoritative.transportExecutions.length, 0);
  assert.equal(recaptured.domains.jobs.state.items[jobId].status, 'RELEASED');
  assert.equal(recaptured.domains.units.state.items[unitId].carrier.state, 'AVAILABLE');
  assert.equal(JSON.stringify(recaptured.authoritative.constructionProgress), constructionBefore);

  const failureMemory = new MemoryStorage();
  const failureStorage = new BrowserSaveGameStorageAdapter({ storage: failureMemory });
  failureMemory.setItem(failureStorage.key, serializedDelivered);
  const failureRuntime = new Runtime(RuntimeConfig); failureRuntime.boot();
  let failureActive = createBaselineMiniworldScenario({ includeSaveContinuity: true });
  const activeBeforeFailure = failureActive;
  const presentationBefore = Object.freeze({ camera: 'before', selection: 'before' });
  let presentation = presentationBefore;
  let factoryCalls = 0;
  const failureLifecycle = new PostIM13BrowserSaveContinueLifecycle({
    storage: failureStorage,
    runtime: failureRuntime,
    getComposition: () => failureActive,
    publishComposition: value => { failureActive = value; },
    capturePresentation: () => presentation,
    restorePresentation: value => { presentation = value; },
    createTransportAdapter: options => {
      factoryCalls += 1;
      if (factoryCalls === 1) {
        return new PostContinueTransportExecutionAdapter({
          ...options,
          completionService: { complete() { throw new Error('intentional completion failure after settlement'); } },
        });
      }
      return new PostContinueTransportExecutionAdapter(options);
    },
  });
  const failedRecovery = failureLifecycle.continueFromStorage();
  assert.equal(failedRecovery.reason, 'RECOVERY_EXECUTION_FAILED');
  assert.equal(failedRecovery.candidateDiscarded, true);
  assert.equal(failureActive, activeBeforeFailure);
  assert.equal(failureStorage.read(), serializedDelivered);
  assert.equal(presentation, presentationBefore);

  return Object.freeze({
    kind: 'im20f-self-test-result',
    status: 'PASS',
    evidence: Object.freeze({
      roundtripTerminalJob: recaptured.domains.jobs.state.items[jobId].status,
      roundtripCarrier: recaptured.domains.units.state.items[unitId].carrier.state,
      terminalBindings: recaptured.authoritative.carrierBindings.length,
      terminalExecutions: recaptured.authoritative.transportExecutions.length,
      constructionEvidenceStable: true,
      failedCandidateDiscarded: true,
      productionReceiptSnapshotRestore: true,
      goldReceiptSnapshotRestore: true,
    }),
  });
}
