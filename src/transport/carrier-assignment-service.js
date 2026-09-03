import { parseStableId } from '../world/stable-id.js';
import { CarrierContract } from './carrier-contract.js';

function deepFreeze(value) {
  if (value == null || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function clone(value) {
  return value == null ? value : structuredClone(value);
}

function asTransportJobId(value) {
  const id = String(value || '').trim();
  const parsed = parseStableId(id);
  if (!parsed || parsed.kind !== 'transport-job') throw new TypeError(`job requires transport-job id: ${value}`);
  return id;
}

function isTerminalTransportJob(job) {
  if (!job || typeof job !== 'object') return false;
  if (String(job.kind || '').trim() !== 'transport-job') return false;
  const status = String(job.status || '').trim().toUpperCase();
  return status === 'CANCELLED' || status === 'RELEASED';
}

export class CarrierAssignmentService {
  #carriers = new Map();
  #assignments = new Map();

  constructor({ carriers = [] } = {}) {
    if (!Array.isArray(carriers)) throw new TypeError('carriers must be an array');
    for (const input of carriers) {
      const carrier = CarrierContract.define(input);
      if (this.#carriers.has(carrier.unitId)) throw new Error(`duplicate carrier unit id: ${carrier.unitId}`);
      this.#carriers.set(carrier.unitId, carrier);
    }
  }

  assign(job) {
    const jobId = asTransportJobId(job?.id);
    const existingUnitId = this.#assignments.get(jobId);
    if (existingUnitId) return this.#result(jobId, existingUnitId, false);

    const candidate = [...this.#carriers.values()]
      .filter(carrier => CarrierContract.isSuitableForJob(carrier, job))
      .sort((a, b) => a.unitId.localeCompare(b.unitId))[0];

    if (!candidate) throw new Error(`no suitable available carrier for transport job: ${jobId}`);

    const occupied = CarrierContract.define({ ...candidate, state: 'OCCUPIED' });
    this.#carriers.set(occupied.unitId, occupied);
    this.#assignments.set(jobId, occupied.unitId);
    return this.#result(jobId, occupied.unitId, true);
  }

  release(job) {
    const jobId = asTransportJobId(job?.id);
    if (!isTerminalTransportJob(job)) {
      throw new Error(`carrier assignment can only release terminal transport job: ${jobId}`);
    }

    const unitId = this.#assignments.get(jobId);
    if (!unitId) {
      return deepFreeze({
        source: 'CR-05C_CARRIER_ASSIGNMENT_RELEASE',
        jobId,
        unitId: null,
        released: false,
        carrier: null
      });
    }

    const carrier = this.#carriers.get(unitId);
    if (!carrier) throw new Error(`assigned carrier missing: ${unitId}`);

    const available = CarrierContract.define({ ...carrier, state: 'AVAILABLE' });
    this.#carriers.set(unitId, available);
    this.#assignments.delete(jobId);

    return deepFreeze({
      source: 'CR-05C_CARRIER_ASSIGNMENT_RELEASE',
      jobId,
      unitId,
      released: true,
      carrier: this.getCarrier(unitId)
    });
  }

  getCarrier(unitId) {
    const carrier = this.#carriers.get(String(unitId || '').trim());
    return carrier ? deepFreeze(clone(carrier)) : null;
  }

  carrierForJob(jobId) {
    const id = asTransportJobId(jobId);
    const unitId = this.#assignments.get(id);
    return unitId ? this.getCarrier(unitId) : null;
  }

  assignmentForJob(jobId) {
    const id = asTransportJobId(jobId);
    const unitId = this.#assignments.get(id);
    return unitId ? deepFreeze({ jobId: id, unitId }) : null;
  }

  snapshot() {
    const carriers = [...this.#carriers.values()]
      .sort((a, b) => a.unitId.localeCompare(b.unitId))
      .map(carrier => clone(carrier));
    const assignments = [...this.#assignments.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([jobId, unitId]) => ({ jobId, unitId }));
    return deepFreeze({ carriers, assignments });
  }

  #result(jobId, unitId, created) {
    return deepFreeze({
      source: 'CR-05B_CARRIER_JOB_ASSIGNMENT',
      jobId,
      unitId,
      created,
      carrier: this.getCarrier(unitId)
    });
  }
}
