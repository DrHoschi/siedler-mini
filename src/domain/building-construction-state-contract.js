import { parseStableId } from '../world/stable-id.js';

const STATES = Object.freeze({
  PENDING: 'PENDING',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED'
});

function requireBuildingId(value) {
  const parsed = parseStableId(value);
  if (!parsed || parsed.kind !== 'building') {
    throw new TypeError(`invalid building id: ${value}`);
  }
  return parsed.id;
}

function requireState(value) {
  const normalized = String(value ?? '').trim().toUpperCase();
  if (!Object.values(STATES).includes(normalized)) {
    throw new TypeError(`invalid building construction state: ${value}`);
  }
  return normalized;
}

export class BuildingConstructionStateContract {
  static get states() {
    return STATES;
  }

  static define({ buildingId, state = STATES.PENDING } = {}) {
    return Object.freeze({
      kind: 'building-construction-state',
      buildingId: requireBuildingId(buildingId),
      state: requireState(state)
    });
  }
}
