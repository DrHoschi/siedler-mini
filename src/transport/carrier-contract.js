import { parseStableId } from '../world/stable-id.js';

const CARRIER_STATES = Object.freeze(['AVAILABLE', 'OCCUPIED']);
const LOCATION_KINDS = Object.freeze(['cell', 'owner']);

function clone(value) {
  return value == null ? value : structuredClone(value);
}

function deepFreeze(value) {
  if (value == null || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function asStableRef(value, name, expectedKind = null) {
  const id = String(value || '').trim();
  const parsed = parseStableId(id);
  if (!parsed) throw new TypeError(`${name} requires stable id: ${value}`);
  if (expectedKind && parsed.kind !== expectedKind) throw new TypeError(`${name} requires ${expectedKind} id: ${value}`);
  return id;
}

function asPositiveCapacity(value) {
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n < 1) throw new TypeError('carrier capacity must be a positive safe integer');
  return n;
}

function normalizeState(value) {
  const state = String(value || '').trim().toUpperCase();
  if (!CARRIER_STATES.includes(state)) throw new TypeError(`invalid carrier state: ${value}`);
  return state;
}

function normalizeLocation(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError('carrier location must be an object');
  }
  const kind = String(value.kind || '').trim().toLowerCase();
  if (!LOCATION_KINDS.includes(kind)) throw new TypeError(`invalid carrier location kind: ${value.kind}`);
  return deepFreeze({ kind, refId: asStableRef(value.refId, 'location.refId') });
}

export class CarrierContract {
  static get states() { return CARRIER_STATES; }
  static get locationKinds() { return LOCATION_KINDS; }

  static define({ unitId, capacity, state = 'AVAILABLE', location } = {}) {
    return deepFreeze({
      unitId: asStableRef(unitId, 'unitId', 'unit'),
      kind: 'carrier',
      capacity: asPositiveCapacity(capacity),
      state: normalizeState(state),
      location: clone(normalizeLocation(location))
    });
  }

  static isSuitableForJob(carrier, job) {
    const record = this.define(carrier);
    if (!job || typeof job !== 'object') return false;
    if (record.state !== 'AVAILABLE') return false;
    if (String(job.kind || '').trim() !== 'transport-job') return false;
    if (String(job.status || '').trim().toUpperCase() !== 'PENDING') return false;
    const amount = Number(job.amount);
    if (!Number.isSafeInteger(amount) || amount < 1) return false;
    return amount <= record.capacity;
  }

  static assertSuitableForJob(carrier, job) {
    const record = this.define(carrier);
    if (!this.isSuitableForJob(record, job)) {
      throw new Error(`carrier is not suitable for transport job: ${record.unitId}`);
    }
    return record;
  }
}
