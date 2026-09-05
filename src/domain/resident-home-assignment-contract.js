import { parseStableId } from '../world/stable-id.js';

const HOME_STATES = Object.freeze({
  UNASSIGNED: 'UNASSIGNED',
  ASSIGNED: 'ASSIGNED'
});

function requirePersonId(value) {
  const parsed = parseStableId(value);
  if (!parsed || parsed.kind !== 'unit') throw new TypeError(`invalid person id: ${value}`);
  return parsed.id;
}

function requireBuildingId(value) {
  const parsed = parseStableId(value);
  if (!parsed || parsed.kind !== 'building') throw new TypeError(`invalid home building id: ${value}`);
  return parsed.id;
}

function normalizeState(value) {
  const state = String(value ?? '').trim().toUpperCase();
  if (!Object.values(HOME_STATES).includes(state)) throw new TypeError(`invalid home assignment state: ${value}`);
  return state;
}

export class ResidentHomeAssignmentContract {
  static get states() {
    return HOME_STATES;
  }

  static define({ personId, state = HOME_STATES.UNASSIGNED, homeBuildingId = null } = {}) {
    const normalizedPersonId = requirePersonId(personId);
    const normalizedState = normalizeState(state);

    if (normalizedState === HOME_STATES.UNASSIGNED) {
      if (homeBuildingId != null) throw new TypeError('UNASSIGNED resident cannot reference a home building');
      return Object.freeze({
        kind: 'resident-home-assignment',
        personId: normalizedPersonId,
        state: HOME_STATES.UNASSIGNED,
        homeBuildingId: null
      });
    }

    return Object.freeze({
      kind: 'resident-home-assignment',
      personId: normalizedPersonId,
      state: HOME_STATES.ASSIGNED,
      homeBuildingId: requireBuildingId(homeBuildingId)
    });
  }
}
