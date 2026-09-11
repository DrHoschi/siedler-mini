import { BuildingConstructionProgressTransitionContract } from '../domain/building-construction-progress-transition-contract.js';
import { BuildingLifecycleStateContract } from '../domain/building-lifecycle-state-contract.js';
import { ConstructionCompletionIntegration } from '../domain/construction-completion-integration.js';
import { OperationalBuildingAdmissionContract } from '../domain/operational-building-admission-contract.js';
import { OperationalBuildingWorkforceAssignmentIntegration } from '../domain/operational-building-workforce-assignment-integration.js';
import { OperationalBuildingWorkforceRequirementEligibilityContract } from '../domain/operational-building-workforce-requirement-eligibility-contract.js';
import { PersonWorkforceProfileContract } from '../domain/person-workforce-profile-contract.js';
import { WorkforceAssignmentStateContract } from '../domain/workforce-assignment-state-contract.js';

function operationalAdmission(buildingId) {
  const pending = BuildingConstructionProgressTransitionContract.define({ buildingId, progress: 0 });
  const inProgress = BuildingConstructionProgressTransitionContract.advance(pending, 0.5);
  const completed = BuildingConstructionProgressTransitionContract.advance(inProgress, 1);
  const completion = ConstructionCompletionIntegration.complete({
    previousProgress: pending,
    transitions: [inProgress, completed],
    progress: completed
  });
  const lifecycle = BuildingLifecycleStateContract.define({ buildingId, state: 'EXISTS' });
  return OperationalBuildingAdmissionContract.evaluate({ constructionCompletion: completion, lifecycle });
}

function candidate(personId, availability = 'FREE', assignmentId = null) {
  return Object.freeze({
    profile: PersonWorkforceProfileContract.define({
      personId,
      specialization: 'LUMBERJACK',
      capabilities: ['CAN_MOVE', 'CAN_LUMBERJACK']
    }),
    state: WorkforceAssignmentStateContract.define({ personId, availability, assignmentId })
  });
}

function withAssignedStates(candidates, assignmentResult) {
  const assignedByPerson = new Map(assignmentResult.assignments.map(value => [value.personId, value.assignedState]));
  return candidates.map(value => Object.freeze({
    profile: value.profile,
    state: assignedByPerson.get(value.profile.personId) ?? value.state
  }));
}

export function runIM18CSelfTest() {
  const buildingId = 'building:00000001';
  const admission = operationalAdmission(buildingId);
  const requirement = OperationalBuildingWorkforceRequirementEligibilityContract.defineRequirement({
    operationalAdmission: admission,
    count: 2,
    requiredSpecialization: 'LUMBERJACK',
    requiredCapabilities: ['CAN_MOVE', 'CAN_LUMBERJACK']
  });

  const candidates = [
    candidate('unit:00000003'),
    candidate('unit:00000001'),
    candidate('unit:00000002')
  ];
  const eligibility = OperationalBuildingWorkforceRequirementEligibilityContract.evaluate({ requirement, candidates });
  const assignment = OperationalBuildingWorkforceAssignmentIntegration.assign({
    eligibility,
    candidates,
    assignmentId: 'assignment:00000018'
  });

  const updatedCandidates = withAssignedStates(candidates, assignment);
  const retry = OperationalBuildingWorkforceAssignmentIntegration.assign({
    eligibility,
    candidates: updatedCandidates,
    assignmentId: 'assignment:00000019'
  });

  const preAssignedCandidates = [
    candidate('unit:00000001', 'ASSIGNED', 'assignment:00000017'),
    candidate('unit:00000002'),
    candidate('unit:00000003')
  ];
  const preAssignedEligibility = OperationalBuildingWorkforceRequirementEligibilityContract.evaluate({
    requirement,
    candidates: preAssignedCandidates
  });
  const reassignmentGuard = OperationalBuildingWorkforceAssignmentIntegration.assign({
    eligibility: preAssignedEligibility,
    candidates: preAssignedCandidates,
    assignmentId: 'assignment:00000020'
  });

  const checks = Object.freeze({
    frozenIM18BEligibilityReused:
      eligibility.kind === 'operational-building-workforce-eligibility'
      && eligibility.requirementSatisfied === true
      && eligibility.eligiblePersonIds.join(',') === 'unit:00000001,unit:00000002,unit:00000003',
    deterministicRequiredCountAssigned:
      assignment.status === 'ASSIGNED'
      && assignment.reason === 'WORKFORCE_ASSIGNED'
      && assignment.assignedCount === 2
      && assignment.requiredCount === 2
      && assignment.assignments.map(value => value.personId).join(',') === 'unit:00000001,unit:00000002',
    existingAssignmentStateAuthorityUsed:
      assignment.assignments.every(value =>
        value.previousState.availability === 'FREE'
        && value.assignedState.availability === 'ASSIGNED'
        && value.assignedState.assignmentId === 'assignment:00000018'
      ),
    retryCannotDoubleAssignSameWorkers:
      retry.status === 'REJECTED'
      && retry.reason === 'INSUFFICIENT_ELIGIBLE_WORKFORCE'
      && retry.assignedCount === 0
      && retry.eligibility.eligiblePersonIds.join(',') === 'unit:00000003',
    preAssignedWorkerNeverReassigned:
      reassignmentGuard.status === 'ASSIGNED'
      && reassignmentGuard.assignments.map(value => value.personId).join(',') === 'unit:00000002,unit:00000003'
      && !reassignmentGuard.assignments.some(value => value.personId === 'unit:00000001'),
    immutableAssignmentResults:
      Object.isFrozen(assignment)
      && Object.isFrozen(assignment.assignments)
      && assignment.assignments.every(value => Object.isFrozen(value) && Object.isFrozen(value.assignedState))
      && Object.isFrozen(retry),
    noProductionIntroduced:
      [assignment, retry, reassignmentGuard].every(value =>
        !('recipe' in value)
        && !('inputs' in value)
        && !('outputs' in value)
        && !('stock' in value)
        && !('production' in value)
      )
  });

  return Object.freeze({
    kind: 'im-18c-self-test-result',
    pass: Object.values(checks).every(Boolean),
    checks,
    evidence: Object.freeze({
      buildingId,
      assignmentId: assignment.assignmentId,
      assignedPersonIds: Object.freeze(assignment.assignments.map(value => value.personId)),
      retryEligiblePersonIds: retry.eligibility.eligiblePersonIds,
      reassignmentGuardPersonIds: Object.freeze(reassignmentGuard.assignments.map(value => value.personId))
    }),
    capabilities: Object.freeze({
      consumesFrozenIM18BEligibility: true,
      deterministicWorkforceAssignment: true,
      existingAssignmentStateAuthorityUsed: true,
      duplicateWorkerAssignmentPrevented: true,
      productionRecipeAuthority: false,
      productionExecutionAuthority: false,
      buildingStockMutationAuthority: false
    })
  });
}
