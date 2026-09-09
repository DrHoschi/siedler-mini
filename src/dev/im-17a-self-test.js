import { createBaselineMiniworldScenario } from '../diagnostics/baseline-miniworld-scenario.js';
import { AuthoritativePlacementCommitBuildingRegistrationContract } from '../domain/authoritative-placement-commit-building-registration-contract.js';
import { PlayerConstructionRuntimeAdmissionContract } from '../domain/player-construction-runtime-admission-contract.js';
import { RuntimeConfig } from '../runtime/config.js';
import { Runtime } from '../runtime/runtime.js';

export function runIM17ASelfTest() {
  const composition = createBaselineMiniworldScenario();
  const { map, domains } = composition.authoritative;
  const committer = new AuthoritativePlacementCommitBuildingRegistrationContract({ map, domains });
  const freeCellId = map.cellIdAt(0, 0);
  const occupiedCellId = map.cellIdAt(2, 2);
  const committed = committer.commit({ definitionId: 'HQ', cellId: freeCellId });
  const rejected = committer.commit({ definitionId: 'STOREHOUSE', cellId: occupiedCellId });
  const buildingCountAfterFrozenCommit = domains.buildings.size;

  const runtime = new Runtime(RuntimeConfig);
  const created = PlayerConstructionRuntimeAdmissionContract.evaluate({ runtimeState: runtime.state, commitResult: committed });
  runtime.boot();
  const ready = PlayerConstructionRuntimeAdmissionContract.evaluate({ runtimeState: runtime.state, commitResult: committed });
  runtime.start();
  const running = PlayerConstructionRuntimeAdmissionContract.evaluate({ runtimeState: runtime.state, commitResult: committed });
  const rejectedWhileRunning = PlayerConstructionRuntimeAdmissionContract.evaluate({ runtimeState: runtime.state, commitResult: rejected });
  runtime.pause();
  const paused = PlayerConstructionRuntimeAdmissionContract.evaluate({ runtimeState: runtime.state, commitResult: committed });
  runtime.start();
  runtime.stop();
  const stopped = PlayerConstructionRuntimeAdmissionContract.evaluate({ runtimeState: runtime.state, commitResult: committed });

  const checks = Object.freeze({
    frozenIM16CommitRemainsAuthoritative:
      committed.status === 'COMMITTED'
      && committed.kind === 'authoritative-placement-commit-result'
      && typeof committed.buildingId === 'string'
      && domains.buildings.size === buildingCountAfterFrozenCommit,
    runningCommittedPlacementAdmitted:
      running.status === 'ADMITTED'
      && running.admitted === true
      && running.reason === 'RUNTIME_RUNNING'
      && running.runtimeState === 'RUNNING'
      && running.buildingId === committed.buildingId
      && running.definitionId === 'HQ'
      && running.source === committed,
    nonRunningStatesRejected:
      [created, ready, paused, stopped].every(result =>
        result.status === 'REJECTED'
        && result.admitted === false
        && result.reason === 'RUNTIME_NOT_RUNNING'
      ),
    rejectedPlacementNeverAdmitted:
      rejected.status === 'REJECTED'
      && rejectedWhileRunning.status === 'REJECTED'
      && rejectedWhileRunning.admitted === false
      && rejectedWhileRunning.reason === 'PLACEMENT_NOT_COMMITTED'
      && rejectedWhileRunning.source === rejected,
    immutableAdmissionResults:
      [created, ready, running, rejectedWhileRunning, paused, stopped].every(Object.isFrozen),
    noEconomicMutationIntroduced:
      domains.buildings.size === buildingCountAfterFrozenCommit
      && !('demand' in running)
      && !('resources' in running)
      && !('progress' in running)
      && !('constructionState' in running),
  });

  return Object.freeze({
    kind: 'im-17a-self-test-result',
    pass: Object.values(checks).every(Boolean),
    checks,
    evidence: Object.freeze({
      committedBuildingId: committed.buildingId,
      admittedRuntimeState: PlayerConstructionRuntimeAdmissionContract.admittedRuntimeState,
      readyReason: ready.reason,
      pausedReason: paused.reason,
      stoppedReason: stopped.reason,
      rejectedPlacementReason: rejectedWhileRunning.reason,
    }),
    capabilities: Object.freeze({
      consumesFrozenIM16AuthoritativeCommitResult: true,
      runningOnlyEconomicAdmission: true,
      frozenIM16SelectionPreviewCommitChanged: false,
      buildingMutationAuthority: false,
      constructionInitialization: false,
      resourceDemandAuthority: false,
      reservationTransportAuthority: false,
      constructionProgressAuthority: false,
      completionAuthority: false,
    }),
  });
}
