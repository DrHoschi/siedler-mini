function setHidden(element, hidden) {
  if (!element) return;
  element.hidden = hidden;
  element.setAttribute('aria-hidden', hidden ? 'true' : 'false');
}

function housingStatusLabel(status) {
  return Object.freeze({
    AVAILABLE: 'Verfügbar',
    FULL: 'Belegt',
    NO_HOUSING: 'Keine Wohngebäude',
  })[status] ?? String(status ?? '—');
}

export function createPlayerEconomySettlementOverviewIntegration({
  runtime,
  entryButton,
  surface,
  selectionController,
  placementController,
  buildIntegration,
  workAreaIntegration,
} = {}) {
  if (!runtime?.playerPopulationHousingGoldProjection) throw new TypeError('existing Player Population/Housing/Gold projection required');
  if (!(entryButton instanceof Element) || !(surface instanceof Element)) throw new TypeError('IM-21E Player settlement surfaces required');
  if (!selectionController?.clear) throw new TypeError('frozen Selection boundary required');
  if (!placementController?.getState) throw new TypeError('frozen Placement boundary required');
  if (!buildIntegration?.setExternalSurfaceLock) throw new TypeError('IM-21C external working-surface boundary required');

  let open = false;

  function projection() {
    const value = runtime.playerPopulationHousingGoldProjection;
    if (value?.kind !== 'player-population-housing-gold-projection') throw new TypeError('Player Population/Housing/Gold projection required');
    return value;
  }

  function render() {
    const value = projection();
    const fields = {
      '[data-settlement-population]': value.population.count,
      '[data-settlement-housing]': `${value.housing.occupancy}/${value.housing.capacity}`,
      '[data-settlement-available]': value.housing.availableSlots,
      '[data-settlement-gold]': value.gold.balance,
      '[data-settlement-housing-status]': housingStatusLabel(value.housing.status),
    };
    for (const [selector, text] of Object.entries(fields)) {
      const element = surface.querySelector(selector);
      if (element) element.textContent = String(text);
    }
    surface.dataset.housingStatus = value.housing.status;
    surface.dataset.population = String(value.population.count);
    surface.dataset.gold = String(value.gold.balance);
    return value;
  }

  function canOpen() {
    if (placementController.getState()?.status === 'ACTIVE') return false;
    if (workAreaIntegration?.getState?.().editing === true) return false;
    return true;
  }

  function show() {
    if (open) return render();
    if (!canOpen()) return false;
    buildIntegration.setExternalSurfaceLock('IM21E_SETTLEMENT_OVERVIEW');
    selectionController.clear();
    open = true;
    setHidden(surface, false);
    entryButton.setAttribute('aria-expanded', 'true');
    return render();
  }

  function hide() {
    if (!open) return false;
    open = false;
    setHidden(surface, true);
    entryButton.setAttribute('aria-expanded', 'false');
    buildIntegration.setExternalSurfaceLock(null);
    return true;
  }

  function toggle() {
    return open ? hide() : show();
  }

  const onEntry = event => {
    event.stopPropagation();
    toggle();
  };
  const onSurface = event => {
    const action = event.target instanceof Element ? event.target.closest('[data-settlement-action]')?.dataset?.settlementAction : null;
    if (action === 'CLOSE') {
      event.stopPropagation();
      hide();
    }
  };

  entryButton.addEventListener('click', onEntry);
  surface.addEventListener('click', onSurface);
  setHidden(surface, true);
  entryButton.setAttribute('aria-expanded', 'false');

  return Object.freeze({
    kind: 'player-economy-settlement-overview-integration',
    show, hide, toggle, render,
    getState: () => Object.freeze({ open }),
    capabilities: Object.freeze({
      populationAuthority: false,
      housingAuthority: false,
      goldAuthority: false,
      economyMutationAuthority: false,
      presentationOnly: true,
      existingReadModelOnly: true,
      singlePrimaryWorkingSurface: true,
      hiddenSurfaceTouchIsolation: true,
    }),
    destroy() {
      entryButton.removeEventListener('click', onEntry);
      surface.removeEventListener('click', onSurface);
      hide();
    },
  });
}

export function installIM21EPlayerEconomySettlementOverview() {
  if (window.IM21EPlayerEconomySettlementOverview) return window.IM21EPlayerEconomySettlementOverview;
  const runtime = window.CleanRuntime;
  const entryButton = document.querySelector('[data-player-entry="settlement"]');
  const surface = document.querySelector('[data-player-settlement-overview]');
  const selectionController = window.IM14DWorldSelectionContext;
  const placementController = window.IM16BPlayerPlacementInteraction;
  const buildIntegration = window.IM21CPlayerBuildCatalogPlacement;
  const workAreaIntegration = window.IM21DPlayerWorkArea;
  if (!runtime || !entryButton || !surface || !selectionController || !placementController || !buildIntegration || !workAreaIntegration) return null;
  window.IM21EPlayerEconomySettlementOverview = createPlayerEconomySettlementOverviewIntegration({
    runtime, entryButton, surface, selectionController, placementController, buildIntegration, workAreaIntegration,
  });
  return window.IM21EPlayerEconomySettlementOverview;
}

if (typeof window !== 'undefined') {
  const installer = window.setInterval(() => {
    if (installIM21EPlayerEconomySettlementOverview()) window.clearInterval(installer);
  }, 25);
}
