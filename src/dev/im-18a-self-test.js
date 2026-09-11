import { BuildingConstructionProgressTransitionContract } from '../domain/building-construction-progress-transition-contract.js';
import { BuildingLifecycleStateContract } from '../domain/building-lifecycle-state-contract.js';
import { ConstructionCompletionIntegration } from '../domain/construction-completion-integration.js';
import { OperationalBuildingAdmissionContract } from '../domain/operational-building-admission-contract.js';

function completionFor(buildingId, complete) {
  const pending = BuildingConstructionProgressTransitionContract.define({ buildingId, progress: 0 });
  const inProgress = BuildingConstructionProgressTransitionContract.advance(pending, 0.5);
  if (!complete) {
    return ConstructionCompletionIntegration.complete({
      previousProgress: pending,
      transitions: [inProgress],
      progress: inProgress
    });
  }

  const completed = BuildingConstructionProgressTransitionContract.advance(inProgress, 1);
  return ConstructionCompletionIntegration.complete({
    previousProgress: pending,
    transitions: [inProgress, completed],
    progress: completed
  });
}

export function runIM18ASelfTest() {
  const buildingId = 'building:00000001';
  const otherBuildingId = 'building:00000002';
  const completed = completionFor(buildingId, true);
  const incomplete = completionFor(buildingId, false);
  const existing = BuildingLifecycleStateContract.define({ buildingId, state: 'EXISTS' });
  const retired = BuildingLifecycleStateContract.transition(existing, 'RETIRED');
  const otherExisting = BuildingLifecycleStateContract.define({ buildingId: otherBuildingId, state: 'EXISTS' });

  const admitted = OperationalBuildingAdmissionContract.evaluate({
    constructionCompletion: completed,
    lifecycle: existing
  });
  const incompleteRejected = OperationalBuildingAdmissionContract.evaluate({
    constructionCompletion: incomplete,
    lifecycle: existing
  });
  const retiredRejected = OperationalBuildingAdmissionContract.evaluate({
    constructionCompletion: completed,
    lifecycle: retired
  });
  const mismatchRejected = OperationalBuildingAdmissionContract.evaluate({
    constructionCompletion: completed,
    lifecycle: otherExisting
  });

  const checks = Object.freeze({
    frozenIM17CompletionRemainsAuthoritative:
      completed.kind === 'construction-completion-integration'
      && completed.completionEffective === true
      && completed.completionCount === 1,
    completedExistingBuildingAdmitted:
      admitted.status === 'ADMITTED'
      && admitted.admitted === true
      && admitted.operational === true
      && admitted.reason === 'CONSTRUCTION_COMPLETE'
      && admitted.buildingId === buildingId,
    incompleteConstructionRejected:
      incompleteRejected.status === 'REJECTED'
      && incompleteRejected.admitted === false
      && incompleteRejected.operational === false
      && incompleteRejected.reason === 'CONSTRUCTION_NOT_COMPLETE',
    retiredBuildingRejected:
      retiredRejected.status === 'REJECTED'
      && retiredRejected.reason === 'BUILDING_NOT_EXISTING',
    identityMismatchRejected:
      mismatchRejected.status === 'REJECTED'
      && mismatchRejected.reason === 'BUILDING_ID_MISMATCH',
    immutableAdmissionResults:
      [admitted, incompleteRejected, retiredRejected, mismatchRejected].every(Object.isFrozen),
    noWorkforceOrProductionIntroduced:
      [admitted, incompleteRejected, retiredRejected, mismatchRejected].every(value =>
        !('worker' in value)
        && !('workforce' in value)
        && !('recipe' in value)
        && !('inputs' in value)
        && !('outputs' in value)
        && !('stock' in value)
        && !('production' in value)
      )
  });

  return Object.freeze({
    kind: 'im-18a-self-test-result',
    pass: Object.values(checks).every(Boolean),
    checks,
    evidence: Object.freeze({
      buildingId,
      admittedReason: admitted.reason,
      incompleteReason: incompleteRejected.reason,
      retiredReason: retiredRejected.reason,
      mismatchReason: mismatchRejected.reason
    }),
    capabilities: Object.freeze({
      consumesFrozenIM17ConstructionCompletion: true,
      requiresExistingBuildingLifecycle: true,
      operationalAdmissionOnly: true,
      workforceRequirementAuthority: false,
      workforceAssignmentAuthority: false,
      productionRecipeAuthority: false,
      productionExecutionAuthority: false,
      buildingStockMutationAuthority: false,
      playerOperationalProjection: false
    })
  });
}
