import { parseStableId } from '../world/stable-id.js';

const STATES = Object.freeze({
  EXISTS: 'EXISTS',
  RETIRED: 'RETIRED'
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
    throw new TypeError(`invalid building lifecycle state: ${value}`);
  }
  return normalized;
}

export class BuildingLifecycleStateContract {
  static get states() {
    return STATES;
  }

  static define({ buildingId, state = STATES.EXISTS } = {}) {
    return Object.freeze({
      kind: 'building-lifecycle-state',
      buildingId: requireBuildingId(buildingId),
      state: requireState(state)
    });
  }

  static transition(current, nextState) {
    const value = this.define(current);
    const next = requireState(nextState);
    if (value.state !== STATES.EXISTS || next !== STATES.RETIRED) {
      throw new TypeError(`building lifecycle transition not allowed: ${value.state} -> ${next}`);
    }
    return this.define({ buildingId: value.buildingId, state: next });
  }
}
