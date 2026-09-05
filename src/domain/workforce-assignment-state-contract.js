import { parseStableId } from '../world/stable-id.js';

const AVAILABILITY_STATES = Object.freeze({
  FREE: 'FREE',
  ASSIGNED: 'ASSIGNED',
  UNAVAILABLE: 'UNAVAILABLE'
});

function requirePersonId(value) {
  const parsed = parseStableId(value);
  if (!parsed || parsed.kind !== 'unit') throw new TypeError(`invalid person id: ${value}`);
  return parsed.id;
}

function requireAssignmentId(value) {
  const parsed = parseStableId(value);
  if (!parsed || parsed.kind !== 'assignment') throw new TypeError(`invalid assignment id: ${value}`);
  return parsed.id;
}

function requireAvailability(value) {
  const normalized = String(value ?? '').trim().toUpperCase();
  if (!Object.values(AVAILABILITY_STATES).includes(normalized)) {
    throw new TypeError(`invalid workforce availability: ${value}`);
  }
  return normalized;
}

function normalizeAssignmentId(availability, assignmentId) {
  if (availability === AVAILABILITY_STATES.ASSIGNED) return requireAssignmentId(assignmentId);
  if (assignmentId !== undefined && assignmentId !== null) {
    throw new TypeError(`${availability} workforce state must not own an assignment id`);
  }
  return null;
}

function defineState({ personId, availability, assignmentId = null } = {}) {
  const normalizedAvailability = requireAvailability(availability);
  return Object.freeze({
    kind: 'workforce-assignment-state',
    personId: requirePersonId(personId),
    availability: normalizedAvailability,
    assignmentId: normalizeAssignmentId(normalizedAvailability, assignmentId)
  });
}

function requireState(value) {
  if (!value || value.kind !== 'workforce-assignment-state') {
    throw new TypeError('invalid workforce assignment state');
  }
  return defineState(value);
}

export class WorkforceAssignmentStateContract {
  static get availabilityStates() {
    return AVAILABILITY_STATES;
  }

  static define({ personId, availability = AVAILABILITY_STATES.FREE, assignmentId = null } = {}) {
    return defineState({ personId, availability, assignmentId });
  }

  static assign(current, assignmentId) {
    const state = requireState(current);
    if (state.availability !== AVAILABILITY_STATES.FREE) {
      throw new Error('only FREE workforce state may accept a normal assignment');
    }
    return defineState({
      personId: state.personId,
      availability: AVAILABILITY_STATES.ASSIGNED,
      assignmentId
    });
  }

  static release(current) {
    const state = requireState(current);
    if (state.availability !== AVAILABILITY_STATES.ASSIGNED) {
      throw new Error('only ASSIGNED workforce state may release its assignment');
    }
    return defineState({ personId: state.personId, availability: AVAILABILITY_STATES.FREE });
  }

  static markUnavailable(current) {
    const state = requireState(current);
    if (state.availability !== AVAILABILITY_STATES.FREE) {
      throw new Error('only FREE workforce state may become UNAVAILABLE');
    }
    return defineState({ personId: state.personId, availability: AVAILABILITY_STATES.UNAVAILABLE });
  }

  static markFree(current) {
    const state = requireState(current);
    if (state.availability !== AVAILABILITY_STATES.UNAVAILABLE) {
      throw new Error('only UNAVAILABLE workforce state may become FREE');
    }
    return defineState({ personId: state.personId, availability: AVAILABILITY_STATES.FREE });
  }
}
