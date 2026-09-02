import { parseStableId } from '../world/stable-id.js';

const TRANSPORT_JOB_STATES = Object.freeze(['PENDING']);
const SOURCE_KINDS = Object.freeze(['cell', 'owner']);

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
  if (!Number.isSafeInteger(n) || n < 1) throw new TypeError('transport job amount must be a positive safe integer');
  return n;
}

function normalizeStatus(value) {
  const status = String(value || '').trim().toUpperCase();
  if (!TRANSPORT_JOB_STATES.includes(status)) throw new TypeError(`invalid transport job status: ${value}`);
  return status;
}

function normalizeSourceLocation(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError('transport job sourceLocation must be an object');
  }
  const kind = String(value.kind || '').trim().toLowerCase();
  if (!SOURCE_KINDS.includes(kind)) throw new TypeError(`invalid transport job source kind: ${value.kind}`);
  const refId = asStableRef(value.refId, 'sourceLocation.refId');
  return deepFreeze({ kind, refId });
}

function sameLocation(a, b) {
  return !!a && !!b && a.kind === b.kind && a.refId === b.refId;
}

export class TransportJobContract {
  static get states() { return TRANSPORT_JOB_STATES; }
  static get sourceKinds() { return SOURCE_KINDS; }

  static define({
    id,
    claimId,
    demandId,
    resourceId,
    definitionId,
    sourceLocation,
    targetId,
    amount,
    status = 'PENDING'
  } = {}) {
    return deepFreeze({
      id: asStableRef(id, 'id', 'transport-job'),
      kind: 'transport-job',
      claimId: asStableRef(claimId, 'claimId', 'claim'),
      demandId: asStableRef(demandId, 'demandId', 'demand'),
      resourceId: asStableRef(resourceId, 'resourceId', 'resource'),
      definitionId: asStableRef(definitionId, 'definitionId', 'resource-type'),
      sourceLocation: clone(normalizeSourceLocation(sourceLocation)),
      targetId: asStableRef(targetId, 'targetId'),
      amount: asPositiveAmount(amount),
      status: normalizeStatus(status)
    });
  }

  static validateLinks(job, { claim, demand, resource } = {}) {
    const record = this.define(job);
    if (!claim || typeof claim !== 'object') throw new TypeError('claim required for transport job validation');
    if (!demand || typeof demand !== 'object') throw new TypeError('demand required for transport job validation');
    if (!resource || typeof resource !== 'object') throw new TypeError('resource required for transport job validation');

    if (claim.id !== record.claimId) throw new Error(`transport job claim mismatch: ${record.claimId}`);
    if (claim.state !== 'ACTIVE') throw new Error(`transport job requires active claim: ${record.claimId}`);
    if (claim.demandId !== record.demandId) throw new Error(`transport job demand does not match claim: ${record.demandId}`);
    if (claim.resourceId !== record.resourceId) throw new Error(`transport job resource does not match claim: ${record.resourceId}`);
    if (claim.consumerId !== record.targetId) throw new Error(`transport job target does not match claim consumer: ${record.targetId}`);
    if (claim.amount !== record.amount) throw new Error(`transport job amount does not match reserved claim: ${record.claimId}`);

    if (demand.id !== record.demandId) throw new Error(`transport job demand mismatch: ${record.demandId}`);
    if (demand.consumerId !== record.targetId) throw new Error(`transport job target does not match demand consumer: ${record.targetId}`);
    if (demand.definitionId !== record.definitionId) throw new Error(`transport job definition does not match demand: ${record.definitionId}`);
    if (!['PARTIAL', 'RESERVED'].includes(demand.status)) {
      throw new Error(`transport job demand is not transportable: ${record.demandId}`);
    }

    if (resource.id !== record.resourceId) throw new Error(`transport job resource mismatch: ${record.resourceId}`);
    if (resource.definitionId !== record.definitionId) throw new Error(`transport job definition does not match resource: ${record.definitionId}`);
    if (resource.state !== 'RESERVED') throw new Error(`transport job resource is not reserved: ${record.resourceId}`);
    if (!sameLocation(resource.location, record.sourceLocation)) {
      throw new Error(`transport job source does not match resource location: ${record.resourceId}`);
    }

    return record;
  }
}
