import { createBaselineMiniworldScenario } from '../diagnostics/baseline-miniworld-scenario.js';
import { AuthoritativePlacementCommitBuildingRegistrationContract } from '../domain/authoritative-placement-commit-building-registration-contract.js';
import { PlayerConstructionRuntimeAdmissionContract } from '../domain/player-construction-runtime-admission-contract.js';
import { PlayerPlacementConstructionInitializationIntegration } from '../domain/player-placement-construction-initialization-integration.js';
import { BuildingConstructionStateContract } from '../domain/building-construction-state-contract.js';
import { RuntimeConfig } from '../runtime/config.js';
import { Runtime } from '../runtime/runtime.js';

export function runIM17CSelfTest() {
  const composition = createBaselineMiniworldScenario();
  const { map, domains } = composition.authoritative;
  const committer = new AuthoritativePlacementCommitBuildingRegistrationContract({ map, domains });
  const committed = committer.commit({ definitionId: 'HQ', cellId: map.cellIdAt(0, 0) });
  const buildingCountAfterCommit = domains.buildings.size;

  const runtime = new Runtime(RuntimeConfig);
  runtime.boot();
  runtime.start();
  const admitted = PlayerConstructionRuntimeAdmissionContract.evaluate({
    runtimeState: runtime.state,
    commitResult: committed,
  });
  const initialized = PlayerPlacementConstructionInitializationIntegration.initialize(admitted);

  const runtimeBeforeRejectedInit = new Runtime(RuntimeConfig);
  runtimeBeforeRejectedInit.boot();
  const rejectedAdmission = PlayerConstructionRuntimeAdmissionContract.evaluate({
    runtimeState: runtimeBeforeRejectedInit.state,
    commitResult: committed,
  });
  let rejectedAdmissionBlocked = false;
  try {
    PlayerPlacementConstructionInitializationIntegration.initialize(rejectedAdmission);
  } catch {
    rejectedAdmissionBlocked = true;
  }

  const checks = Object.freeze({
    actualFrozenPlacementCommitConsumed:
      committed.kind === 'authoritative-placement-commit-result'
      && committed.status === 'COMMITTED'
      && initialized.sourceAdmission.source === committed,
    actualFrozenRuntimeAdmissionConsumed:
      admitted.kind === 'player-construction-runtime-admission-result'
      && admitted.status === 'ADMITTED'
      && admitted.admitted === true
      && initialized.sourceAdmission === admitted,
    sameStableBuildingIdentityPreserved:
      initialized.buildingId === committed.buildingId
      && initialized.buildingId === admitted.buildingId
      && initialized.constructionState.buildingId === committed.buildingId,
    existingConstructionStateAuthorityUsed:
      initialized.constructionState.kind === 'building-construction-state'
      && initialized.constructionState.state === BuildingConstructionStateContract.states.PENDING,
    initialStateIsPendingOnly:
      initialized.constructionState.state === 'PENDING'
      && !('progress' in initialized.constructionState),
    noSecondBuildingRegistered:
      domains.buildings.size === buildingCountAfterCommit,
    rejectedAdmissionCannotInitialize: rejectedAdmissionBlocked,
    immutableInitialization:
      Object.isFrozen(initialized)
      && Object.isFrozen(initialized.constructionState),
    noIM17DOrLaterSideEffects:
      !('demand' in initialized)
      && !('reservation' in initialized)
      && !('claim' in initialized)
      && !('transport' in initialized)
      && !('delivery' in initialized)
      && !('progress' in initialized)
      && !('completion' in initialized),
  });

  return Object.freeze({
    kind: 'im-17c-self-test-result',
    pass: Object.values(checks).every(Boolean),
    checks,
    evidence: Object.freeze({
      buildingId: initialized.buildingId,
      definitionId: initialized.definitionId,
      runtimeState: admitted.runtimeState,
      constructionState: initialized.constructionState.state,
    }),
    capabilities: Object.freeze({
      consumesFrozenIM16Commit: true,
      consumesFrozenIM17AAdmission: true,
      preservesFrozenIM17BRequirementAuthority: true,
      stableBuildingIdentityPreserved: true,
      existingConstructionStateAuthorityReused: true,
      initialConstructionStatePending: true,
      secondBuildingIdentityCreated: false,
      transportIntegration: false,
      deliverySettlement: false,
      deliveryClaimConsumeIntegration: false,
      constructionProgressAuthority: false,
      completionAuthority: false,
    }),
  });
}
