function deepFreeze(value) {
  if (value == null || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function requirePlacementController(controller) {
  if (!controller || typeof controller.activate !== 'function' || typeof controller.getState !== 'function') {
    throw new TypeError('frozen IM-16B placement controller required');
  }
  return controller;
}

function normalizeOption(option) {
  const definitionId = String(option?.definitionId ?? '').trim();
  const label = String(option?.label ?? '').trim();
  if (!definitionId) throw new TypeError('building definition id required');
  if (!label) throw new TypeError('building option label required');
  return deepFreeze({ definitionId, label });
}

export const IM16F_BASELINE_BUILDING_OPTIONS = deepFreeze([
  { definitionId: 'HQ', label: 'Hauptquartier' },
  { definitionId: 'WOODCUTTER', label: 'Holzfäller' },
  { definitionId: 'STOREHOUSE', label: 'Lagerhaus' },
].map(normalizeOption));

export function createPlayerBuildingSelectionPlacementActivation({
  placementController,
  options = IM16F_BASELINE_BUILDING_OPTIONS,
} = {}) {
  const placement = requirePlacementController(placementController);
  const normalizedOptions = deepFreeze(Array.from(options, normalizeOption));
  const optionById = new Map(normalizedOptions.map(option => [option.definitionId, option]));
  let lastResult = null;

  function select(definitionId) {
    const normalizedDefinitionId = String(definitionId ?? '').trim();
    const option = optionById.get(normalizedDefinitionId);
    if (!option) {
      lastResult = deepFreeze({
        kind: 'player-building-selection-result',
        status: 'REJECTED',
        reason: 'BUILDING_OPTION_NOT_AVAILABLE',
        definitionId: normalizedDefinitionId || null,
        placementState: placement.getState(),
      });
      return lastResult;
    }

    const placementState = placement.activate(option.definitionId);
    lastResult = deepFreeze({
      kind: 'player-building-selection-result',
      status: 'ACTIVATED',
      reason: null,
      definitionId: option.definitionId,
      placementState,
    });
    return lastResult;
  }

  return Object.freeze({
    kind: 'player-building-selection-placement-activation',
    options: normalizedOptions,
    select,
    getLastResult: () => lastResult,
    capabilities: Object.freeze({
      explicitPlayerSelectionOnly: true,
      frozenIM16BActivationConsumed: true,
      narrowKnownDefinitionSource: true,
      authoritativeBuildingDefinitionRegistry: false,
      placementStateAuthority: false,
      placementValidityAuthority: false,
      buildingMutationAuthority: false,
      commitAuthority: false,
      saveGameAuthority: false,
      inspectorAuthority: false,
    }),
  });
}

function installBrowserControls() {
  if (window.IM16FPlayerBuildingSelection) return window.IM16FPlayerBuildingSelection;
  const placementController = window.IM16BPlayerPlacementInteraction;
  const surface = document.querySelector('[data-im16f-controls]');
  if (!placementController || !surface) return null;

  const interaction = createPlayerBuildingSelectionPlacementActivation({ placementController });
  const resultEl = surface.querySelector('#im16f-selection-result');
  const buttons = Array.from(surface.querySelectorAll('[data-im16f-definition-id]'));

  for (const button of buttons) {
    button.addEventListener('click', event => {
      event.stopPropagation();
      const result = interaction.select(button.dataset.im16fDefinitionId);
      for (const candidate of buttons) candidate.dataset.selected = candidate === button && result.status === 'ACTIVATED' ? 'true' : 'false';
      if (resultEl) resultEl.textContent = result.status === 'ACTIVATED'
        ? `${result.definitionId} · PLACEMENT ACTIVE`
        : `REJECTED ${result.reason}`;
      window.IM16EPlayerPlacementConfirmCancel?.sync?.();
    });
  }

  window.IM16FPlayerBuildingSelection = interaction;
  return interaction;
}

if (typeof window !== 'undefined') {
  let attempts = 0;
  const installer = window.setInterval(() => {
    attempts += 1;
    if (installBrowserControls() || attempts >= 100) window.clearInterval(installer);
  }, 25);
}
