function deepFreeze(value) {
  if (value == null || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

const RESULT_REASON = Object.freeze({
  VALID: 'VALID',
  TARGET_CELL_NOT_FOUND: 'TARGET_CELL_NOT_FOUND',
  TARGET_CELL_OCCUPIED: 'TARGET_CELL_OCCUPIED',
});

function requireDefinitionId(value) {
  const normalized = String(value ?? '').trim();
  if (!normalized) throw new TypeError('building definition id required');
  return normalized;
}

function requireCellId(value) {
  const normalized = String(value ?? '').trim();
  if (!normalized) throw new TypeError('placement target cell id required');
  return normalized;
}

function requireMap(map) {
  if (!map || typeof map.snapshot !== 'function') {
    throw new TypeError('MapStructure-compatible map required');
  }
  return map;
}

function requireBuildingStore(domains) {
  const buildings = domains?.buildings;
  if (!buildings || typeof buildings.snapshot !== 'function') {
    throw new TypeError('current building domain store required');
  }
  return buildings;
}

function finitePosition(record) {
  const x = Number(record?.position?.x);
  const y = Number(record?.position?.y);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  return Object.freeze({ x, y });
}

function existingBuilding(record) {
  return String(record?.lifecycle?.state ?? 'EXISTS').trim().toUpperCase() === 'EXISTS';
}

function worldToGrid(mapRecord, position) {
  const originX = Number(mapRecord?.origin?.x);
  const originY = Number(mapRecord?.origin?.y);
  const cellSize = Number(mapRecord?.cellSize);
  if (!Number.isFinite(originX) || !Number.isFinite(originY) || !Number.isFinite(cellSize) || !(cellSize > 0)) {
    throw new TypeError('map snapshot requires finite origin and positive cellSize');
  }
  return Object.freeze({
    x: Math.floor((position.x - originX) / cellSize),
    y: Math.floor((position.y - originY) / cellSize),
  });
}

function targetCellFromSnapshot(snapshot, cellId) {
  return (snapshot?.cells ?? []).find(cell => cell?.id === cellId) ?? null;
}

export class AuthoritativeConstructionPlacementContract {
  #map;
  #buildings;

  constructor({ map, domains } = {}) {
    this.#map = requireMap(map);
    this.#buildings = requireBuildingStore(domains);
  }

  evaluate({ definitionId, cellId } = {}) {
    const candidate = Object.freeze({
      definitionId: requireDefinitionId(definitionId),
      cellId: requireCellId(cellId),
    });

    const mapSnapshot = this.#map.snapshot();
    const targetCell = targetCellFromSnapshot(mapSnapshot, candidate.cellId);
    if (!targetCell) {
      return deepFreeze({
        kind: 'authoritative-construction-placement-evaluation',
        valid: false,
        reason: RESULT_REASON.TARGET_CELL_NOT_FOUND,
        candidate,
        cell: null,
      });
    }

    const buildingSnapshot = this.#buildings.snapshot();
    const items = buildingSnapshot?.items ?? {};
    let occupiedByBuildingId = null;

    for (const buildingId of Object.keys(items).sort()) {
      const record = items[buildingId];
      if (!existingBuilding(record)) continue;
      const position = finitePosition(record);
      if (!position) continue;
      const grid = worldToGrid(mapSnapshot.map, position);
      const occupiedCellId = this.#map.cellIdAt?.(grid.x, grid.y) ?? null;
      if (occupiedCellId === candidate.cellId) {
        occupiedByBuildingId = buildingId;
        break;
      }
    }

    const cell = Object.freeze({
      cellId: targetCell.id,
      grid: Object.freeze({ x: targetCell.grid.x, y: targetCell.grid.y }),
      world: Object.freeze({ x: targetCell.world.x, y: targetCell.world.y }),
    });

    if (occupiedByBuildingId) {
      return deepFreeze({
        kind: 'authoritative-construction-placement-evaluation',
        valid: false,
        reason: RESULT_REASON.TARGET_CELL_OCCUPIED,
        candidate,
        cell,
        occupiedBy: Object.freeze({ kind: 'building', id: occupiedByBuildingId }),
      });
    }

    return deepFreeze({
      kind: 'authoritative-construction-placement-evaluation',
      valid: true,
      reason: RESULT_REASON.VALID,
      candidate,
      cell,
      occupiedBy: null,
    });
  }

  static get reasons() {
    return RESULT_REASON;
  }
}
