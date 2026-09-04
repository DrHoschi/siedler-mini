const CELL_OCCUPANCY_STATES = Object.freeze(['FREE','OCCUPIED']);

function normalizeState(value) {
  const state = String(value ?? 'FREE').trim().toUpperCase();
  if (!CELL_OCCUPANCY_STATES.includes(state)) throw new TypeError(`invalid cell occupancy state: ${value}`);
  return state;
}

function normalizeCarrierId(value) {
  if (value == null) return null;
  const carrierId = String(value).trim();
  if (!carrierId) throw new TypeError('carrierId must be a non-empty string');
  return carrierId;
}

export class CellOccupancyContract {
  static get states() { return CELL_OCCUPANCY_STATES; }

  static define({ state = 'FREE', carrierId = null } = {}) {
    const normalizedState = normalizeState(state);
    const normalizedCarrierId = normalizeCarrierId(carrierId);

    if (normalizedState === 'FREE' && normalizedCarrierId !== null) {
      throw new Error('FREE cell occupancy must not have a carrierId');
    }
    if (normalizedState === 'OCCUPIED' && normalizedCarrierId === null) {
      throw new Error('OCCUPIED cell occupancy requires carrierId');
    }

    return Object.freeze({
      kind: 'cell-occupancy',
      state: normalizedState,
      occupied: normalizedState === 'OCCUPIED',
      carrierId: normalizedCarrierId
    });
  }
}
