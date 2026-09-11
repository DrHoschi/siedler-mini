import { BuildingConstructionProgressTransitionContract } from '../domain/building-construction-progress-transition-contract.js';
import { ConstructionCompletionIntegration } from '../domain/construction-completion-integration.js';
import { projectPlayerConstructionState } from '../ui/player-construction-state-projection.js';

function requirement({
  buildingId = 'building:00000001',
  demandId = 'demand:00000001',
  definitionId = 'resource-type:00000001',
  targetAmount = 3,
  reservedAmount = 0,
  fulfilledAmount = 0,
  remainingAmount = targetAmount - reservedAmount - fulfilledAmount,
  status = 'OPEN'
} = {}) {
  return Object.freeze({
    kind: 'economic-construction-requirement',
    buildingId,
    demandId,
    definitionId,
    targetAmount,
    reservedAmount,
    fulfilledAmount,
    remainingAmount,
    status
  });
}

function rejects(fn) {
  try { fn(); return false; } catch { return true; }
}

export function runIM17GSelfTest() {
  const buildingId = 'building:00000001';
  const pending = BuildingConstructionProgressTransitionContract.define({ buildingId, progress: 0 });
  const partial = BuildingConstructionProgressTransitionContract.advance(pending, 1 / 3);
  const completed = BuildingConstructionProgressTransitionContract.advance(partial, 1);
  const completion = ConstructionCompletionIntegration.complete({
    previousProgress: partial,
    transitions: [completed],
    progress: completed
  });

  const waiting = projectPlayerConstructionState({
    requirement: requirement({ reservedAmount: 1, fulfilledAmount: 0, remainingAmount: 2, status: 'RESERVED' }),
    progress: pending
  });
  const underConstruction = projectPlayerConstructionState({
    requirement: requirement({ fulfilledAmount: 1, remainingAmount: 2, status: 'PARTIAL' }),
    progress: partial
  });
  const done = projectPlayerConstructionState({
    requirement: requirement({ fulfilledAmount: 3, remainingAmount: 0, status: 'FULFILLED' }),
    progress: completed,
    completion
  });

  const checks = Object.freeze({
    waitingForMaterialComesOnlyFromAuthoritativePendingState:
      waiting.status === 'WAITING_FOR_MATERIAL'
      && waiting.progress === 0
      && waiting.reservedAmount === 1
      && waiting.fulfilledAmount === 0
      && waiting.remainingAmount === 2
      && waiting.demandStatus === 'RESERVED',
    underConstructionUsesExistingProgressTruth:
      underConstruction.status === 'UNDER_CONSTRUCTION'
      && underConstruction.progress === 1 / 3
      && underConstruction.constructionState === 'IN_PROGRESS'
      && underConstruction.fulfilledAmount === 1,
    completedRequiresFrozenIM17FCompletion:
      done.status === 'COMPLETED'
      && done.progress === 1
      && done.constructionState === 'COMPLETED'
      && done.completionEffective === true
      && done.sources.completion === completion,
    stableIdentityAndDemandVocabularyPreserved:
      waiting.buildingId === buildingId
      && underConstruction.buildingId === buildingId
      && done.buildingId === buildingId
      && done.demandId === 'demand:00000001'
      && done.definitionId === 'resource-type:00000001'
      && done.targetAmount === 3,
    completedProgressWithoutCompletionAuthorityRejected:
      rejects(() => projectPlayerConstructionState({
        requirement: requirement({ fulfilledAmount: 3, remainingAmount: 0, status: 'FULFILLED' }),
        progress: completed
      })),
    mismatchedFulfillmentOrBuildingIdentityRejected:
      rejects(() => projectPlayerConstructionState({
        requirement: requirement({ fulfilledAmount: 1, remainingAmount: 2 }),
        progress: pending
      }))
      && rejects(() => projectPlayerConstructionState({
        requirement: requirement({ buildingId: 'building:00000002' }),
        progress: pending
      })),
    projectionIsImmutableAndReadOnly:
      Object.isFrozen(waiting)
      && Object.isFrozen(waiting.sources)
      && Object.isFrozen(done)
      && !('admit' in done)
      && !('reserve' in done)
      && !('deliver' in done)
      && !('advance' in done)
      && !('complete' in done)
      && !('assignWorker' in done)
      && !('produce' in done)
  });

  return Object.freeze({
    kind: 'im-17g-self-test-result',
    pass: Object.values(checks).every(Boolean),
    checks,
    evidence: Object.freeze({ waiting, underConstruction, completed: done }),
    capabilities: Object.freeze({
      authoritativeRequirementProjection: true,
      authoritativeProgressProjection: true,
      frozenIM17FCompletionProjection: true,
      uiTruthAuthority: false,
      workforceIntegration: false,
      productionIntegration: false,
      wholeBlockGateExecuted: false
    })
  });
}
