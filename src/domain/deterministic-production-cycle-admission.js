import { OperationalProductionExecution } from './operational-production-execution.js';
import { SettlementEffectReceiptContract } from '../savegame/settlement-effect-receipt-contract.js';

const SETTLEMENT_PREFIX = 'production-settlement:im22:';

function requireArray(value, label) {
  if (!Array.isArray(value)) throw new TypeError(`${label} array required`);
  return value;
}

function settlementPrefix(buildingId) {
  return `${SETTLEMENT_PREFIX}${buildingId}:`;
}

function cycleNumber(cycleId) {
  const match = /^im25-cycle-(\d+)$/.exec(cycleId);
  if (!match) return null;
  const value = Number(match[1]);
  return Number.isSafeInteger(value) && value >= 1 ? value : null;
}

function historyForBuilding({ buildingId, productionSettlementIds, productionEffectReceipts }) {
  const fences = requireArray(productionSettlementIds, 'productionSettlementIds');
  const receipts = SettlementEffectReceiptContract.productionList(
    requireArray(productionEffectReceipts, 'productionEffectReceipts')
  );
  const fenceSet = new Set(fences);
  if (fenceSet.size !== fences.length) throw new Error('duplicate production settlement fence');

  const receiptIds = new Set(receipts.map(value => value.settlementId));
  for (const id of fenceSet) {
    if (!receiptIds.has(id)) throw new Error(`production settlement fence without receipt: ${id}`);
  }
  for (const id of receiptIds) {
    if (!fenceSet.has(id)) throw new Error(`production effect receipt without settlement fence: ${id}`);
  }

  const prefix = settlementPrefix(buildingId);
  const indices = [];
  for (const receipt of receipts) {
    if (receipt.buildingId !== buildingId) continue;
    if (!receipt.settlementId.startsWith(prefix)) {
      throw new Error(`production receipt settlement id/building mismatch: ${receipt.settlementId}`);
    }
    const number = cycleNumber(receipt.settlementId.slice(prefix.length));
    if (number == null) throw new Error(`unsupported IM-25 production cycle identity: ${receipt.settlementId}`);
    indices.push(number);
  }
  indices.sort((a, b) => a - b);
  for (let index = 0; index < indices.length; index += 1) {
    if (indices[index] !== index + 1) throw new Error('non-contiguous IM-25 production cycle history');
  }
  return Object.freeze(indices);
}

export class DeterministicProductionCycleAdmission {
  static evaluate({
    productionIntegration,
    stocks,
    productionSettlementIds = [],
    productionEffectReceipts = [],
  } = {}) {
    const execution = OperationalProductionExecution.evaluate({ productionIntegration, stocks });
    if (execution.status === OperationalProductionExecution.status.BLOCKED_INPUT) {
      return Object.freeze({
        kind: 'deterministic-production-cycle-admission',
        status: 'NOT_ADMITTED',
        reason: 'BLOCKED_INPUT',
        buildingId: execution.buildingId,
        cycleId: null,
        execution,
        mutation: false,
      });
    }

    const history = historyForBuilding({
      buildingId: execution.buildingId,
      productionSettlementIds,
      productionEffectReceipts,
    });
    const cycleId = `im25-cycle-${String(history.length + 1).padStart(8, '0')}`;
    return Object.freeze({
      kind: 'deterministic-production-cycle-admission',
      status: 'ADMITTED',
      reason: null,
      buildingId: execution.buildingId,
      cycleId,
      execution,
      settledCycleCount: history.length,
      mutation: false,
    });
  }
}
