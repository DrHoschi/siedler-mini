import { BuildingStockContract } from './building-stock-contract.js';
import { BuildingStockMutationContract } from './building-stock-mutation-contract.js';
import { OperationalProductionExecution } from './operational-production-execution.js';

function requireReadyExecution(value) {
  if (!value || value.kind !== 'operational-production-execution' || value.status !== OperationalProductionExecution.status.READY) {
    throw new TypeError('successful frozen IM-18E operational production execution required');
  }
  return value;
}

function normalizeStocks(stocks, buildingId) {
  if (!Array.isArray(stocks)) throw new TypeError('building stocks must be an array');
  const byType = new Map();
  for (const stock of stocks) {
    const value = BuildingStockContract.define(stock);
    if (value.buildingId !== buildingId) throw new TypeError(`building stock belongs to different building: ${value.buildingId}`);
    if (byType.has(value.resourceTypeId)) throw new TypeError(`duplicate building stock resource type: ${value.resourceTypeId}`);
    byType.set(value.resourceTypeId, value);
  }
  return byType;
}

function snapshot(byType) {
  return Object.freeze([...byType.values()].sort((a,b) => a.resourceTypeId.localeCompare(b.resourceTypeId)));
}

export class InputConsumptionOutputSettlement {
  static settle({ execution, settlementId, stocks } = {}) {
    const admitted = requireReadyExecution(execution);
    if (typeof settlementId !== 'string' || settlementId.trim().length === 0) throw new TypeError('settlementId required');
    const byType = normalizeStocks(stocks, admitted.buildingId);
    const recipe = admitted.productionIntegration.recipe;

    for (const input of recipe.inputs) {
      const current = byType.get(input.resourceTypeId) ?? BuildingStockContract.define({ buildingId: admitted.buildingId, resourceTypeId: input.resourceTypeId, quantity: 0 });
      byType.set(input.resourceTypeId, BuildingStockMutationContract.remove(current, input.quantity));
    }
    for (const output of recipe.outputs) {
      const current = byType.get(output.resourceTypeId) ?? BuildingStockContract.define({ buildingId: admitted.buildingId, resourceTypeId: output.resourceTypeId, quantity: 0 });
      byType.set(output.resourceTypeId, BuildingStockMutationContract.add(current, output.quantity));
    }

    return Object.freeze({
      kind: 'input-consumption-output-settlement',
      settlementId: settlementId.trim(),
      execution,
      buildingId: admitted.buildingId,
      stocks: snapshot(byType),
      consumed: recipe.inputs,
      produced: recipe.outputs
    });
  }

  static settleOnce({ execution, settlementId, stocks, settledIds = [] } = {}) {
    if (!Array.isArray(settledIds)) throw new TypeError('settledIds must be an array');
    const id = typeof settlementId === 'string' ? settlementId.trim() : '';
    if (settledIds.includes(id)) throw new Error(`production settlement already applied: ${id}`);
    const settlement = this.settle({ execution, settlementId: id, stocks });
    return Object.freeze({ settlement, settledIds: Object.freeze([...settledIds, id]) });
  }
}
