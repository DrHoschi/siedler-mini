import { projectPlayerBuildingCatalog } from './player-building-catalog-projection.js';

function setHidden(element, hidden) {
  if (!element) return;
  element.hidden = hidden;
  element.setAttribute('aria-hidden', hidden ? 'true' : 'false');
}

export function createPlayerBuildCatalogPlacementIntegration({
  catalogSurface,
  placementSurface,
  buildButton,
  placementController,
  selectionController,
  documentRef = document,
} = {}) {
  if (!(catalogSurface instanceof Element) || !(placementSurface instanceof Element)) throw new TypeError('IM-21C Catalog and Placement surfaces required');
  if (!placementController?.subscribe || typeof placementController.getState !== 'function') throw new TypeError('frozen IM-16B Placement controller required');
  if (!selectionController?.clear) throw new TypeError('frozen IM-14D Selection controller required');

  const catalog = projectPlayerBuildingCatalog();
  const list = catalogSurface.querySelector('[data-player-build-catalog-list]');
  if (!(list instanceof Element)) throw new TypeError('IM-21C Catalog list required');

  let catalogOpen = false;
  let returnToCatalogOnCancel = false;
  let inactiveDestination = 'world';
  let externalSurfaceLock = null;

  function renderCatalog() {
    list.replaceChildren(...catalog.entries.map(item => {
      const button = documentRef.createElement('button');
      button.type = 'button';
      button.className = 'build-catalog-entry';
      button.dataset.playerCatalogId = item.contentId;
      button.dataset.im16fDefinitionId = item.runtimeDefinitionId ?? '';
      button.disabled = !item.placementSupported;
      button.setAttribute('aria-disabled', item.placementSupported ? 'false' : 'true');
      button.innerHTML = `<strong>${item.label}</strong><span>${item.role}</span><small>${item.placementSupported ? 'Platzieren' : 'Noch nicht technisch verfügbar'}</small>`;
      return button;
    }));
  }

  function showWorld() {
    catalogOpen = false;
    setHidden(catalogSurface, true);
    setHidden(placementSurface, true);
    buildButton?.setAttribute('aria-expanded', 'false');
  }

  function showCatalog() {
    if (externalSurfaceLock) return false;
    selectionController.clear();
    catalogOpen = true;
    returnToCatalogOnCancel = false;
    inactiveDestination = 'world';
    setHidden(catalogSurface, false);
    setHidden(placementSurface, true);
    buildButton?.setAttribute('aria-expanded', 'true');
    return true;
  }

  function showPlacement() {
    catalogOpen = false;
    returnToCatalogOnCancel = true;
    inactiveDestination = 'world';
    setHidden(catalogSurface, true);
    setHidden(placementSurface, false);
    buildButton?.setAttribute('aria-expanded', 'false');
  }

  function setExternalSurfaceLock(owner) {
    externalSurfaceLock = owner ? String(owner) : null;
    if (externalSurfaceLock) showWorld();
    return externalSurfaceLock;
  }

  const onBuild = event => {
    event.stopPropagation();
    if (externalSurfaceLock) return;
    if (placementController.getState()?.status === 'ACTIVE') return;
    if (catalogOpen) showWorld(); else showCatalog();
  };

  const onCatalog = event => {
    const button = event.target instanceof Element ? event.target.closest('[data-player-catalog-id]') : null;
    if (!button || button.disabled || !button.dataset.im16fDefinitionId) return;
    event.stopPropagation();
    // IM-16F owns the actual selection -> frozen IM-16B activation.
    window.IM16FPlayerBuildingSelection?.select?.(button.dataset.im16fDefinitionId);
    window.IM16EPlayerPlacementConfirmCancel?.sync?.();
    if (placementController.getState()?.status === 'ACTIVE') showPlacement();
  };

  const onPlacementAction = event => {
    const action = event.target instanceof Element ? event.target.closest('[data-im16e-action]')?.dataset?.im16eAction : null;
    if (action === 'CANCEL') inactiveDestination = 'catalog';
    if (action === 'CONFIRM') inactiveDestination = 'world';
  };
  placementSurface.addEventListener('click', onPlacementAction, true);

  const unsubscribePlacement = placementController.subscribe(event => {
    if (event.state?.status === 'ACTIVE') {
      selectionController.clear();
      showPlacement();
      return;
    }
    if (inactiveDestination === 'catalog' && returnToCatalogOnCancel) showCatalog();
    else showWorld();
  });

  buildButton?.addEventListener('click', onBuild);
  catalogSurface.addEventListener('click', onCatalog);
  renderCatalog();
  showWorld();

  return Object.freeze({
    kind: 'player-build-catalog-placement-integration',
    catalog,
    showCatalog,
    showWorld,
    setExternalSurfaceLock,
    getState: () => Object.freeze({
      catalogOpen,
      placementActive: placementController.getState()?.status === 'ACTIVE',
      returnToCatalogOnCancel,
      externalSurfaceLock,
    }),
    capabilities: Object.freeze({
      presentationOnly: true,
      placementAuthority: false,
      constructionAuthority: false,
      gameplayMutationAuthority: false,
      singlePrimaryWorkingSurface: true,
      hiddenSurfaceTouchIsolation: true,
    }),
    destroy() {
      unsubscribePlacement();
      buildButton?.removeEventListener('click', onBuild);
      catalogSurface.removeEventListener('click', onCatalog);
      placementSurface.removeEventListener('click', onPlacementAction, true);
      showWorld();
    },
  });
}

export function installIM21CPlayerBuildCatalogPlacement() {
  if (window.IM21CPlayerBuildCatalogPlacement) return window.IM21CPlayerBuildCatalogPlacement;
  const catalogSurface = document.querySelector('[data-player-build-catalog]');
  const placementSurface = document.querySelector('[data-player-placement-controls]');
  const buildButton = document.querySelector('[data-player-entry="build"]');
  const placementController = window.IM16BPlayerPlacementInteraction;
  const selectionController = window.IM14DWorldSelectionContext;
  if (!catalogSurface || !placementSurface || !buildButton || !placementController || !selectionController || !window.IM16FPlayerBuildingSelection) return null;
  window.IM21CPlayerBuildCatalogPlacement = createPlayerBuildCatalogPlacementIntegration({
    catalogSurface, placementSurface, buildButton, placementController, selectionController, documentRef: document,
  });
  return window.IM21CPlayerBuildCatalogPlacement;
}

if (typeof window !== 'undefined') {
  let attempts = 0;
  const installer = window.setInterval(() => {
    attempts += 1;
    if (installIM21CPlayerBuildCatalogPlacement() || attempts >= 120) window.clearInterval(installer);
  }, 25);
}
