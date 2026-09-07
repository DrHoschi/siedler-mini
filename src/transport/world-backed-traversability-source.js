import { TraversabilityContract } from './traversability-contract.js';

function requireMap(map) {
  if (!map || typeof map.contains !== 'function' || typeof map.cellIdAt !== 'function' || typeof map.snapshot !== 'function') {
    throw new TypeError('MapStructure-compatible map required');
  }
  return map;
}

function requireBuildingSource(domains) {
  const buildings = domains?.buildings;
  if (!buildings || typeof buildings.snapshot !== 'function') {
    throw new TypeError('current building domain store required');
  }
  return buildings;
}

function normalizeGridPosition(position) {
  const x = Number(position?.x);
  const y = Number(position?.y);
  if (!Number.isSafeInteger(x) || !Number.isSafeInteger(y)) {
    throw new TypeError('position x/y must be safe integers');
  }
  return Object.freeze({ x, y });
}

function finitePosition(record) {
  const x = Number(record?.position?.x);
  const y = Number(record?.position?.y);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  return Object.freeze({ x, y });
}

function buildingExists(record) {
  return String(record?.lifecycle?.state ?? 'EXISTS').trim().toUpperCase() === 'EXISTS';
}

function worldToGrid(mapSnapshot, position) {
  const map = mapSnapshot?.map;
  const originX = Number(map?.origin?.x);
  const originY = Number(map?.origin?.y);
  const cellSize = Number(map?.cellSize);
  if (!Number.isFinite(originX) || !Number.isFinite(originY) || !Number.isFinite(cellSize) || !(cellSize > 0)) {
    throw new TypeError('map snapshot requires finite origin and positive cellSize');
  }
  return Object.freeze({
    x: Math.floor((position.x - originX) / cellSize),
    y: Math.floor((position.y - originY) / cellSize),
  });
}

export class WorldBackedTraversabilitySource {
  #map;
  #buildings;

  constructor({ map, domains } = {}) {
    this.#map = requireMap(map);
    this.#buildings = requireBuildingSource(domains);
  }

  #blockedCellIds() {
    const mapSnapshot = this.#map.snapshot();
    const buildingSnapshot = this.#buildings.snapshot();
    const items = buildingSnapshot?.items ?? {};
    const blocked = new Set();

    for (const buildingId of Object.keys(items).sort()) {
      const record = items[buildingId];
      if (!buildingExists(record)) continue;
      const position = finitePosition(record);
      if (!position) continue;
      const grid = worldToGrid(mapSnapshot, position);
      if (!this.#map.contains(grid.x, grid.y)) continue;
      const cellId = this.#map.cellIdAt(grid.x, grid.y);
      if (cellId) blocked.add(cellId);
    }
    return blocked;
  }

  stateAt(position) {
    const point = normalizeGridPosition(position);
    if (!this.#map.contains(point.x, point.y)) {
      throw new RangeError(`cell outside map: ${point.x},${point.y}`);
    }
    const cellId = this.#map.cellIdAt(point.x, point.y);
    const state = this.#blockedCellIds().has(cellId) ? 'BLOCKED' : 'TRAVERSABLE';
    return TraversabilityContract.define({ state }).state;
  }

  isTraversable(position) {
    return TraversabilityContract.define({ state: this.stateAt(position) }).traversable;
  }

  entries() {
    const blocked = this.#blockedCellIds();
    return Object.freeze(
      [...blocked]
        .sort()
        .map(cellId => Object.freeze({ cellId, state: 'BLOCKED' }))
    );
  }
}
