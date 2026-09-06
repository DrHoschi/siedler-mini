import { parseStableId } from '../world/stable-id.js';
import { BuildingStockContract } from './building-stock-contract.js';
import { BuildingStockMutationContract } from './building-stock-mutation-contract.js';
import { BuildingStockTransportReservationContract } from './building-stock-transport-reservation-contract.js';
import { WorkforceAssignmentStateContract } from './workforce-assignment-state-contract.js';
import { TransportJobContract } from '../transport/transport-job-contract.js';

function requireStableKind(value, kind, label) {
  const parsed = parseStableId(value);
  if (!parsed || parsed.kind !== kind) throw new TypeError(`invalid ${label}: ${value}`);
  return parsed.id;
}

function requirePositiveAmount(value, label) {
  const amount = Number(value);
  if (!Number.isSafeInteger(amount) || amount < 1) throw new TypeError(`${label} must be a positive safe integer`);
  return amount;
}

function normalizeDelivery(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || value.kind !== 'delivered-cargo') {
    throw new TypeError('settlement requires delivered-cargo evidence');
  }
  return Object.freeze({
    kind: 'delivered-cargo',
    jobId: requireStableKind(value.jobId, 'transport-job', 'delivery job id'),
    unitId: requireStableKind(value.unitId, 'unit', 'delivery unit id'),
    resourceId: requireStableKind(value.resourceId, 'resource', 'delivery resource id'),
    amount: requirePositiveAmount(value.amount, 'delivery amount'),
    targetId: requireStableKind(value.targetId, 'building', 'delivery target id')
  });
}

function normalizeDispatch(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || value.kind !== 'workforce-aware-transport-dispatch') {
    throw new TypeError('settlement requires frozen CR-27B dispatch');
  }

  const dispatchReservation = BuildingStockTransportReservationContract.define(value.reservation);
  const job = TransportJobContract.define(value.job);
  const personId = requireStableKind(value.workforce?.personId, 'unit', 'dispatch person id');
  const assignedState = WorkforceAssignmentStateContract.define(value.workforce?.assignedState);
  const executionJobId = requireStableKind(value.executionAssignment?.jobId, 'transport-job', 'execution assignment job id');
  const executionUnitId = requireStableKind(value.executionAssignment?.unitId, 'unit', 'execution assignment unit id');
  const assignmentId = requireStableKind(value.compatibilityRefs?.assignmentId, 'assignment', 'dispatch assignment id');

  if (assignedState.availability !== WorkforceAssignmentStateContract.availabilityStates.ASSIGNED) {
    throw new Error('dispatch workforce must be ASSIGNED');
  }
  if (assignedState.personId !== personId) throw new Error('dispatch workforce person mismatch');
  if (assignedState.assignmentId !== assignmentId) throw new Error('dispatch workforce assignment id mismatch');
  if (executionJobId !== job.id) throw new Error('dispatch execution job mismatch');
  if (executionUnitId !== personId) throw new Error('dispatch execution unit mismatch');

  if (job.definitionId !== dispatchReservation.resourceTypeId) throw new Error('dispatch job resource type mismatch');
  if (job.sourceLocation?.kind !== 'owner' || job.sourceLocation.refId !== dispatchReservation.sourceBuildingId) {
    throw new Error('dispatch job source mismatch');
  }
  if (job.targetId !== dispatchReservation.targetBuildingId) throw new Error('dispatch job target mismatch');
  if (job.amount !== dispatchReservation.amount) throw new Error('dispatch job amount mismatch');

  return Object.freeze({ dispatchReservation, job, personId, assignedState, assignmentId });
}

function sameReservation(a, b) {
  return a.id === b.id
    && a.sourceBuildingId === b.sourceBuildingId
    && a.targetBuildingId === b.targetBuildingId
    && a.resourceTypeId === b.resourceTypeId
    && a.amount === b.amount;
}

export class DeliveredTransportBuildingStockSettlement {
  static settle({ dispatch, delivery, reservation, workforceState, sourceStock, targetStock } = {}) {
    const linked = normalizeDispatch(dispatch);
    const evidence = normalizeDelivery(delivery);
    const currentReservation = BuildingStockTransportReservationContract.define(reservation);
    const currentWorkforce = WorkforceAssignmentStateContract.define(workforceState);
    const source = BuildingStockContract.define(sourceStock);
    const target = BuildingStockContract.define(targetStock);

    if (!sameReservation(currentReservation, linked.dispatchReservation)) {
      throw new Error('current reservation does not match CR-27B dispatch reservation');
    }
    if (!BuildingStockTransportReservationContract.isActive(currentReservation)) {
      throw new Error(`settlement requires ACTIVE reservation: ${currentReservation.id}`);
    }

    if (currentWorkforce.personId !== linked.personId) throw new Error('current workforce person does not match dispatch');
    if (currentWorkforce.availability !== WorkforceAssignmentStateContract.availabilityStates.ASSIGNED) {
      throw new Error('settlement requires ASSIGNED workforce state');
    }
    if (currentWorkforce.assignmentId !== linked.assignmentId) {
      throw new Error('current workforce assignment id does not match dispatch');
    }

    if (evidence.jobId !== linked.job.id) throw new Error('delivery job does not match dispatch');
    if (evidence.unitId !== linked.personId) throw new Error('delivery unit does not match dispatch person');
    if (evidence.resourceId !== linked.job.resourceId) throw new Error('delivery resource does not match dispatch job');
    if (evidence.targetId !== currentReservation.targetBuildingId) throw new Error('delivery target does not match reservation target');
    if (evidence.amount !== currentReservation.amount) throw new Error('delivery amount does not match reservation amount');

    if (source.buildingId !== currentReservation.sourceBuildingId) throw new Error('source BuildingStock building mismatch');
    if (source.resourceTypeId !== currentReservation.resourceTypeId) throw new Error('source BuildingStock resource type mismatch');
    if (target.buildingId !== currentReservation.targetBuildingId) throw new Error('target BuildingStock building mismatch');
    if (target.resourceTypeId !== currentReservation.resourceTypeId) throw new Error('target BuildingStock resource type mismatch');

    // All ownership/link validation is complete before successor values are calculated.
    // These frozen contracts are pure; if any calculation rejects, no input value is mutated.
    const nextSourceStock = BuildingStockMutationContract.remove(source, currentReservation.amount);
    const nextTargetStock = BuildingStockMutationContract.add(target, currentReservation.amount);
    const releasedReservation = BuildingStockTransportReservationContract.release(currentReservation);
    const releasedWorkforceState = WorkforceAssignmentStateContract.release(currentWorkforce);

    if (source.quantity + target.quantity !== nextSourceStock.quantity + nextTargetStock.quantity) {
      throw new Error('building stock transfer conservation invariant failed');
    }

    return Object.freeze({
      kind: 'delivered-transport-building-stock-settlement',
      jobId: linked.job.id,
      personId: linked.personId,
      amount: currentReservation.amount,
      sourceStock: nextSourceStock,
      targetStock: nextTargetStock,
      reservation: releasedReservation,
      workforceState: releasedWorkforceState,
      delivery: evidence
    });
  }
}
