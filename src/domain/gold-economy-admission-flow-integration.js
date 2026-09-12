import { GoldEconomyOwner } from './gold-economy-owner.js';

const FLOW_TYPES = Object.freeze({
  POPULATION_INCOME: 'POPULATION_INCOME'
});

const STATUS = Object.freeze({
  ADMITTED: 'ADMITTED'
});

function requireGoldOwner(value) {
  if (!(value instanceof GoldEconomyOwner) || value.kind !== 'gold-economy-owner') {
    throw new TypeError('existing GoldEconomyOwner required');
  }
  const snapshot = value.snapshot();
  if (snapshot.kind !== 'gold-economy-state' || snapshot.physical !== false) {
    throw new TypeError('non-physical gold economy state required');
  }
  return value;
}

function requirePopulationProjection(value) {
  if (!value || value.kind !== 'authoritative-population-projection') {
    throw new TypeError('frozen IM-19D authoritative population projection required');
  }
  if (!Number.isSafeInteger(value.count) || value.count < 0) {
    throw new TypeError('invalid authoritative population count');
  }
  if (!Array.isArray(value.personIds) || value.personIds.length !== value.count) {
    throw new TypeError('authoritative population personIds/count mismatch');
  }
  if (new Set(value.personIds).size !== value.personIds.length) {
    throw new Error('authoritative population contains duplicate person ids');
  }
  if (!Array.isArray(value.residents) || value.residents.length !== value.count) {
    throw new TypeError('authoritative population residents/count mismatch');
  }
  if (!Number.isSafeInteger(value.occupiedHousingSlots) || value.occupiedHousingSlots !== value.count) {
    throw new Error('authoritative population/housing occupancy mismatch');
  }
  return value;
}

function requireFlowType(value) {
  if (value !== FLOW_TYPES.POPULATION_INCOME) {
    throw new TypeError(`unsupported gold flow type: ${String(value)}`);
  }
  return value;
}

function requireRate(value) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new TypeError('goldPerResident must be a non-negative safe integer');
  }
  return value;
}

function asLegacyDerivedPopulation(projection) {
  return Object.freeze({
    kind: 'derived-population',
    count: projection.count,
    personIds: Object.freeze(projection.personIds.slice())
  });
}

export class GoldEconomyAdmissionFlowIntegration {
  static get flowTypes() {
    return FLOW_TYPES;
  }

  static get status() {
    return STATUS;
  }

  static admit({
    goldOwner,
    populationProjection,
    flowType = FLOW_TYPES.POPULATION_INCOME,
    goldPerResident
  } = {}) {
    const owner = requireGoldOwner(goldOwner);
    const population = requirePopulationProjection(populationProjection);
    const admittedFlowType = requireFlowType(flowType);
    const rate = requireRate(goldPerResident);
    const stateBefore = owner.snapshot();

    const legacyPopulationAdapter = asLegacyDerivedPopulation(population);
    const derivedIncome = owner.deriveIncome({
      population: legacyPopulationAdapter,
      goldPerResident: rate
    });

    if (owner.balance !== stateBefore.balance) {
      throw new Error('gold flow admission must not mutate GoldEconomyOwner balance');
    }

    return Object.freeze({
      kind: 'gold-economy-admission-flow',
      status: STATUS.ADMITTED,
      flowType: admittedFlowType,
      amount: derivedIncome.amount,
      goldPerResident: rate,
      populationCount: population.count,
      residentPersonIds: Object.freeze(population.personIds.slice()),
      physical: false,
      stateBefore,
      populationProjection: population,
      derivedIncome
    });
  }
}
