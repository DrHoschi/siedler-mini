import { BuildingConstructionProgressTransitionContract } from '../domain/building-construction-progress-transition-contract.js';
import { ConstructionCompletionIntegration } from '../domain/construction-completion-integration.js';

function rejects(fn) {
  try { fn(); return false; } catch { return true; }
}

export function runIM17FSelfTest() {
  const buildingId = 'building:00000001';
  const pending = BuildingConstructionProgressTransitionContract.define({ buildingId, progress: 0 });
  const partial = BuildingConstructionProgressTransitionContract.advance(pending, 1 / 3);
  const complete = BuildingConstructionProgressTransitionContract.advance(partial, 1);

  const partialResult = ConstructionCompletionIntegration.complete({
    previousProgress: pending,
    transitions: [partial],
    progress: partial
  });

  const completionResult = ConstructionCompletionIntegration.complete({
    previousProgress: partial,
    transitions: [complete],
    progress: complete
  });

  const im17eStyleResult = ConstructionCompletionIntegration.complete({
    previousProgress: pending,
    transitions: [partial, complete],
    progress: complete
  });

  const wrongBuilding = BuildingConstructionProgressTransitionContract.define({
    buildingId: 'building:00000002',
    progress: 1 / 3
  });

  const checks = Object.freeze({
    incompleteProgressDoesNotCrossCompletionBoundary:
      partialResult.completionEffective === false
      && partialResult.completionCount === 0
      && partialResult.completion === null,
    completedProgressUsesExistingCompletionBoundaryExactlyOnce:
      completionResult.completionEffective === true
      && completionResult.completionCount === 1
      && completionResult.completion?.kind === 'building-construction-completion'
      && completionResult.completion.constructionComplete === true,
    frozenIM17EStyleTransitionSequenceProducesSingleCompletion:
      im17eStyleResult.completionEffective === true
      && im17eStyleResult.completionCount === 1
      && im17eStyleResult.transitions.length === 2
      && im17eStyleResult.transitions[0].state === 'IN_PROGRESS'
      && im17eStyleResult.transitions[1].state === 'COMPLETED',
    stableBuildingIdentityPreserved:
      completionResult.buildingId === buildingId
      && completionResult.progress.buildingId === buildingId
      && completionResult.completion.buildingId === buildingId,
    malformedOrCrossBuildingSequencesRejected:
      rejects(() => ConstructionCompletionIntegration.complete({ previousProgress: pending, transitions: [], progress: partial }))
      && rejects(() => ConstructionCompletionIntegration.complete({ previousProgress: pending, transitions: [wrongBuilding], progress: wrongBuilding })),
    completedPredecessorCannotBecomeEffectiveAgain:
      rejects(() => ConstructionCompletionIntegration.complete({ previousProgress: complete, transitions: [complete], progress: complete })),
    noLifecycleWorkforceOrProductionSideEffects:
      !('lifecycle' in completionResult)
      && !('workforce' in completionResult)
      && !('production' in completionResult)
      && typeof ConstructionCompletionIntegration.assignWorker === 'undefined'
      && typeof ConstructionCompletionIntegration.startProduction === 'undefined'
      && typeof ConstructionCompletionIntegration.transitionLifecycle === 'undefined'
  });

  return Object.freeze({
    kind: 'im-17f-self-test-result',
    pass: Object.values(checks).every(Boolean),
    checks,
    evidence: Object.freeze({
      buildingId,
      previousState: partial.state,
      finalState: complete.state,
      finalProgress: complete.progress,
      completionEffective: completionResult.completionEffective,
      completionCount: completionResult.completionCount
    }),
    capabilities: Object.freeze({
      frozenIM17EProgressConsumed: true,
      existingConstructionCompletionBoundaryReused: true,
      stableBuildingIdentityPreserved: true,
      lifecycleMutation: false,
      workforceAssignment: false,
      productionStart: false,
      im17gImplemented: false
    })
  });
}
