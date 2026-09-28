import { ProductionOutputResourceAvailabilityIntegration } from '../domain/production-output-resource-availability-integration.js';

function requireComposition(value) {
  if (value?.kind !== 'active-runtime-composition' || !value.authoritative) throw new TypeError('active runtime composition required');
  return value;
}
function requireArray(value, label) {
  if (!Array.isArray(value)) throw new TypeError(`${label} array required`);
  return value;
}

export class ActiveRuntimeProductionOutputAvailabilityOrchestration {
  #get; #publish;

  constructor({ getComposition, publishComposition } = {}) {
    if (typeof getComposition !== 'function' || typeof publishComposition !== 'function') throw new TypeError('composition read/publish seam required');
    this.#get = getComposition;
    this.#publish = publishComposition;
  }

  publishSettledComposition(value) {
    const composition = requireComposition(value);
    const owners = composition.authoritative;
    const receipts = requireArray(owners.productionEffectReceipts, 'productionEffectReceipts');
    const settledIds = requireArray(owners.productionSettlementIds, 'productionSettlementIds');
    this.#publish(composition);
    const materializations = receipts.filter(receipt => settledIds.includes(receipt?.settlementId)).map(receipt =>
      ProductionOutputResourceAvailabilityIntegration.materialize({
        receipt,
        settledIds,
        buildingStocks: requireArray(owners.buildingStocks, 'buildingStocks'),
        resourceState: owners.resourceState,
        claims: owners.resourceClaims ?? null,
      }));
    if (materializations.some(result => result.mutation)) this.#publish(composition);
    return Object.freeze({
      kind: 'im28-active-runtime-production-output-publication',
      status: materializations.some(result => result.mutation) ? 'MATERIALIZED' : 'PUBLISHED',
      materializations: Object.freeze(materializations),
      mutation: materializations.some(result => result.mutation),
    });
  }

  reconcileSettlement({ settlementResult } = {}) {
    if (!settlementResult || settlementResult.kind !== 'im22-runtime-economy-cycle-result') throw new TypeError('IM-22 runtime economy cycle result required');
    if (!['SETTLED', 'ALREADY_SETTLED'].includes(settlementResult.status)) {
      return Object.freeze({
        kind: 'im28-active-runtime-production-output-availability-result',
        status: 'NOT_MATERIALIZED',
        reason: settlementResult.status,
        settlementId: settlementResult.settlementId ?? null,
        materialization: null,
        mutation: false,
      });
    }

    const composition = requireComposition(this.#get());
    const owners = composition.authoritative;
    const settledIds = requireArray(owners.productionSettlementIds, 'productionSettlementIds');
    const receipts = requireArray(owners.productionEffectReceipts, 'productionEffectReceipts');
    const receipt = receipts.find(value => value?.settlementId === settlementResult.settlementId) ?? null;
    if (!receipt) throw new Error('authoritative production effect receipt required');

    const materialization = ProductionOutputResourceAvailabilityIntegration.materialize({
      receipt,
      settledIds,
      buildingStocks: requireArray(owners.buildingStocks, 'buildingStocks'),
      resourceState: owners.resourceState,
      claims: owners.resourceClaims ?? null,
    });

    if (materialization.mutation) this.#publish(composition);
    return Object.freeze({
      kind: 'im28-active-runtime-production-output-availability-result',
      status: materialization.status,
      reason: materialization.reason ?? null,
      settlementId: settlementResult.settlementId,
      materialization,
      mutation: materialization.mutation,
    });
  }
}
