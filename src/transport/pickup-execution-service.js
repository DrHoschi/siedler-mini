import { parseStableId } from '../world/stable-id.js';
import { TransportExecutionContract } from './transport-execution-contract.js';

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

function sameLocation(a, b) {
  return !!a && !!b && a.kind === b.kind && a.refId === b.refId;
}

export class PickupExecutionService {
  #cargoByJob = new Map();
  #jobByResource = new Map();

  pickup({ job, assignment, execution, resource } = {}) {
    if (!job || typeof job !== 'object' || String(job.kind || '').trim() !== 'transport-job') {
      throw new TypeError('pickup requires transport job');
    }
    const jobId = asStableRef(job.id, 'job.id', 'transport-job');
    if (String(job.status || '').trim().toUpperCase() !== 'PENDING') {
      throw new Error(`pickup requires pending transport job: ${jobId}`);
    }

    if (!assignment || typeof assignment !== 'object') throw new TypeError('pickup requires carrier assignment');
    const assignedJobId = asStableRef(assignment.jobId, 'assignment.jobId', 'transport-job');
    const unitId = asStableRef(assignment.unitId, 'assignment.unitId', 'unit');
    if (assignedJobId !== jobId) throw new Error(`pickup assignment mismatch: ${assignedJobId} != ${jobId}`);

    const current = TransportExecutionContract.define(execution);
    if (current.jobId !== jobId) throw new Error(`pickup execution job mismatch: ${current.jobId} != ${jobId}`);
    if (current.unitId !== unitId) throw new Error(`pickup execution carrier mismatch: ${current.unitId} != ${unitId}`);
    if (current.state !== 'TO_PICKUP') throw new Error(`pickup requires TO_PICKUP execution state: ${current.state}`);

    if (!resource || typeof resource !== 'object') throw new TypeError('pickup requires reserved resource');
    const resourceId = asStableRef(resource.id, 'resource.id', 'resource');
    if (resourceId !== asStableRef(job.resourceId, 'job.resourceId', 'resource')) {
      throw new Error(`pickup resource mismatch: ${resourceId} != ${job.resourceId}`);
    }
    if (String(resource.state || '').trim().toUpperCase() !== 'RESERVED') {
      throw new Error(`pickup requires reserved resource: ${resourceId}`);
    }
    if (resource.definitionId !== job.definitionId) {
      throw new Error(`pickup resource definition mismatch: ${resourceId}`);
    }
    if (!sameLocation(resource.location, job.sourceLocation)) {
      throw new Error(`pickup resource is not at transport source: ${resourceId}`);
    }
    if (Number(resource.amount) < Number(job.amount)) {
      throw new Error(`pickup resource amount below transport amount: ${resourceId}`);
    }

    const existingJobId = this.#jobByResource.get(resourceId);
    if (existingJobId && existingJobId !== jobId) {
      throw new Error(`resource already carried by another transport job: ${resourceId}`);
    }
    if (this.#cargoByJob.has(jobId)) throw new Error(`pickup already completed for transport job: ${jobId}`);

    const nextExecution = TransportExecutionContract.transition(current, 'PICKED_UP');
    const cargo = deepFreeze({
      kind: 'carrier-cargo',
      jobId,
      unitId,
      resourceId,
      amount: Number(job.amount)
    });

    this.#cargoByJob.set(jobId, cargo);
    this.#jobByResource.set(resourceId, jobId);

    return deepFreeze({
      source: 'CR-06B_PICKUP_EXECUTION',
      execution: clone(nextExecution),
      cargo: clone(cargo)
    });
  }

  cargoForJob(jobId) {
    const id = asStableRef(jobId, 'jobId', 'transport-job');
    const cargo = this.#cargoByJob.get(id);
    return cargo ? deepFreeze(clone(cargo)) : null;
  }

  cargoForResource(resourceId) {
    const id = asStableRef(resourceId, 'resourceId', 'resource');
    const jobId = this.#jobByResource.get(id);
    return jobId ? this.cargoForJob(jobId) : null;
  }

  snapshot() {
    return deepFreeze([...this.#cargoByJob.values()]
      .sort((a, b) => a.jobId.localeCompare(b.jobId))
      .map(cargo => clone(cargo)));
  }
}
