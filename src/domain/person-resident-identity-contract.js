import { parseStableId } from '../world/stable-id.js';

const EXISTENCE_STATES = Object.freeze({
  EXISTS: 'EXISTS'
});

function requirePersonId(value) {
  const parsed = parseStableId(value);
  if (!parsed || parsed.kind !== 'unit') {
    throw new TypeError(`invalid person id: ${value}`);
  }
  return parsed.id;
}

function requireExistenceState(value) {
  const normalized = String(value ?? '').trim().toUpperCase();
  if (normalized !== EXISTENCE_STATES.EXISTS) {
    throw new TypeError(`invalid person existence state: ${value}`);
  }
  return normalized;
}

export class PersonResidentIdentityContract {
  static get existenceStates() {
    return EXISTENCE_STATES;
  }

  static define({ personId, existenceState = EXISTENCE_STATES.EXISTS } = {}) {
    return Object.freeze({
      kind: 'person-resident-identity',
      personId: requirePersonId(personId),
      existenceState: requireExistenceState(existenceState)
    });
  }
}
