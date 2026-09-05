import { parseStableId } from '../world/stable-id.js';

const SPECIALIZATIONS = Object.freeze({
  GENERAL_RESIDENT: 'GENERAL_RESIDENT',
  CARRIER: 'CARRIER',
  BUILDER: 'BUILDER',
  LUMBERJACK: 'LUMBERJACK',
  QUARRY_WORKER: 'QUARRY_WORKER',
  FISHER: 'FISHER',
  HUNTER: 'HUNTER'
});

const CAPABILITIES = Object.freeze({
  CAN_MOVE: 'CAN_MOVE',
  CAN_SIMPLE_TRANSPORT: 'CAN_SIMPLE_TRANSPORT',
  CAN_BUILD: 'CAN_BUILD',
  CAN_LUMBERJACK: 'CAN_LUMBERJACK',
  CAN_QUARRY: 'CAN_QUARRY',
  CAN_FISH: 'CAN_FISH',
  CAN_HUNT: 'CAN_HUNT'
});

const SPECIALIZATION_VALUES = new Set(Object.values(SPECIALIZATIONS));
const CAPABILITY_VALUES = new Set(Object.values(CAPABILITIES));

function requirePersonId(value) {
  const parsed = parseStableId(value);
  if (!parsed || parsed.kind !== 'unit') throw new TypeError(`invalid person id: ${value}`);
  return parsed.id;
}

function requireSpecialization(value) {
  const normalized = String(value ?? '').trim().toUpperCase();
  if (!SPECIALIZATION_VALUES.has(normalized)) {
    throw new TypeError(`invalid workforce specialization: ${value}`);
  }
  return normalized;
}

function requireCapabilities(values) {
  if (!Array.isArray(values) || values.length === 0) {
    throw new TypeError('workforce capabilities must be a non-empty array');
  }

  const normalized = values.map(value => String(value ?? '').trim().toUpperCase());
  if (normalized.some(value => !CAPABILITY_VALUES.has(value))) {
    throw new TypeError('invalid workforce capability');
  }

  return Object.freeze([...new Set(normalized)].sort((a, b) => a.localeCompare(b)));
}

export class PersonWorkforceProfileContract {
  static get specializations() {
    return SPECIALIZATIONS;
  }

  static get capabilities() {
    return CAPABILITIES;
  }

  static define({ personId, specialization, capabilities } = {}) {
    return Object.freeze({
      kind: 'person-workforce-profile',
      personId: requirePersonId(personId),
      specialization: requireSpecialization(specialization),
      capabilities: requireCapabilities(capabilities)
    });
  }
}
