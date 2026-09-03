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

function assertJobAssignmentExecutionCargo({ job, assignment, execution, cargo }, expectedState) {
  if (!job || typeof job !== 'object' || String(job.kind || '').trim() !== 'transport-job') {
    throw new TypeError('delivery requires transport job');
  }
  const jobId = asStableRef(job.id, 'job.id', 'transport-job');
  if (String(job.status || '').trim().toUpperCase() !== 'PENDING') {
    throw new Error(`delivery requires pending transport job: ${jobId}`);
  }
  const targetId = asStableRef(job.targetId, 'job.targetId');
  const resourceId = asStableRef(job.resourceId, 'job.resourceId', 'resource');

  if (!assignment || typeof assignment !== 'object') throw new TypeError('delivery requires carrier assignment');
  const assignedJobId = asStableRef(assignment.jobId, 'assignment.jobId', 'transport-job');
  const unitId = asStableRef(assignment.unitId, 'assignment.unitId', 'unit');
  if (assignedJobId !== jobId) throw new Error(`delivery assignment mismatch: ${assignedJobId} != ${jobId}`);

  const current = TransportExecutionContract.define(execution);
  if (current.jobId !== jobId) throw new Error(`delivery execution job mismatch: ${current.jobId} != ${jobId}`);
  if (current.unitId !== unitId) throw new Error(`delivery execution carrier mismatch: ${current.unitId} != ${unitId}`);
  if (current.state !== expectedState) throw new Error(`delivery requires ${expectedState} execution state: ${current.state}`);

  if (!cargo || typeof cargo !== 'object' || String(cargo.kind || '').trim() !== 'carrier-cargo') {
    throw new TypeError('delivery requires carrier cargo');
  }
  if (asStableRef(cargo.jobId, 'cargo.jobId', 'transport-job') !== jobId) throw new Error(`delivery cargo job mismatch: ${cargo.jobId} != ${jobId}`);
  if (asStableRef(cargo.unitId, 'cargo.unitId', 'unit') !== unitId) throw new Error(`delivery cargo carrier mismatch: ${cargo.unitId} != ${unitId}`);
  if (asStableRef(cargo.resourceId, 'cargo.resourceId', 'resource') !== resourceId) throw new Error(`delivery cargo resource mismatch: ${cargo.resourceId} != ${resourceId}`);
  if (Number(cargo.amount) !== Number(job.amount)) throw new Error(`delivery cargo amount mismatch: ${cargo.amount} != ${job.amount}`);

  return { jobId, unitId, resourceId, targetId, current };
}

export class DeliveryExecutionService {
  #deliveries = new Map();

  beginDropoff({ job, assignment, execution, cargo } = {}) {
    const { current } = assertJobAssignmentExecutionCargo({ job, assignment, execution, cargo }, 'PICKED_UP');
    return deepFreeze({
      source: 'CR-06C_DELIVERY_EXECUTION',
      execution: clone(TransportExecutionContract.transition(current, 'TO_DROPOFF')),
      cargo: clone(cargo)
    });
  }

  deliver({ job, assignment, execution, cargo } = {}) {
    const { jobId, unitId, resourceId, targetId, current } = assertJobAssignmentExecutionCargo({ job, assignment, execution, cargo }, 'TO_DROPOFF');
    if (this.#deliveries.has(jobId)) throw new Error(`delivery already completed for transport job: ${jobId}`);

    const nextExecution = TransportExecutionContract.transition(current, 'DELIVERED');
    const delivery = deepFreeze({
      kind: 'delivered-cargo',
      jobId,
      unitId,
      resourceId,
      amount: Number(job.amount),
      targetId
    });
    this.#deliveries.set(jobId, delivery);

    return deepFreeze({
      source: 'CR-06C_DELIVERY_EXECUTION',
      execution: clone(nextExecution),
      delivery: clone(delivery)
    });
  }

  deliveryForJob(jobId) {
    const id = asStableRef(jobId, 'jobId', 'transport-job');
    const delivery = this.#deliveries.get(id);
    return delivery ? deepFreeze(clone(delivery)) : null;
  }

  snapshot() {
    return deepFreeze([...this.#deliveries.values()]
      .sort((a, b) => a.jobId.localeCompare(b.jobId))
      .map(delivery => clone(delivery)));
  }
}
