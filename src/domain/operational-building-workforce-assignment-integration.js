import { OperationalBuildingWorkforceRequirementEligibilityContract } from './operational-building-workforce-requirement-eligibility-contract.js';
import { WorkforceAssignmentStateContract } from './workforce-assignment-state-contract.js';
import { parseStableId } from '../world/stable-id.js';

const STATUS = Object.freeze({
  ASSIGNED: 'ASSIGNED',
  REJECTED: 'REJECTED'
});

const REASONS = Object.freeze({
  WORKFORCE_ASSIGNED: 'WORKFORCE_ASSIGNED',
  INSUFFICIENT_ELIGIBLE_WORKFORCE: 'INSUFFICIENT_ELIGIBLE_WORKFORCE'
});

function requireAssignmentId(value) {
  const parsed = parseStableId(value);
  if (!parsed || parsed.kind !== 'assignment') {
    throw new TypeError(`invalid workforce assignment id: ${value}`);
  }
  return parsed.id;
}

function requireEligibility(value, candidates) {
  if (!value || value.kind !== 'operational-building-workforce-eligibility') {
    throw new TypeError('IM-18B workforce eligibility required');
  }

  return OperationalBuildingWorkforceRequirementEligibilityContract.evaluate({
    requirement: value.requirement,
    candidates
  });
}

function rejected(eligibility, assignmentId) {
  return Object.freeze({
    kind: 'operational-building-workforce-assignment',
    status: STATUS.REJECTED,
    reason: REASONS.INSUFFICIENT_ELIGIBLE_WORKFORCE,
    buildingId: eligibility.buildingId,
    assignmentId,
    requiredCount: eligibility.requiredCount,
    assignedCount: 0,
    eligibility,
    assignments: Object.freeze([])
  });
}

export class OperationalBuildingWorkforceAssignmentIntegration {
  static get status() {
    return STATUS;
  }

  static get reasons() {
    return REASONS;
  }

  static assign({ eligibility, candidates, assignmentId } = {}) {
    if (!Array.isArray(candidates)) throw new TypeError('current workforce candidates must be an array');
    const normalizedAssignmentId = requireAssignmentId(assignmentId);
    const currentEligibility = requireEligibility(eligibility, candidates);

    if (!currentEligibility.requirementSatisfied) {
      return rejected(currentEligibility, normalizedAssignmentId);
    }

    const selected = currentEligibility.eligibleCandidates.slice(0, currentEligibility.requiredCount);
    const assignments = selected.map(candidate => Object.freeze({
      personId: candidate.profile.personId,
      assignmentId: normalizedAssignmentId,
      profile: candidate.profile,
      previousState: candidate.state,
      assignedState: WorkforceAssignmentStateContract.assign(candidate.state, normalizedAssignmentId)
    }));

    const personIds = assignments.map(value => value.personId);
    if (new Set(personIds).size !== personIds.length) {
      throw new Error('deterministic workforce assignment produced duplicate personId');
    }

    return Object.freeze({
      kind: 'operational-building-workforce-assignment',
      status: STATUS.ASSIGNED,
      reason: REASONS.WORKFORCE_ASSIGNED,
      buildingId: currentEligibility.buildingId,
      assignmentId: normalizedAssignmentId,
      requiredCount: currentEligibility.requiredCount,
      assignedCount: assignments.length,
      eligibility: currentEligibility,
      assignments: Object.freeze(assignments)
    });
  }
}
