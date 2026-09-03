import { DeliverySettlementContract } from './delivery-settlement-contract.js';

function requireCompatible(name, value, methods) {
  if (!value || methods.some(method => typeof value[method] !== 'function')) {
    throw new TypeError(`${name}-compatible instance required`);
  }
  return value;
}

export class DeliverySettlementService {
  #resources;
  #claims;
  #demands;

  constructor({ resources, claims, demands } = {}) {
    this.#resources = requireCompatible('ResourceState', resources, ['get']);
    this.#claims = requireCompatible('ResourceClaims', claims, ['get']);
    this.#demands = requireCompatible('ResourceDemands', demands, ['get', 'consumeClaim']);
  }

  commit({ settlement, job, execution, delivery } = {}) {
    if (!settlement || settlement.kind !== 'delivery-settlement') {
      throw new TypeError('delivery-settlement contract required');
    }

    const claim = this.#claims.get(settlement.claimId);
    const demand = this.#demands.get(settlement.demandId);
    const resource = this.#resources.get(settlement.resourceId);

    // Revalidate the frozen CR-07A boundary immediately before the state change.
    const validated = DeliverySettlementContract.fromDelivered({
      job,
      execution,
      delivery,
      claim,
      demand,
      resource
    });

    for (const key of ['jobId', 'executionJobId', 'unitId', 'resourceId', 'claimId', 'demandId', 'targetId', 'amount']) {
      if (validated[key] !== settlement[key]) throw new Error(`settlement contract changed before commit: ${key}`);
    }

    const beforeJob = JSON.stringify(job);
    const beforeExecution = JSON.stringify(execution);
    const beforeDelivery = JSON.stringify(delivery);

    const consumedClaim = this.#demands.consumeClaim(settlement.claimId);
    const settledResource = this.#resources.get(settlement.resourceId);
    const settledDemand = this.#demands.get(settlement.demandId);

    if (consumedClaim.state !== 'CONSUMED') throw new Error('claim settlement did not reach CONSUMED');
    if (settledDemand.fulfilledAmount < settlement.amount) throw new Error('demand settlement did not record fulfilled amount');
    if (JSON.stringify(job) !== beforeJob || JSON.stringify(execution) !== beforeExecution || JSON.stringify(delivery) !== beforeDelivery) {
      throw new Error('CR-07B must not mutate transport job, execution or delivered cargo');
    }

    return Object.freeze({
      kind: 'delivery-settlement-commit',
      settlement,
      claim: consumedClaim,
      resource: settledResource,
      demand: settledDemand
    });
  }
}
