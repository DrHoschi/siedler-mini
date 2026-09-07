function normalizeCell(position) {
  const x = Number(position?.x);
  const y = Number(position?.y);
  if (!Number.isSafeInteger(x) || !Number.isSafeInteger(y)) {
    throw new TypeError('enteredCell x/y must be safe integers');
  }
  return Object.freeze({ x, y });
}

function sameCell(a, b) {
  return a?.x === b?.x && a?.y === b?.y;
}

function assertCompletedStep(stepMovement) {
  if (!stepMovement || stepMovement.kind !== 'reservation-controlled-step-movement') {
    throw new TypeError('CR-32B requires CR-21C reservation-controlled-step-movement input');
  }
  if (stepMovement.status !== 'COMPLETED') {
    throw new Error('wear may only be recorded from COMPLETED real step movement');
  }
  if (typeof stepMovement.carrierId !== 'string' || stepMovement.carrierId.length === 0) {
    throw new TypeError('completed step movement requires carrierId');
  }
  const enteredCell = normalizeCell(stepMovement.enteredCell);
  if (stepMovement.lifecycleState?.status !== 'CONSUMED') {
    throw new Error('completed CR-21C step must consume its reservation');
  }
  if (stepMovement.movement?.state !== 'IDLE' || !sameCell(stepMovement.movement?.currentPosition, enteredCell)) {
    throw new Error('completed CR-21C step movement must end exactly at enteredCell');
  }
  if (stepMovement.blocking?.blocks !== false || stepMovement.readyForNextIntent !== true) {
    throw new Error('completed CR-21C step must release blocking and be ready for next intent');
  }
  return Object.freeze({ carrierId: stepMovement.carrierId, enteredCell });
}

function assertMap(map) {
  if (!map || typeof map.contains !== 'function' || typeof map.cellIdAt !== 'function') {
    throw new TypeError('MapStructure-compatible map required');
  }
}

function assertClassificationSource(classification) {
  const classAt = classification?.classAt ?? classification?.typeAt;
  if (typeof classAt !== 'function') {
    throw new TypeError('world-backed path classification source required');
  }
  return classAt.bind(classification);
}

export class DeterministicPathUsageWearIntegration {
  #map;
  #classAt;
  #stateByCellId = new Map();

  constructor({ map, classification } = {}) {
    assertMap(map);
    this.#map = map;
    this.#classAt = assertClassificationSource(classification);
  }

  recordCompletedStep(stepMovement) {
    const step = assertCompletedStep(stepMovement);
    if (!this.#map.contains(step.enteredCell.x, step.enteredCell.y)) {
      throw new RangeError(`entered cell outside map: ${step.enteredCell.x},${step.enteredCell.y}`);
    }

    const cellId = this.#map.cellIdAt(step.enteredCell.x, step.enteredCell.y);
    const traversalType = this.#classAt(step.enteredCell);

    if (traversalType !== 'PATH' && traversalType !== 'ROAD') {
      return Object.freeze({
        kind: 'path-usage-wear-update',
        status: 'IGNORED',
        reason: 'NEUTRAL_CELL',
        carrierId: step.carrierId,
        cellId,
        enteredCell: step.enteredCell,
        traversalType,
        usageCount: 0,
        wearUnits: 0,
      });
    }

    const previous = this.#stateByCellId.get(cellId);
    const usageCount = (previous?.usageCount ?? 0) + 1;
    const wearUnits = usageCount;
    const state = Object.freeze({
      cellId,
      traversalType,
      usageCount,
      wearUnits,
    });
    this.#stateByCellId.set(cellId, state);

    return Object.freeze({
      kind: 'path-usage-wear-update',
      status: 'ACCUMULATED',
      carrierId: step.carrierId,
      enteredCell: step.enteredCell,
      ...state,
    });
  }

  at(position) {
    const point = normalizeCell(position);
    if (!this.#map.contains(point.x, point.y)) {
      throw new RangeError(`cell outside map: ${point.x},${point.y}`);
    }
    const cellId = this.#map.cellIdAt(point.x, point.y);
    const traversalType = this.#classAt(point);
    const existing = this.#stateByCellId.get(cellId);
    return Object.freeze({
      cellId,
      traversalType,
      usageCount: existing?.usageCount ?? 0,
      wearUnits: existing?.wearUnits ?? 0,
    });
  }

  entries() {
    return Object.freeze([...this.#stateByCellId.values()]
      .sort((a, b) => a.cellId.localeCompare(b.cellId)));
  }
}
