import { parseStableId } from '../world/stable-id.js';
import { BuildingConstructionProgressTransitionContract } from './building-construction-progress-transition-contract.js';
import { BuildingStockTransportReservationContract } from './building-stock-transport-reservation-contract.js';

function requireStableKind(value, kind, label) {
  const parsed = parseStableId(value);
  if (!parsed || parsed.kind !== kind) throw new TypeError(`invalid ${label}: ${value}`);
  return parsed.id;
}

function requireRequirement(value) {
  if (!value || typeof value !== 'object' || value.kind !== 'economic-construction-requirement') {
    throw new TypeError('economic construction requirement required');
  }
  return Object.freeze({
    buildingId: requireStableKind(value.buildingId, 'building', 'construction building id'),
    demandId: requireStableKind(value.demandId, 'demand', 'construction demand id'),
    definitionId: requireStableKind(value.definitionId, 'resource-type', 'construction resource definition id')
  });
}

function requireLogistics(value, refs) {
  if (!value || typeof value !== 'object' || value.kind !== 'construction-demand-existing-logistics-integration') {
    throw new TypeError('IM-17D construction logistics result required');
  }
  if (value.status !== 'DISPATCHED_TO_EXISTING_LOGISTICS') {
    throw new Error(`construction logistics is not dispatched: ${value.status}`);
  }
  if (value.buildingId !== refs.buildingId || value.demandId !== refs.demandId || value.definitionId !== refs.definitionId) {
    throw new Error('construction logistics no longer matches requirement');
  }
  if (!Array.isArray(value.reservations) || !Array.isArray(value.transportJobs?.jobs)) {
    throw new TypeError('construction logistics reservations/jobs required');
  }
  return value;
}

function requireSettlement(value) {
  if (!value || typeof value !== 'object' || value.kind !== 'delivered-transport-building-stock-settlement') {
    throw new TypeError('authoritative delivered transport BuildingStock settlement required');
  }
  if (value.reservation?.state !== BuildingStockTransportReservationContract.states.RELEASED) {
    throw new Error('delivered material requires released settled transport reservation');
  }
  return value;
}

function sameReservationIdentity(a, b) {
  return a.id === b.id
    && a.sourceBuildingId === b.sourceBuildingId
    && a.targetBuildingId === b.targetBuildingId
    && a.resourceTypeId === b.resourceTypeId
    && a.amount === b.amount;
}

function preflightProgress(current, targetProgress, targetAmount) {
  if (targetProgress < current.progress) {
    throw new Error(`construction progress cannot exceed authoritative fulfilled material: ${current.progress} > ${targetProgress}`);
  }
  if (current.progress === 0 && targetProgress === 1) {
    const startedProgress = targetAmount > 1 ? 1 / targetAmount : 0.5;
    const started = BuildingConstructionProgressTransitionContract.advance(current, startedProgress);
    const completed = BuildingConstructionProgressTransitionContract.advance(started, 1);
    return Object.freeze([started, completed]);
  }
  return Object.freeze([BuildingConstructionProgressTransitionContract.advance(current, targetProgress)]);
}

export class DeliveredMaterialConstructionProgressSettlement {
  #demands;
  #claims;

  constructor({ demands, claims } = {}) {
    if (!demands || typeof demands.get !== 'function' || typeof demands.consumeClaim !== 'function') {
      throw new TypeError('ResourceDemands-compatible instance required');
    }
    if (!claims || typeof claims.get !== 'function') {
      throw new TypeError('ResourceClaims-compatible instance required');
    }
    this.#demands = demands;
    this.#claims = claims;
  }

  settle({ requirement, logistics, settlement, currentProgress } = {}) {
    const refs = requireRequirement(requirement);
    const dispatched = requireLogistics(logistics, refs);
    const delivered = requireSettlement(settlement);
    const current = BuildingConstructionProgressTransitionContract.define(currentProgress);
    if (current.buildingId !== refs.buildingId) throw new Error('construction progress building does not match requirement');

    const demandBefore = this.#demands.get(refs.demandId);
    if (!demandBefore) throw new TypeError(`unknown construction demand: ${refs.demandId}`);
    if (demandBefore.consumerId !== refs.buildingId || demandBefore.definitionId !== refs.definitionId) {
      throw new Error('construction requirement no longer matches authoritative demand');
    }

    const job = dispatched.transportJobs.jobs.find(value => value.id === delivered.jobId);
    if (!job) throw new Error(`settled transport job is not part of IM-17D construction logistics: ${delivered.jobId}`);
    if (job.demandId !== refs.demandId || job.targetId !== refs.buildingId || job.definitionId !== refs.definitionId) {
      throw new Error('settled transport job does not match construction requirement');
    }

    const activeReservation = dispatched.reservations.find(value => value.id === delivered.reservation.id);
    if (!activeReservation) throw new Error(`settled reservation is not part of IM-17D construction logistics: ${delivered.reservation.id}`);
    if (!sameReservationIdentity(activeReservation, delivered.reservation)) {
      throw new Error('settled reservation identity does not match IM-17D reservation');
    }
    if (delivered.amount !== job.amount || delivered.delivery?.resourceId !== job.resourceId) {
      throw new Error('settled delivery amount/resource does not match construction transport job');
    }
    if (delivered.targetStock?.buildingId !== refs.buildingId || delivered.targetStock?.resourceTypeId !== refs.definitionId) {
      throw new Error('settled target BuildingStock does not match construction requirement');
    }

    const claim = this.#claims.get(job.claimId);
    if (!claim || claim.state !== 'ACTIVE') throw new Error(`construction delivery requires active claim: ${job.claimId}`);
    if (claim.demandId !== refs.demandId || claim.consumerId !== refs.buildingId || claim.resourceId !== job.resourceId || claim.amount !== delivered.amount) {
      throw new Error('construction delivery claim invariant failed');
    }

    const prospectiveFulfilled = demandBefore.fulfilledAmount + claim.amount;
    if (prospectiveFulfilled > demandBefore.targetAmount) throw new Error('construction delivery exceeds target demand');
    const targetProgress = prospectiveFulfilled / demandBefore.targetAmount;
    const transitions = preflightProgress(current, targetProgress, demandBefore.targetAmount);
    const nextProgress = transitions[transitions.length - 1];

    this.#demands.consumeClaim(claim.id);
    const demandAfter = this.#demands.get(refs.demandId);
    if (demandAfter.fulfilledAmount !== prospectiveFulfilled) {
      throw new Error('construction demand fulfillment did not settle expected delivered amount');
    }
    if (demandAfter.fulfilledAmount / demandAfter.targetAmount !== nextProgress.progress) {
      throw new Error('construction progress no longer matches authoritative fulfilled material');
    }

    return Object.freeze({
      kind: 'delivered-material-construction-progress-settlement',
      buildingId: refs.buildingId,
      demandId: refs.demandId,
      definitionId: refs.definitionId,
      claimId: claim.id,
      settledAmount: delivered.amount,
      demandBefore,
      demandAfter,
      previousProgress: current,
      progress: nextProgress,
      transitions,
      sourceSettlement: delivered
    });
  }
}
