import { parseStableId } from '../world/stable-id.js';

const TRANSPORT_EXECUTION_STATES = Object.freeze([
  'TO_PICKUP',
  'PICKED_UP',
  'TO_DROPOFF',
  'DELIVERED'
]);

const ALLOWED_TRANSITIONS = Object.freeze({
  TO_PICKUP: Object.freeze(['PICKED_UP']),
  PICKED_UP: Object.freeze(['TO_DROPOFF']),
  TO_DROPOFF: Object.freeze(['DELIVERED']),
  DELIVERED: Object.freeze([])
});

function deepFreeze(value) {
  if (value == null || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function asStableRef(value, name, expectedKind) {
  const id = String(value || '').trim();
  const parsed = parseStableId(id);
  if (!parsed || parsed.kind !== expectedKind) throw new TypeError(`${name} requires ${expectedKind} id: ${value}`);
  return id;
}

function normalizeState(value) {
  const state = String(value || '').trim().toUpperCase();
  if (!TRANSPORT_EXECUTION_STATES.includes(state)) {
    throw new TypeError(`invalid transport execution state: ${value}`);
  }
  return state;
}

function assertAssignedPendingJob(job, assignment) {
  if (!job || typeof job !== 'object' || Array.isArray(job)) {
    throw new TypeError('transport execution requires transport job');
  }
  const jobId = asStableRef(job.id, 'job.id', 'transport-job');
  if (String(job.kind || '').trim() !== 'transport-job') {
    throw new TypeError(`transport execution requires transport-job kind: ${job.kind}`);
  }
  if (String(job.status || '').trim().toUpperCase() !== 'PENDING') {
    throw new Error(`transport execution requires pending transport job: ${jobId}`);
  }

  if (!assignment || typeof assignment !== 'object' || Array.isArray(assignment)) {
    throw new TypeError('transport execution requires carrier assignment');
  }
  const assignedJobId = asStableRef(assignment.jobId, 'assignment.jobId', 'transport-job');
  const unitId = asStableRef(assignment.unitId, 'assignment.unitId', 'unit');
  if (assignedJobId !== jobId) {
    throw new Error(`transport execution assignment mismatch: ${assignedJobId} != ${jobId}`);
  }

  return { jobId, unitId };
}

export class TransportExecutionContract {
  static get states() { return TRANSPORT_EXECUTION_STATES; }
  static get transitions() { return ALLOWED_TRANSITIONS; }

  static canTransition(from, to) {
    const current = normalizeState(from);
    const next = normalizeState(to);
    return ALLOWED_TRANSITIONS[current].includes(next);
  }

  static assertTransition(from, to) {
    if (!this.canTransition(from, to)) {
      throw new Error(`invalid transport execution transition: ${from} -> ${to}`);
    }
    return normalizeState(to);
  }

  static begin(job, assignment) {
    const { jobId, unitId } = assertAssignedPendingJob(job, assignment);
    return deepFreeze({
      kind: 'transport-execution',
      jobId,
      unitId,
      state: 'TO_PICKUP'
    });
  }

  static define({ jobId, unitId, state = 'TO_PICKUP' } = {}) {
    return deepFreeze({
      kind: 'transport-execution',
      jobId: asStableRef(jobId, 'jobId', 'transport-job'),
      unitId: asStableRef(unitId, 'unitId', 'unit'),
      state: normalizeState(state)
    });
  }

  static transition(execution, to) {
    if (!execution || typeof execution !== 'object' || Array.isArray(execution)) {
      throw new TypeError('transport execution record required');
    }
    if (String(execution.kind || '').trim() !== 'transport-execution') {
      throw new TypeError(`invalid transport execution kind: ${execution.kind}`);
    }
    const current = this.define(execution);
    const nextState = this.assertTransition(current.state, to);
    return this.define({ ...current, state: nextState });
  }
}
