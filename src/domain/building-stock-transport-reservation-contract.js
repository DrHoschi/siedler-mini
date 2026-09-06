import { parseStableId } from '../world/stable-id.js';

const STATES = Object.freeze({
  ACTIVE: 'ACTIVE',
  RELEASED: 'RELEASED'
});

function requireStableKind(value, kind, label) {
  const parsed = parseStableId(value);
  if (!parsed || parsed.kind !== kind) throw new TypeError(`invalid ${label}: ${value}`);
  return parsed.id;
}

function requireAmount(value) {
  const amount = Number(value);
  if (!Number.isSafeInteger(amount) || amount < 1) {
    throw new TypeError('transport reservation amount must be a positive safe integer');
  }
  return amount;
}

function requireState(value) {
  const state = String(value ?? '').trim().toUpperCase();
  if (!Object.values(STATES).includes(state)) {
    throw new TypeError(`invalid transport reservation state: ${value}`);
  }
  return state;
}

export class BuildingStockTransportReservationContract {
  static get states() {
    return STATES;
  }

  static define({
    id,
    sourceBuildingId,
    targetBuildingId,
    resourceTypeId,
    amount,
    state = STATES.ACTIVE
  } = {}) {
    return Object.freeze({
      kind: 'building-stock-transport-reservation',
      id: requireStableKind(id, 'transport-reservation', 'transport reservation id'),
      sourceBuildingId: requireStableKind(sourceBuildingId, 'building', 'source building id'),
      targetBuildingId: requireStableKind(targetBuildingId, 'building', 'target building id'),
      resourceTypeId: requireStableKind(resourceTypeId, 'resource-type', 'resource type id'),
      amount: requireAmount(amount),
      state: requireState(state)
    });
  }

  static isActive(value) {
    return this.define(value).state === STATES.ACTIVE;
  }

  static release(value) {
    const current = this.define(value);
    if (current.state !== STATES.ACTIVE) {
      throw new Error(`transport reservation is not active: ${current.id}`);
    }
    return this.define({ ...current, state: STATES.RELEASED });
  }
}
