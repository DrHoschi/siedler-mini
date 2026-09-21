import { createBaselineMiniworldScenario } from '../diagnostics/baseline-miniworld-scenario.js';
import { PlayerPlacementInteractionStateContract } from '../ui/player-placement-interaction-state-world-target.js';
import { createPlayerPlacementConfirmCancelInteraction } from '../ui/player-placement-confirm-cancel-interaction.js';

function createPlacementHarness(initialState = PlayerPlacementInteractionStateContract.inactive()) {
  let state = initialState;
  return {
    getState: () => state,
    setState: next => { state = next; return state; },
    deactivate: () => { state = PlayerPlacementInteractionStateContract.inactive(); return state; },
  };
}

function createRuntimeHarness(composition, initialState = 'RUNNING') {
  const authoritative = composition.authoritative;
  let renders = 0;
  let runtimeState = initialState;
  return {
    get map() { return authoritative.map; },
    get domains() { return authoritative.domains; },
    get runtime() { return { state: runtimeState }; },
    setRuntimeState(next) { runtimeState = next; return runtimeState; },
    renderCurrentWorld() { renders += 1; return Object.freeze({ commands: [] }); },
    getRenderCount: () => renders,
  };
}

export function runIM16ESelfTest() {
  const composition = createBaselineMiniworldScenario();
  const runtime = createRuntimeHarness(composition);
  const placement = createPlacementHarness();
  const interaction = createPlayerPlacementConfirmCancelInteraction({ placementController: placement, runtime });
  const freeCellId = runtime.map.cellIdAt(0, 0);
  const occupiedCellId = runtime.map.cellIdAt(2, 2);
  const countBefore = runtime.domains.buildings.size;

  placement.setState(PlayerPlacementInteractionStateContract.active({ definitionId: 'HQ', targetCellId: freeCellId }));
  runtime.setRuntimeState('PAUSED');
  const paused = interaction.confirm();
  const pausedState = placement.getState();
  const countAfterPaused = runtime.domains.buildings.size;
  const renderCountAfterPaused = runtime.getRenderCount();
  runtime.setRuntimeState('RUNNING');
  placement.setState(PlayerPlacementInteractionStateContract.inactive());

  const notReady = interaction.confirm();
  const countAfterNotReady = runtime.domains.buildings.size;

  placement.setState(PlayerPlacementInteractionStateContract.active({ definitionId: 'HQ', targetCellId: occupiedCellId }));
  const rejected = interaction.confirm();
  const rejectedState = placement.getState();
  const countAfterRejected = runtime.domains.buildings.size;

  placement.setState(PlayerPlacementInteractionStateContract.active({ definitionId: 'HQ', targetCellId: freeCellId }));
  const committed = interaction.confirm();
  const committedState = placement.getState();
  const countAfterCommitted = runtime.domains.buildings.size;

  placement.setState(PlayerPlacementInteractionStateContract.active({ definitionId: 'HQ', targetCellId: runtime.map.cellIdAt(1, 0) }));
  const countBeforeCancel = runtime.domains.buildings.size;
  const cancelled = interaction.cancel();
  const cancelledState = placement.getState();
  const countAfterCancel = runtime.domains.buildings.size;

  const checks = Object.freeze({
    pausedConfirmRejectedBeforeAuthoritativeMutation:
      paused.status === 'REJECTED'
      && paused.reason === 'RUNTIME_NOT_RUNNING'
      && paused.commitResult === null
      && pausedState.status === 'ACTIVE'
      && pausedState.targetCellId === freeCellId
      && countAfterPaused === countBefore
      && renderCountAfterPaused === 0,
    confirmRequiresActiveRealTarget:
      notReady.status === 'NOT_READY'
      && notReady.reason === 'ACTIVE_TARGET_REQUIRED'
      && countAfterNotReady === countBefore,
    rejectedCommitPreservesAuthoritativeReasonAndPlacement:
      rejected.status === 'REJECTED'
      && rejected.reason === 'TARGET_CELL_OCCUPIED'
      && rejected.commitResult?.kind === 'authoritative-placement-commit-result'
      && rejectedState.status === 'ACTIVE'
      && rejectedState.targetCellId === occupiedCellId
      && countAfterRejected === countBefore,
    successfulConfirmUsesAuthoritativeCommitAndDeactivates:
      committed.status === 'COMMITTED'
      && committed.reason === 'VALID'
      && typeof committed.commitResult?.buildingId === 'string'
      && countAfterCommitted === countBefore + 1
      && committedState.status === 'INACTIVE'
      && runtime.getRenderCount() === 1,
    cancelDeactivatesWithoutBuildingMutation:
      cancelled.status === 'CANCELLED'
      && cancelled.buildingMutation === false
      && cancelledState.status === 'INACTIVE'
      && countAfterCancel === countBeforeCancel,
    immutableResults:
      Object.isFrozen(paused)
      && Object.isFrozen(notReady)
      && Object.isFrozen(rejected)
      && Object.isFrozen(committed)
      && Object.isFrozen(cancelled),
    ownershipBoundaryPreserved:
      interaction.capabilities.authoritativeCommitConsumed === true
      && interaction.capabilities.implicitWorldPointerCommit === false
      && interaction.capabilities.placementValidityAuthority === false
      && interaction.capabilities.buildingMutationAuthority === false
      && interaction.capabilities.cameraSelectionAuthority === false
      && interaction.capabilities.saveGameAuthority === false
      && interaction.capabilities.inspectorAuthority === false,
  });

  return Object.freeze({
    kind: 'im-16e-self-test-result',
    pass: Object.values(checks).every(Boolean),
    checks,
    evidence: Object.freeze({
      freeCellId,
      occupiedCellId,
      committedBuildingId: committed.commitResult?.buildingId ?? null,
      rejectedReason: rejected.reason,
      countBefore,
      countAfterPaused,
      renderCountAfterPaused,
      pausedReason: paused.reason,
      countAfterCommitted,
      countAfterCancel,
    }),
  });
}
