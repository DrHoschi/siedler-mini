function deepFreeze(value) {
  if (value == null || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function requirePopulation(population) {
  if (population?.kind !== 'derived-population') {
    throw new TypeError('derived population contract required');
  }
  if (!Number.isInteger(population.count) || population.count < 0) {
    throw new TypeError('invalid derived population count');
  }
  if (!Array.isArray(population.personIds) || population.personIds.length !== population.count) {
    throw new TypeError('derived population personIds/count mismatch');
  }
  const unique = new Set(population.personIds);
  if (unique.size !== population.personIds.length) {
    throw new Error('derived population contains duplicate person ids');
  }
  return population;
}

function requireGoldPerResident(value) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new TypeError('goldPerResident must be a non-negative safe integer');
  }
  return value;
}

function requireBalance(value) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new TypeError('gold balance must be a non-negative safe integer');
  }
  return value;
}

export class GoldEconomyOwner {
  #balance;

  constructor({ initialGold = 0 } = {}) {
    this.#balance = requireBalance(initialGold);
  }

  get kind() {
    return 'gold-economy-owner';
  }

  get balance() {
    return this.#balance;
  }

  deriveIncome({ population, goldPerResident } = {}) {
    const residentTruth = requirePopulation(population);
    const rate = requireGoldPerResident(goldPerResident);
    const amount = residentTruth.count * rate;
    if (!Number.isSafeInteger(amount)) throw new RangeError('derived gold income exceeds safe integer range');

    return deepFreeze({
      kind: 'derived-gold-income',
      populationCount: residentTruth.count,
      residentPersonIds: residentTruth.personIds.slice(),
      goldPerResident: rate,
      amount,
    });
  }

  applyIncome(income) {
    if (income?.kind !== 'derived-gold-income' || !Number.isSafeInteger(income.amount) || income.amount < 0) {
      throw new TypeError('derived gold income contract required');
    }
    const next = this.#balance + income.amount;
    if (!Number.isSafeInteger(next)) throw new RangeError('gold balance exceeds safe integer range');
    this.#balance = next;
    return this.snapshot();
  }

  settle({ population, goldPerResident } = {}) {
    const income = this.deriveIncome({ population, goldPerResident });
    const state = this.applyIncome(income);
    return deepFreeze({
      kind: 'gold-economy-settlement',
      income,
      state,
    });
  }

  snapshot() {
    return deepFreeze({
      kind: 'gold-economy-state',
      balance: this.#balance,
      physical: false,
    });
  }
}
