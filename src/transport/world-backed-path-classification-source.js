import { TraversalCostContract } from './traversal-cost-contract.js';

function normalizePosition(position) {
  const x = Number(position?.x);
  const y = Number(position?.y);
  if (!Number.isSafeInteger(x) || !Number.isSafeInteger(y)) {
    throw new TypeError('position x/y must be safe integers');
  }
  return Object.freeze({ x, y });
}

function normalizeType(value) {
  return TraversalCostContract.define({ traversalType: value ?? 'NEUTRAL' }).traversalType;
}

function assertMap(map) {
  if (!map || typeof map.contains !== 'function' || typeof map.cellAt !== 'function' || typeof map.cellIds !== 'function') {
    throw new TypeError('MapStructure-compatible map required');
  }
}

function assertWorld(world) {
  if (!world || typeof world.get !== 'function') {
    throw new TypeError('WorldStore-compatible world required');
  }
}

export class WorldBackedPathClassificationSource {
  #map;
  #world;

  constructor({ map, world } = {}) {
    assertMap(map);
    assertWorld(world);
    this.#map = map;
    this.#world = world;
  }

  typeAt(position) {
    const point = normalizePosition(position);
    if (!this.#map.contains(point.x, point.y)) {
      throw new RangeError(`cell outside map: ${point.x},${point.y}`);
    }

    const cell = this.#map.cellAt(point.x, point.y);
    if (!cell || cell.kind !== 'cell') throw new Error(`missing world cell: ${point.x},${point.y}`);

    const tile = this.#world.get(cell.tileId);
    if (!tile || tile.kind !== 'tile') throw new Error(`missing world tile: ${cell.tileId}`);

    return normalizeType(tile.traversalType ?? 'NEUTRAL');
  }

  // Compatibility alias for consumers that use classAt(...) terminology.
  classAt(position) {
    return this.typeAt(position);
  }

  entries() {
    const out = [];
    for (const cellId of this.#map.cellIds()) {
      const cell = this.#world.get(cellId);
      if (!cell || cell.kind !== 'cell') throw new Error(`missing world cell: ${cellId}`);
      const tile = this.#world.get(cell.tileId);
      if (!tile || tile.kind !== 'tile') throw new Error(`missing world tile: ${cell.tileId}`);
      const traversalType = normalizeType(tile.traversalType ?? 'NEUTRAL');
      if (traversalType !== 'NEUTRAL') out.push(Object.freeze({ cellId, traversalType }));
    }
    out.sort((a, b) => a.cellId.localeCompare(b.cellId));
    return Object.freeze(out);
  }
}
