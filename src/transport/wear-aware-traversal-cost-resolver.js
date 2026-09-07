import { TraversalCostResolver } from './traversal-cost-resolver.js';

export const WEAR_COST_PER_UNIT = 0.01;

function normalizePosition(position) {
  const x = Number(position?.x);
  const y = Number(position?.y);
  if (!Number.isSafeInteger(x) || !Number.isSafeInteger(y)) {
    throw new TypeError('position x/y must be safe integers');
  }
  return Object.freeze({ x, y });
}

function assertWearSource(wearSource) {
  if (!wearSource || typeof wearSource.at !== 'function') {
    throw new TypeError('CR-32B wear source with at(position) required');
  }
}

function assertTypeAt(typeAt) {
  if (typeof typeAt !== 'function') throw new TypeError('typeAt must be a function');
}

export class WearAwareTraversalCostResolver {
  constructor({ profiles = {}, wearSource } = {}) {
    assertWearSource(wearSource);
    this._baseResolver = new TraversalCostResolver({ profiles });
    this._wearSource = wearSource;
    Object.freeze(this);
  }

  resolveAt(position, { typeAt } = {}) {
    assertTypeAt(typeAt);
    const point = normalizePosition(position);
    const traversalType = typeAt(point);
    const base = this._baseResolver.resolve({ traversalType });
    const wearState = this._wearSource.at(point);
    const wearUnits = (base.traversalType === 'PATH' || base.traversalType === 'ROAD')
      ? Number(wearState?.wearUnits ?? 0)
      : 0;

    if (!Number.isSafeInteger(wearUnits) || wearUnits < 0) {
      throw new TypeError('wearUnits must be a non-negative safe integer');
    }

    const wearCost = wearUnits * WEAR_COST_PER_UNIT;
    const traversalCost = base.traversalCost + wearCost;

    return Object.freeze({
      kind: 'wear-aware-traversal-cost',
      traversalType: base.traversalType,
      baseTraversalCost: base.traversalCost,
      wearUnits,
      wearCostPerUnit: WEAR_COST_PER_UNIT,
      wearCost,
      traversalCost,
      baseCost: traversalCost,
      costMultiplier: 1,
    });
  }

  costAt({ typeAt } = {}) {
    assertTypeAt(typeAt);
    return (position) => this.resolveAt(position, { typeAt });
  }
}
