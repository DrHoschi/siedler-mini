import { TraversalCostContract } from './traversal-cost-contract.js';

function normalizeType(value) {
  return TraversalCostContract.define({ traversalType:value }).traversalType;
}

function normalizePosition(position) {
  const x = Number(position?.x);
  const y = Number(position?.y);
  if (!Number.isSafeInteger(x) || !Number.isSafeInteger(y)) {
    throw new TypeError('position x/y must be safe integers');
  }
  return Object.freeze({ x, y });
}

function keyOf({ x, y }) {
  return `${x},${y}`;
}

export class TraversalClassificationSource {
  #map;
  #typesByCell = new Map();

  constructor({ map } = {}) {
    if (!map || typeof map.contains !== 'function' || typeof map.cellIdAt !== 'function') {
      throw new TypeError('MapStructure-compatible map required');
    }
    this.#map = map;
  }

  classify(position, traversalType = 'NEUTRAL') {
    const point = normalizePosition(position);
    if (!this.#map.contains(point.x, point.y)) throw new RangeError(`cell outside map: ${point.x},${point.y}`);
    const type = normalizeType(traversalType);
    const cellId = this.#map.cellIdAt(point.x, point.y);
    if (type === 'NEUTRAL') this.#typesByCell.delete(cellId);
    else this.#typesByCell.set(cellId, type);
    return Object.freeze({ cellId, position:point, traversalType:type });
  }

  typeAt(position) {
    const point = normalizePosition(position);
    if (!this.#map.contains(point.x, point.y)) throw new RangeError(`cell outside map: ${point.x},${point.y}`);
    const cellId = this.#map.cellIdAt(point.x, point.y);
    return this.#typesByCell.get(cellId) ?? 'NEUTRAL';
  }

  clear(position) {
    return this.classify(position, 'NEUTRAL');
  }

  entries() {
    const out = [];
    for (const [cellId, traversalType] of this.#typesByCell.entries()) {
      out.push(Object.freeze({ cellId, traversalType }));
    }
    return Object.freeze(out);
  }
}
