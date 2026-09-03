import { TraversalCostContract } from './traversal-cost-contract.js';

function normalizeType(value) {
  return TraversalCostContract.define({traversalType:value}).traversalType;
}

function profileTable(profiles = {}) {
  const table = new Map();
  for (const type of TraversalCostContract.types) {
    const source = profiles[type] ?? profiles[type.toLowerCase()] ?? { traversalType:type };
    const contract = TraversalCostContract.define({ ...source, traversalType:type });
    table.set(type, contract);
  }
  return table;
}

export class TraversalCostResolver {
  constructor({ profiles = {} } = {}) {
    this._profiles = profileTable(profiles);
    Object.freeze(this);
  }

  resolve({ traversalType = 'NEUTRAL' } = {}) {
    return this._profiles.get(normalizeType(traversalType));
  }

  costAt({ typeAt } = {}) {
    if (typeof typeAt !== 'function') throw new TypeError('typeAt must be a function');
    return (position) => this.resolve({ traversalType:typeAt(Object.freeze({x:position.x,y:position.y})) });
  }
}
