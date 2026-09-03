const TRAVERSAL_TYPES = Object.freeze(['NEUTRAL', 'PATH', 'ROAD']);

function deepFreeze(value) {
  if (value == null || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function normalizeType(value) {
  const type = String(value ?? 'NEUTRAL').trim().toUpperCase();
  if (!TRAVERSAL_TYPES.includes(type)) throw new TypeError(`invalid traversal type: ${value}`);
  return type;
}

function normalizeCost(value, name) {
  const cost = Number(value);
  if (!Number.isFinite(cost) || !(cost > 0)) throw new TypeError(`${name} must be a finite number > 0`);
  return cost;
}

export class TraversalCostContract {
  static get types() { return TRAVERSAL_TYPES; }

  static define({ baseCost = 1, traversalType = 'NEUTRAL', costMultiplier = 1 } = {}) {
    const base = normalizeCost(baseCost, 'baseCost');
    const multiplier = normalizeCost(costMultiplier, 'costMultiplier');
    return deepFreeze({
      kind: 'traversal-cost',
      traversalType: normalizeType(traversalType),
      baseCost: base,
      costMultiplier: multiplier,
      traversalCost: base * multiplier
    });
  }
}
