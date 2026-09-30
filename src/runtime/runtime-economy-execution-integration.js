import { OperationalBuildingProductionRecipeIntegration } from '../domain/operational-building-production-recipe-integration.js';
import { OperationalProductionExecution } from '../domain/operational-production-execution.js';
import { InputConsumptionOutputSettlement } from '../domain/input-consumption-output-settlement.js';
import { SettlementEffectReceiptContract } from '../savegame/settlement-effect-receipt-contract.js';

function nonEmpty(value, label) {
  const normalized = typeof value === 'string' ? value.trim() : '';
  if (!normalized) throw new TypeError(`${label} required`);
  return normalized;
}

function requireComposition(value) {
  if (value?.kind !== 'active-runtime-composition' || !value.authoritative) {
    throw new TypeError('active runtime composition required');
  }
  return value;
}

function requireArray(value, label) {
  if (!Array.isArray(value)) throw new TypeError(`${label} array required`);
  return value;
}

function stocksForBuilding(stocks, buildingId) {
  return requireArray(stocks, 'buildingStocks').filter(value => value.buildingId === buildingId);
}

function replaceBuildingStocks(allStocks, buildingId, replacement) {
  return Object.freeze([
    ...allStocks.filter(value => value.buildingId !== buildingId),
    ...replacement,
  ].sort((a, b) => {
    const byBuilding = a.buildingId.localeCompare(b.buildingId);
    return byBuilding || a.resourceTypeId.localeCompare(b.resourceTypeId);
  }));
}

function productionReceipt({ settlement, before }) {
  return SettlementEffectReceiptContract.production({
    kind: 'production-effect-receipt',
    settlementId: settlement.settlementId,
    buildingId: settlement.buildingId,
    inputs: settlement.consumed.map(value => ({ resourceTypeId: value.resourceTypeId, amount: value.quantity })),
    outputs: settlement.produced.map(value => ({ resourceTypeId: value.resourceTypeId, amount: value.quantity })),
    stockBefore: before.map(value => ({ resourceTypeId: value.resourceTypeId, quantity: value.quantity })),
    stockAfter: settlement.stocks.map(value => ({ resourceTypeId: value.resourceTypeId, quantity: value.quantity })),
  });
}

export class RuntimeEconomyExecutionIntegration {
  static installOneShotProductionCycle({
    runtime,
    getComposition,
    publishComposition,
    cycleId,
    buildingId,
    workforceAssignment,
    recipe,
    resolveProductionContext,
    onResult = () => {},
  } = {}) {
    if (!runtime?.scheduler || typeof runtime.scheduler.register !== 'function') {
      throw new TypeError('Runtime Scheduler required');
    }
    if (typeof getComposition !== 'function' || typeof publishComposition !== 'function') {
      throw new TypeError('composition read/publish seam required');
    }

    const stableCycleId = nonEmpty(cycleId, 'cycleId');
    const stableBuildingId = nonEmpty(buildingId, 'buildingId');
    const settlementId = `production-settlement:im22:${stableBuildingId}:${stableCycleId}`;
    const schedulerId = `im22-production-cycle:${stableBuildingId}:${stableCycleId}`;
    const timingEnabled = () => getComposition().authoritative.productionCycleTimes != null || getComposition().authoritative.productionCycleProgressions != null;
    if (timingEnabled() && typeof resolveProductionContext !== 'function') throw new Error('IM-31 execution boundary required for timed production');
    let unregister = () => {};
    let completed = false;
    let result = null;

    unregister = runtime.scheduler.register({
      id: schedulerId,
      phase: 'economy',
      tick: () => {
        if (completed) return result;
        let currentContext = null;
        if (timingEnabled()) {
          const p = getComposition().authoritative.productionCycleProgressions?.find(v => v.buildingId === stableBuildingId && v.cycleId === stableCycleId);
          if (!p || p.elapsedMs !== p.requiredDurationMs || runtime.state !== 'RUNNING') return null;
          currentContext = resolveProductionContext();
          if (!currentContext || currentContext.workforceAssignment?.assignmentId !== p.assignmentId) return null;
        }
        completed = true;
        unregister();

        const composition = requireComposition(getComposition());
        const owners = composition.authoritative;
        const settledIds = requireArray(owners.productionSettlementIds, 'productionSettlementIds');
        const receipts = requireArray(owners.productionEffectReceipts, 'productionEffectReceipts');
        const allStocks = requireArray(owners.buildingStocks, 'buildingStocks');

        if (settledIds.includes(settlementId)) {
          result = Object.freeze({
            kind: 'im22-runtime-economy-cycle-result',
            status: 'ALREADY_SETTLED',
            cycleId: stableCycleId,
            buildingId: stableBuildingId,
            settlementId,
            mutation: false,
          });
          onResult(result);
          return result;
        }

        const productionIntegration = OperationalBuildingProductionRecipeIntegration.integrate({
          workforceAssignment: currentContext?.workforceAssignment ?? workforceAssignment,
          recipe: currentContext?.recipe ?? recipe,
        });
        if (productionIntegration.buildingId !== stableBuildingId) {
          throw new Error('IM-22 production cycle building mismatch');
        }

        const before = stocksForBuilding(allStocks, stableBuildingId);
        const execution = OperationalProductionExecution.evaluate({
          productionIntegration,
          stocks: before,
        });

        if (execution.status === OperationalProductionExecution.status.BLOCKED_INPUT) {
          result = Object.freeze({
            kind: 'im22-runtime-economy-cycle-result',
            status: 'BLOCKED_INPUT',
            cycleId: stableCycleId,
            buildingId: stableBuildingId,
            settlementId,
            mutation: false,
            missingInputs: execution.missingInputs,
          });
          onResult(result);
          return result;
        }

        const settled = InputConsumptionOutputSettlement.settleOnce({
          execution,
          settlementId,
          stocks: before,
          settledIds,
        });
        const receipt = productionReceipt({ settlement: settled.settlement, before });
        const nextComposition = Object.freeze({
          ...composition,
          authoritative: Object.freeze({
            ...owners,
            buildingStocks: replaceBuildingStocks(allStocks, stableBuildingId, settled.settlement.stocks),
            productionSettlementIds: settled.settledIds,
            productionEffectReceipts: Object.freeze([...receipts, receipt]),
          }),
        });
        publishComposition(nextComposition);

        result = Object.freeze({
          kind: 'im22-runtime-economy-cycle-result',
          status: 'SETTLED',
          cycleId: stableCycleId,
          buildingId: stableBuildingId,
          settlementId,
          mutation: true,
          receipt,
        });
        onResult(result);
        return result;
      },
    });

    return Object.freeze({
      kind: 'im22-runtime-economy-cycle-registration',
      schedulerId,
      phase: 'economy',
      cycleId: stableCycleId,
      buildingId: stableBuildingId,
      settlementId,
      result: () => result,
      cancel: () => {
        if (completed) return false;
        completed = true;
        unregister();
        return true;
      },
    });
  }
}
