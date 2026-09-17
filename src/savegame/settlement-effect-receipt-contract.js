function deepFreeze(value) {
  if (value == null || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function nonEmpty(value, label) {
  const normalized = typeof value === 'string' ? value.trim() : '';
  if (!normalized) throw new TypeError(`${label} required`);
  return normalized;
}

function amount(value, label, { positive = false } = {}) {
  const normalized = Number(value);
  if (!Number.isSafeInteger(normalized) || (positive ? normalized < 1 : normalized < 0)) {
    throw new TypeError(`${label} must be a ${positive ? 'positive' : 'non-negative'} safe integer`);
  }
  return normalized;
}

function normalizeEntries(values, label) {
  if (!Array.isArray(values)) throw new TypeError(`${label} must be an array`);
  const seen = new Set();
  const result = values.map((value) => {
    const resourceTypeId = nonEmpty(value?.resourceTypeId, `${label}.resourceTypeId`);
    if (seen.has(resourceTypeId)) throw new Error(`duplicate ${label} resourceTypeId: ${resourceTypeId}`);
    seen.add(resourceTypeId);
    return deepFreeze({ resourceTypeId, amount: amount(value?.amount, `${label}.amount`, { positive: true }) });
  });
  result.sort((a, b) => a.resourceTypeId.localeCompare(b.resourceTypeId));
  return Object.freeze(result);
}

function normalizeStock(values, label) {
  if (!Array.isArray(values)) throw new TypeError(`${label} must be an array`);
  const seen = new Set();
  const result = values.map((value) => {
    const resourceTypeId = nonEmpty(value?.resourceTypeId, `${label}.resourceTypeId`);
    if (seen.has(resourceTypeId)) throw new Error(`duplicate ${label} resourceTypeId: ${resourceTypeId}`);
    seen.add(resourceTypeId);
    return deepFreeze({ resourceTypeId, quantity: amount(value?.quantity, `${label}.quantity`) });
  });
  result.sort((a, b) => a.resourceTypeId.localeCompare(b.resourceTypeId));
  return Object.freeze(result);
}

export class SettlementEffectReceiptContract {
  static production(value) {
    if (!value || value.kind !== 'production-effect-receipt') throw new TypeError('production-effect-receipt required');
    const receipt = {
      kind: 'production-effect-receipt',
      settlementId: nonEmpty(value.settlementId, 'settlementId'),
      buildingId: nonEmpty(value.buildingId, 'buildingId'),
      inputs: normalizeEntries(value.inputs, 'inputs'),
      outputs: normalizeEntries(value.outputs, 'outputs'),
      stockBefore: normalizeStock(value.stockBefore, 'stockBefore'),
      stockAfter: normalizeStock(value.stockAfter, 'stockAfter')
    };
    const before = new Map(receipt.stockBefore.map(entry => [entry.resourceTypeId, entry.quantity]));
    const after = new Map(receipt.stockAfter.map(entry => [entry.resourceTypeId, entry.quantity]));
    const delta = new Map();
    for (const entry of receipt.inputs) delta.set(entry.resourceTypeId, (delta.get(entry.resourceTypeId) ?? 0) - entry.amount);
    for (const entry of receipt.outputs) delta.set(entry.resourceTypeId, (delta.get(entry.resourceTypeId) ?? 0) + entry.amount);
    const keys = new Set([...before.keys(), ...after.keys(), ...delta.keys()]);
    for (const key of keys) {
      const expected = (before.get(key) ?? 0) + (delta.get(key) ?? 0);
      if (expected < 0 || expected !== (after.get(key) ?? 0)) throw new Error(`production receipt stock delta mismatch: ${key}`);
    }
    return deepFreeze(receipt);
  }

  static gold(value) {
    if (!value || value.kind !== 'gold-effect-receipt') throw new TypeError('gold-effect-receipt required');
    const receipt = {
      kind: 'gold-effect-receipt',
      settlementId: nonEmpty(value.settlementId, 'settlementId'),
      balanceBefore: amount(value.balanceBefore, 'balanceBefore'),
      amount: amount(value.amount, 'amount', { positive: true }),
      balanceAfter: amount(value.balanceAfter, 'balanceAfter')
    };
    if (receipt.balanceBefore + receipt.amount !== receipt.balanceAfter) throw new Error('gold receipt balance delta mismatch');
    return deepFreeze(receipt);
  }

  static productionList(values = []) {
    if (!Array.isArray(values)) throw new TypeError('production receipts must be an array');
    return this.#unique(values.map(value => this.production(value)), 'production');
  }

  static goldList(values = []) {
    if (!Array.isArray(values)) throw new TypeError('gold receipts must be an array');
    return this.#unique(values.map(value => this.gold(value)), 'gold');
  }

  static #unique(values, label) {
    const seen = new Set();
    for (const value of values) {
      if (seen.has(value.settlementId)) throw new Error(`duplicate ${label} receipt settlementId: ${value.settlementId}`);
      seen.add(value.settlementId);
    }
    values.sort((a, b) => a.settlementId.localeCompare(b.settlementId));
    return Object.freeze(values);
  }
}
