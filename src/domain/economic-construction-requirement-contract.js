import { parseStableId } from '../world/stable-id.js';

function requireStableKind(value, kind, label) {
  const parsed = parseStableId(value);
  if (!parsed || parsed.kind !== kind) throw new TypeError(`invalid ${label}: ${value}`);
  return parsed.id;
}

function requirePositiveAmount(value, label) {
  const amount = Number(value);
  if (!Number.isSafeInteger(amount) || amount < 1) {
    throw new TypeError(`${label} must be a positive safe integer`);
  }
  return amount;
}

function requireDemandVocabulary(demand) {
  if (!demand || typeof demand !== 'object' || Array.isArray(demand) || demand.kind !== 'demand') {
    throw new TypeError('ResourceDemands demand required');
  }

  const demandId = requireStableKind(demand.id, 'demand', 'demand id');
  const buildingId = requireStableKind(demand.consumerId, 'building', 'construction consumer building id');
  const definitionId = requireStableKind(demand.definitionId, 'resource-type', 'resource definition id');
  const targetAmount = requirePositiveAmount(demand.targetAmount, 'targetAmount');
  const reservedAmount = Number(demand.reservedAmount);
  const fulfilledAmount = Number(demand.fulfilledAmount);
  const remainingAmount = Number(demand.remainingAmount);

  for (const [label, amount] of Object.entries({ reservedAmount, fulfilledAmount, remainingAmount })) {
    if (!Number.isSafeInteger(amount) || amount < 0) {
      throw new TypeError(`${label} must be a non-negative safe integer`);
    }
  }

  if (reservedAmount + fulfilledAmount + remainingAmount !== targetAmount) {
    throw new Error('economic construction demand quantity invariant failed');
  }

  return Object.freeze({
    demandId,
    buildingId,
    definitionId,
    targetAmount,
    reservedAmount,
    fulfilledAmount,
    remainingAmount,
    status: String(demand.status || ''),
  });
}

export class EconomicConstructionRequirementContract {
  #demands;

  constructor({ demands } = {}) {
    if (!demands || typeof demands.create !== 'function' || typeof demands.get !== 'function') {
      throw new TypeError('ResourceDemands-compatible instance required');
    }
    this.#demands = demands;
  }

  create({ buildingId, definitionId, targetAmount, metadata = {} } = {}, { id = null } = {}) {
    const consumerId = requireStableKind(buildingId, 'building', 'construction building id');
    const resourceDefinitionId = requireStableKind(definitionId, 'resource-type', 'resource definition id');
    const amount = requirePositiveAmount(targetAmount, 'targetAmount');

    const demand = this.#demands.create({
      consumerId,
      definitionId: resourceDefinitionId,
      amount,
      metadata,
    }, { id });

    return this.#project(demand);
  }

  get(demandId) {
    const id = requireStableKind(demandId, 'demand', 'demand id');
    const demand = this.#demands.get(id);
    return demand ? this.#project(demand) : null;
  }

  #project(demand) {
    const vocabulary = requireDemandVocabulary(demand);
    return Object.freeze({
      kind: 'economic-construction-requirement',
      buildingId: vocabulary.buildingId,
      demandId: vocabulary.demandId,
      definitionId: vocabulary.definitionId,
      targetAmount: vocabulary.targetAmount,
      reservedAmount: vocabulary.reservedAmount,
      fulfilledAmount: vocabulary.fulfilledAmount,
      remainingAmount: vocabulary.remainingAmount,
      status: vocabulary.status,
      sourceDemand: demand,
    });
  }
}
