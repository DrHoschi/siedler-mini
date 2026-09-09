import { AuthoritativePlacementCommitBuildingRegistrationContract } from '../domain/authoritative-placement-commit-building-registration-contract.js';

function deepFreeze(value) {
  if (value == null || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function requirePlacementController(controller) {
  if (!controller || typeof controller.getState !== 'function' || typeof controller.deactivate !== 'function') {
    throw new TypeError('frozen IM-16B placement controller required');
  }
  return controller;
}

function requireRuntime(runtime) {
  if (!runtime?.map || !runtime?.domains || typeof runtime.renderCurrentWorld !== 'function') {
    throw new TypeError('current authoritative runtime boundary required');
  }
  return runtime;
}

export function createPlayerPlacementConfirmCancelInteraction({ placementController, runtime } = {}) {
  const placement = requirePlacementController(placementController);
  const currentRuntime = requireRuntime(runtime);
  let lastResult = null;

  function confirm() {
    const state = placement.getState();
    if (state?.status !== 'ACTIVE' || !state.definitionId || !state.targetCellId) {
      lastResult = deepFreeze({
        kind: 'player-placement-confirm-result',
        status: 'NOT_READY',
        reason: 'ACTIVE_TARGET_REQUIRED',
        commitResult: null,
      });
      return lastResult;
    }

    const committer = new AuthoritativePlacementCommitBuildingRegistrationContract({
      map: currentRuntime.map,
      domains: currentRuntime.domains,
    });
    const commitResult = committer.commit({
      definitionId: state.definitionId,
      cellId: state.targetCellId,
    });

    if (commitResult.status === 'COMMITTED') {
      placement.deactivate();
      currentRuntime.renderCurrentWorld();
    }

    lastResult = deepFreeze({
      kind: 'player-placement-confirm-result',
      status: commitResult.status === 'COMMITTED' ? 'COMMITTED' : 'REJECTED',
      reason: commitResult.reason,
      commitResult,
    });
    return lastResult;
  }

  function cancel() {
    const wasActive = placement.getState()?.status === 'ACTIVE';
    placement.deactivate();
    lastResult = deepFreeze({
      kind: 'player-placement-cancel-result',
      status: 'CANCELLED',
      wasActive,
      buildingMutation: false,
    });
    return lastResult;
  }

  return Object.freeze({
    kind: 'player-placement-confirm-cancel-interaction',
    confirm,
    cancel,
    getLastResult: () => lastResult,
    capabilities: Object.freeze({
      explicitConfirmOnly: true,
      authoritativeCommitConsumed: true,
      successfulCommitDeactivatesPlacement: true,
      rejectedCommitPreservesPlacement: true,
      cancelDeactivatesWithoutCommit: true,
      implicitWorldPointerCommit: false,
      placementValidityAuthority: false,
      buildingMutationAuthority: false,
      cameraSelectionAuthority: false,
      saveGameAuthority: false,
      inspectorAuthority: false,
    }),
  });
}

function installBrowserControls() {
  const placementController = window.IM16BPlayerPlacementInteraction;
  const runtime = window.CleanRuntime;
  const confirmButton = document.querySelector('[data-im16e-action="CONFIRM"]');
  const cancelButton = document.querySelector('[data-im16e-action="CANCEL"]');
  const resultEl = document.querySelector('#im16e-action-result');
  if (!placementController || !runtime || !confirmButton || !cancelButton) return null;

  const interaction = createPlayerPlacementConfirmCancelInteraction({ placementController, runtime });

  function sync() {
    const state = placementController.getState();
    const active = state?.status === 'ACTIVE';
    confirmButton.disabled = !active || !state.targetCellId;
    cancelButton.disabled = !active;
    confirmButton.dataset.targetCellId = state?.targetCellId ?? '';
    return state;
  }

  confirmButton.addEventListener('click', event => {
    event.stopPropagation();
    const result = interaction.confirm();
    if (resultEl) resultEl.textContent = result.status === 'COMMITTED'
      ? `COMMITTED ${result.commitResult.buildingId}`
      : result.status === 'REJECTED'
        ? `REJECTED ${result.reason}`
        : 'CONFIRM wartet auf aktives Ziel';
    sync();
  });

  cancelButton.addEventListener('click', event => {
    event.stopPropagation();
    interaction.cancel();
    if (resultEl) resultEl.textContent = 'CANCELLED · NO BUILDING MUTATION';
    sync();
  });

  const timer = window.setInterval(sync, 80);
  sync();
  return Object.freeze({ ...interaction, sync, destroyControls: () => window.clearInterval(timer) });
}

if (typeof window !== 'undefined') {
  window.IM16EPlayerPlacementConfirmCancel = installBrowserControls();
}
