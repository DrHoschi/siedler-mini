import { parseStableId } from '../world/stable-id.js';

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

function asPositiveAmount(value) {
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n < 1) throw new TypeError('settlement amount must be a positive safe integer');
  return n;
}

export class DeliverySettlementContract {
  static define({ jobId, executionJobId, unitId, resourceId, claimId, demandId, targetId, amount } = {}) {
    return deepFreeze({
      kind: 'delivery-settlement',
      jobId: asStableRef(jobId, 'jobId', 'transport-job'),
      executionJobId: asStableRef(executionJobId, 'executionJobId', 'transport-job'),
      unitId: asStableRef(unitId, 'unitId', 'unit'),
      resourceId: asStableRef(resourceId, 'resourceId', 'resource'),
      claimId: asStableRef(claimId, 'claimId', 'claim'),
      demandId: asStableRef(demandId, 'demandId', 'demand'),
      targetId: asStableRef(targetId, 'targetId'),
      amount: asPositiveAmount(amount)
    });
  }

  static fromDelivered({ job, execution, delivery, claim, demand, resource } = {}) {
    this.assertSettleable({ job, execution, delivery, claim, demand, resource });
    return this.define({
      jobId: job.id,
      executionJobId: execution.jobId,
      unitId: execution.unitId,
      resourceId: resource.id,
      claimId: claim.id,
      demandId: demand.id,
      targetId: job.targetId,
      amount: job.amount
    });
  }

  static assertSettleable({ job, execution, delivery, claim, demand, resource } = {}) {
    if (!job || String(job.kind || '') !== 'transport-job') throw new TypeError('settlement requires transport job');
    const jobId = asStableRef(job.id, 'job.id', 'transport-job');
    if (String(job.status || '').toUpperCase() !== 'PENDING') throw new Error(`settlement requires pending transport job: ${jobId}`);

    if (!execution || String(execution.kind || '') !== 'transport-execution') throw new TypeError('settlement requires transport execution');
    if (String(execution.state || '').toUpperCase() !== 'DELIVERED') throw new Error(`settlement requires DELIVERED execution: ${jobId}`);
    if (execution.jobId !== jobId) throw new Error(`settlement execution job mismatch: ${execution.jobId} != ${jobId}`);

    if (!delivery || String(delivery.kind || '') !== 'delivered-cargo') throw new TypeError('settlement requires delivered cargo');
    if (delivery.jobId !== jobId) throw new Error(`settlement delivery job mismatch: ${delivery.jobId} != ${jobId}`);
    if (delivery.unitId !== execution.unitId) throw new Error(`settlement carrier mismatch: ${delivery.unitId} != ${execution.unitId}`);
    if (delivery.resourceId !== job.resourceId) throw new Error(`settlement delivery resource mismatch: ${delivery.resourceId} != ${job.resourceId}`);
    if (delivery.targetId !== job.targetId) throw new Error(`settlement target mismatch: ${delivery.targetId} != ${job.targetId}`);
    if (Number(delivery.amount) !== Number(job.amount)) throw new Error(`settlement delivery amount mismatch: ${delivery.amount} != ${job.amount}`);

    if (!claim || String(claim.kind || '') !== 'claim') throw new TypeError('settlement requires claim');
    if (claim.id !== job.claimId) throw new Error(`settlement claim mismatch: ${claim.id} != ${job.claimId}`);
    if (claim.state !== 'ACTIVE') throw new Error(`settlement requires active claim: ${claim.id}`);
    if (claim.resourceId !== job.resourceId) throw new Error(`settlement claim resource mismatch: ${claim.resourceId} != ${job.resourceId}`);
    if (claim.demandId !== job.demandId) throw new Error(`settlement claim demand mismatch: ${claim.demandId} != ${job.demandId}`);
    if (claim.consumerId !== job.targetId) throw new Error(`settlement claim consumer mismatch: ${claim.consumerId} != ${job.targetId}`);
    if (Number(claim.amount) !== Number(job.amount)) throw new Error(`settlement claim amount mismatch: ${claim.amount} != ${job.amount}`);

    if (!demand || String(demand.kind || '') !== 'demand') throw new TypeError('settlement requires demand');
    if (demand.id !== job.demandId) throw new Error(`settlement demand mismatch: ${demand.id} != ${job.demandId}`);
    if (demand.consumerId !== job.targetId) throw new Error(`settlement demand consumer mismatch: ${demand.consumerId} != ${job.targetId}`);
    if (demand.definitionId !== job.definitionId) throw new Error(`settlement demand definition mismatch: ${demand.definitionId} != ${job.definitionId}`);
    if (!['PARTIAL', 'RESERVED'].includes(String(demand.status || '').toUpperCase())) throw new Error(`settlement demand is not settleable: ${demand.id}`);

    if (!resource || String(resource.kind || '') !== 'resource') throw new TypeError('settlement requires resource');
    if (resource.id !== job.resourceId) throw new Error(`settlement resource mismatch: ${resource.id} != ${job.resourceId}`);
    if (resource.definitionId !== job.definitionId) throw new Error(`settlement resource definition mismatch: ${resource.definitionId} != ${job.definitionId}`);
    if (String(resource.state || '').toUpperCase() !== 'RESERVED') throw new Error(`settlement requires reserved resource: ${resource.id}`);
    if (Number(resource.amount) < Number(job.amount)) throw new Error(`settlement resource amount below job amount: ${resource.id}`);

    return true;
  }
}
