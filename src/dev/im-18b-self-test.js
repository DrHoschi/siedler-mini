import { BuildingConstructionProgressTransitionContract } from '../domain/building-construction-progress-transition-contract.js';
import { BuildingLifecycleStateContract } from '../domain/building-lifecycle-state-contract.js';
import { ConstructionCompletionIntegration } from '../domain/construction-completion-integration.js';
import { OperationalBuildingAdmissionContract } from '../domain/operational-building-admission-contract.js';
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

function candidate(personId, specialization, capabilities, availability = 'FREE') {
  const state = availability === 'ASSIGNED'
    ? WorkforceAssignmentStateContract.define({ personId, availability, assignmentId: 'assignment:00000001' })
    : WorkforceAssignmentStateContract.define({ personId, availability });
  return Object.freeze({
    profile: PersonWorkforceProfileContract.define({ personId, specialization, capabilities }),
    state
  });
}

export function runIM18BSelfTest() {
  const buildingId = 'building:00000001';
  const admission = operationalAdmission(buildingId);
  const requirement = OperationalBuildingWorkforceRequirementEligibilityContract.defineRequirement({
    operationalAdmission: admission,
    count: 2,
    requiredSpecialization: 'LUMBERJACK',
    requiredCapabilities: ['CAN_MOVE', 'CAN_LUMBERJACK']
  });

  const eligibleB = candidate('unit:00000002', 'LUMBERJACK', ['CAN_LUMBERJACK', 'CAN_MOVE']);
  const eligibleA = candidate('unit:00000001', 'LUMBERJACK', ['CAN_MOVE', 'CAN_LUMBERJACK']);
  const assigned = candidate('unit:00000003', 'LUMBERJACK', ['CAN_MOVE', 'CAN_LUMBERJACK'], 'ASSIGNED');
  const wrongSpecialization = candidate('unit:00000004', 'BUILDER', ['CAN_MOVE', 'CAN_BUILD']);
  const missingCapability = candidate('unit:00000005', 'LUMBERJACK', ['CAN_MOVE']);

  const eligibility = OperationalBuildingWorkforceRequirementEligibilityContract.evaluate({
    requirement,
    candidates: [eligibleB, assigned, wrongSpecialization, missingCapability, eligibleA]
  });

  const insufficient = OperationalBuildingWorkforceRequirementEligibilityContract.evaluate({
    requirement,
    candidates: [eligibleA, assigned, wrongSpecialization, missingCapability]
  });

  const checks = Object.freeze({
    frozenIM18AAdmissionReused:
      admission.kind === 'operational-building-admission'
      && admission.admitted === true
      && admission.operational === true,
    workforceRequirementDefined:
      requirement.kind === 'operational-building-workforce-requirement'
      && requirement.buildingId === buildingId
      && requirement.count === 2
      && requirement.requiredSpecialization === 'LUMBERJACK'
      && requirement.requiredCapabilities.join(',') === 'CAN_LUMBERJACK,CAN_MOVE',
    existingEligiblePersonsDetectedDeterministically:
      eligibility.eligibleCount === 2
      && eligibility.requirementSatisfied === true
      && eligibility.eligiblePersonIds.join(',') === 'unit:00000001,unit:00000002',
    assignedPersonNotEligible:
      !eligibility.eligiblePersonIds.includes('unit:00000003'),
    specializationAndCapabilityRequired:
      !eligibility.eligiblePersonIds.includes('unit:00000004')
      && !eligibility.eligiblePersonIds.includes('unit:00000005'),
    insufficientEligibilityReportedWithoutAssignment:
      insufficient.eligibleCount === 1
      && insufficient.requirementSatisfied === false,
    immutableReadOnlyResults:
      Object.isFrozen(requirement)
      && Object.isFrozen(eligibility)
      && Object.isFrozen(eligibility.eligiblePersonIds)
      && Object.isFrozen(eligibility.eligibleCandidates),
    noAssignmentOrProductionIntroduced:
      !('assignmentId' in requirement)
      && !('assignedPersonId' in eligibility)
      && !('assignedState' in eligibility)
      && !('recipe' in eligibility)
      && !('inputs' in eligibility)
      && !('outputs' in eligibility)
      && !('production' in eligibility)
      && eligibleA.state.availability === 'FREE'
      && eligibleB.state.availability === 'FREE'
  });

  return Object.freeze({
    kind: 'im-18b-self-test-result',
    pass: Object.values(checks).every(Boolean),
    checks,
    evidence: Object.freeze({
      buildingId,
      requiredCount: requirement.count,
      requiredSpecialization: requirement.requiredSpecialization,
      eligiblePersonIds: eligibility.eligiblePersonIds,
      insufficientEligibleCount: insufficient.eligibleCount
    }),
    capabilities: Object.freeze({
      consumesFrozenIM18AOperationalAdmission: true,
      workforceRequirementDefined: true,
      existingPersonEligibilityDefined: true,
      deterministicEligibilityOrdering: true,
      workforceAssignmentAuthority: false,
      productionRecipeAuthority: false,
      productionExecutionAuthority: false,
      buildingStockMutationAuthority: false
    })
  });
}
