import { PlayerPlacementInteractionStateContract } from '../ui/player-placement-interaction-state-world-target.js';
import { createPlayerBuildingSelectionPlacementActivation, IM16F_BASELINE_BUILDING_OPTIONS } from '../ui/player-building-selection-placement-activation.js';

function createPlacementHarness() {
  let state = PlayerPlacementInteractionStateContract.inactive();
  let activations = 0;
  return {
    activate(definitionId) {
      activations += 1;
      state = PlayerPlacementInteractionStateContract.active({ definitionId });
      return state;
    },
    getState: () => state,
    getActivationCount: () => activations,
  };
}

export function runIM16FSelfTest() {
  const placement = createPlacementHarness();
  const selection = createPlayerBuildingSelectionPlacementActivation({ placementController: placement });

  const initial = placement.getState();
  const first = selection.select('HQ');
  const firstState = placement.getState();
  const switched = selection.select('WOODCUTTER');
  const switchedState = placement.getState();
  const activationCountBeforeRejected = placement.getActivationCount();
  const rejected = selection.select('UNKNOWN');
  const rejectedState = placement.getState();

  const checks = Object.freeze({
    narrowKnownOptionsOnly:
      selection.options.length === IM16F_BASELINE_BUILDING_OPTIONS.length
      && selection.options.map(option => option.definitionId).join(',') === 'HQ,WOODCUTTER,STOREHOUSE',
    explicitSelectionActivatesFrozenIM16B:
      initial.status === 'INACTIVE'
      && first.status === 'ACTIVATED'
      && first.definitionId === 'HQ'
      && firstState.status === 'ACTIVE'
      && firstState.definitionId === 'HQ',
    selectionSwitchReplacesTemporaryDefinition:
      switched.status === 'ACTIVATED'
      && switched.definitionId === 'WOODCUTTER'
      && switchedState.status === 'ACTIVE'
      && switchedState.definitionId === 'WOODCUTTER'
      && switchedState.targetCellId === null
      && switchedState.evaluation === null,
    unavailableOptionRejectedWithoutActivation:
      rejected.status === 'REJECTED'
      && rejected.reason === 'BUILDING_OPTION_NOT_AVAILABLE'
      && placement.getActivationCount() === activationCountBeforeRejected
      && rejectedState.definitionId === 'WOODCUTTER',
    immutableResults:
      Object.isFrozen(first)
      && Object.isFrozen(switched)
      && Object.isFrozen(rejected)
      && Object.isFrozen(selection.options),
    ownershipBoundaryPreserved:
      selection.capabilities.frozenIM16BActivationConsumed === true
      && selection.capabilities.authoritativeBuildingDefinitionRegistry === false
      && selection.capabilities.placementStateAuthority === false
      && selection.capabilities.placementValidityAuthority === false
      && selection.capabilities.buildingMutationAuthority === false
      && selection.capabilities.commitAuthority === false
      && selection.capabilities.saveGameAuthority === false
      && selection.capabilities.inspectorAuthority === false,
  });

  return Object.freeze({
    kind: 'im-16f-self-test-result',
    pass: Object.values(checks).every(Boolean),
    checks,
    evidence: Object.freeze({
      options: selection.options.map(option => option.definitionId),
      firstDefinitionId: first.definitionId,
      switchedDefinitionId: switched.definitionId,
      rejectedReason: rejected.reason,
      activations: placement.getActivationCount(),
    }),
  });
}
