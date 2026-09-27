import { DeterministicProductionCycleAdmission } from '../domain/deterministic-production-cycle-admission.js';
import { OperationalBuildingProductionRecipeIntegration } from '../domain/operational-building-production-recipe-integration.js';
import { SettlementEffectReceiptContract } from '../savegame/settlement-effect-receipt-contract.js';

function fixture({ inputQuantity = 3 } = {}) {
  const buildingId = 'building:00000001';
  const workforceAssignment = Object.freeze({
    kind: 'operational-building-workforce-assignment',
    status: 'ASSIGNED',
    buildingId,
  });
  const recipe = Object.freeze({
    kind: 'production-building-stock',
    buildingId,
    inputs: Object.freeze([{ resourceTypeId: 'resource-type:00000001', quantity: 3 }]),
    outputs: Object.freeze([{ resourceTypeId: 'resource-type:00000002', quantity: 2 }]),
  });
  const productionIntegration = OperationalBuildingProductionRecipeIntegration.integrate({ workforceAssignment, recipe });
  const stocks = Object.freeze([
    Object.freeze({ kind: 'building-stock', buildingId, resourceTypeId: 'resource-type:00000001', quantity: inputQuantity }),
    Object.freeze({ kind: 'building-stock', buildingId, resourceTypeId: 'resource-type:00000002', quantity: 1 }),
  ]);
  return { buildingId, productionIntegration, stocks };
}

function settledHistory(f, cycleId = 'im25-cycle-00000001') {
  const settlementId = `production-settlement:im22:${f.buildingId}:${cycleId}`;
  const receipt = SettlementEffectReceiptContract.production({
    kind: 'production-effect-receipt',
    settlementId,
    buildingId: f.buildingId,
    inputs: [{ resourceTypeId: 'resource-type:00000001', amount: 3 }],
    outputs: [{ resourceTypeId: 'resource-type:00000002', amount: 2 }],
    stockBefore: [
      { resourceTypeId: 'resource-type:00000001', quantity: 3 },
      { resourceTypeId: 'resource-type:00000002', quantity: 1 },
    ],
    stockAfter: [
      { resourceTypeId: 'resource-type:00000001', quantity: 0 },
      { resourceTypeId: 'resource-type:00000002', quantity: 3 },
    ],
  });
  return { productionSettlementIds: Object.freeze([settlementId]), productionEffectReceipts: Object.freeze([receipt]) };
}

function check(name, fn, results) {
  try { results.push(Object.freeze({ name, pass: !!fn() })); }
  catch (error) { results.push(Object.freeze({ name, pass: false, error: String(error?.message || error) })); }
}

export function runIM25SelfTest() {
  const results = [];
  check('ready-first-cycle-is-stable-and-non-mutating', () => {
    const f = fixture(), fences = [], receipts = [];
    const before = JSON.stringify({ stocks: f.stocks, fences, receipts });
    const first = DeterministicProductionCycleAdmission.evaluate({ ...f, productionSettlementIds: fences, productionEffectReceipts: receipts });
    const second = DeterministicProductionCycleAdmission.evaluate({ ...f, productionSettlementIds: fences, productionEffectReceipts: receipts });
    return first.status === 'ADMITTED' && first.cycleId === 'im25-cycle-00000001' &&
      second.cycleId === first.cycleId && before === JSON.stringify({ stocks: f.stocks, fences, receipts });
  }, results);
  check('blocked-input-admits-no-cycle', () => {
    const f = fixture({ inputQuantity: 2 });
    const result = DeterministicProductionCycleAdmission.evaluate({ ...f });
    return result.status === 'NOT_ADMITTED' && result.reason === 'BLOCKED_INPUT' && result.cycleId === null;
  }, results);
  check('settled-cycle-advances-exactly-once', () => {
    const f = fixture(), history = settledHistory(f);
    const first = DeterministicProductionCycleAdmission.evaluate({ ...f, ...history });
    const restored = structuredClone({ stocks: f.stocks, ...history });
    const second = DeterministicProductionCycleAdmission.evaluate({
      productionIntegration: f.productionIntegration,
      stocks: restored.stocks,
      productionSettlementIds: restored.productionSettlementIds,
      productionEffectReceipts: restored.productionEffectReceipts,
    });
    return first.cycleId === 'im25-cycle-00000002' && second.cycleId === first.cycleId && first.settledCycleCount === 1;
  }, results);
  check('inconsistent-fence-receipt-history-fails-closed', () => {
    const f = fixture(), history = settledHistory(f);
    let fenceOnly = false, receiptOnly = false;
    try { DeterministicProductionCycleAdmission.evaluate({ ...f, productionSettlementIds: history.productionSettlementIds, productionEffectReceipts: [] }); }
    catch { fenceOnly = true; }
    try { DeterministicProductionCycleAdmission.evaluate({ ...f, productionSettlementIds: [], productionEffectReceipts: history.productionEffectReceipts }); }
    catch { receiptOnly = true; }
    return fenceOnly && receiptOnly;
  }, results);
  check('foreign-production-history-does-not-advance-building-cycle', () => {
    const f = fixture();
    const foreign = Object.freeze({
      kind: 'production-effect-receipt',
      settlementId: 'production-settlement:im22:building:00000002:im25-cycle-00000001',
      buildingId: 'building:00000002',
      inputs: Object.freeze([{ resourceTypeId: 'resource-type:00000001', amount: 1 }]),
      outputs: Object.freeze([{ resourceTypeId: 'resource-type:00000002', amount: 1 }]),
      stockBefore: Object.freeze([{ resourceTypeId: 'resource-type:00000001', quantity: 1 }]),
      stockAfter: Object.freeze([{ resourceTypeId: 'resource-type:00000002', quantity: 1 }]),
    });
    const result = DeterministicProductionCycleAdmission.evaluate({
      ...f,
      productionSettlementIds: [foreign.settlementId],
      productionEffectReceipts: [foreign],
    });
    return result.cycleId === 'im25-cycle-00000001';
  }, results);
  const blockerCount = results.filter(value => !value.pass).length;
  return Object.freeze({ status: blockerCount === 0 ? 'PASS' : 'FAIL', blockerCount, results: Object.freeze(results) });
}
