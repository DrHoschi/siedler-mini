import { BuildingStockContract } from './building-stock-contract.js';

function requireIntegration(value) {
  if (!value || value.kind !== 'operational-building-production-recipe-integration') {
    throw new TypeError('frozen IM-18D production recipe integration required');
  }
  if (value.workforceAssignment?.status !== 'ASSIGNED') {
    throw new TypeError('assigned operational workforce required');
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

export class OperationalProductionExecution {
  static status = Object.freeze({ READY: 'READY', BLOCKED_INPUT: 'BLOCKED_INPUT' });

  static evaluate({ productionIntegration, stocks } = {}) {
    const integration = requireIntegration(productionIntegration);
    const byType = normalizeStocks(stocks, integration.buildingId);
    const missingInputs = integration.inputs
      .map(input => Object.freeze({
        resourceTypeId: input.resourceTypeId,
        required: input.quantity,
        available: byType.get(input.resourceTypeId)?.quantity ?? 0
      }))
      .filter(input => input.available < input.required);

    return Object.freeze({
      kind: 'operational-production-execution',
      buildingId: integration.buildingId,
      status: missingInputs.length === 0 ? this.status.READY : this.status.BLOCKED_INPUT,
      productionIntegration: integration,
      stocks: Object.freeze([...byType.values()].sort((a,b) => a.resourceTypeId.localeCompare(b.resourceTypeId))),
      missingInputs: Object.freeze(missingInputs)
    });
  }

  static execute({ productionIntegration, stocks } = {}) {
    const execution = this.evaluate({ productionIntegration, stocks });
    if (execution.status !== this.status.READY) throw new Error('operational production execution blocked by insufficient inputs');
    return execution;
  }
}
