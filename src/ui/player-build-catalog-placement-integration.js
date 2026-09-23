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
    selectionController.clear();
    catalogOpen = true;
    returnToCatalogOnCancel = false;
    setHidden(catalogSurface, false);
    setHidden(placementSurface, true);
    buildButton?.setAttribute('aria-expanded', 'true');
  }

  function showPlacement() {
    catalogOpen = false;
    returnToCatalogOnCancel = true;
    setHidden(catalogSurface, true);
    setHidden(placementSurface, false);
    buildButton?.setAttribute('aria-expanded', 'false');
  }

  const onBuild = event => {
    event.stopPropagation();
    if (placementController.getState()?.status === 'ACTIVE') return;
    if (catalogOpen) showWorld(); else showCatalog();
  };

  const onCatalog = event => {
    const button = event.target instanceof Element ? event.target.closest('[data-player-catalog-id]') : null;
    if (!button || button.disabled || !button.dataset.im16fDefinitionId) return;
    event.stopPropagation();
    // IM-16F owns the actual selection -> frozen IM-16B activation.
    button.click === undefined;
    window.IM16FPlayerBuildingSelection?.select?.(button.dataset.im16fDefinitionId);
    window.IM16EPlayerPlacementConfirmCancel?.sync?.();
    if (placementController.getState()?.status === 'ACTIVE') showPlacement();
  };

  const unsubscribePlacement = placementController.subscribe(event => {
    if (event.state?.status === 'ACTIVE') {
      selectionController.clear();
      showPlacement();
      return;
    }
    const lastAction = window.IM16EPlayerPlacementConfirmCancel?.getLastResult?.();
    if (lastAction?.kind === 'player-placement-cancel-result' && returnToCatalogOnCancel) showCatalog();
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
    getState: () => Object.freeze({
      catalogOpen,
      placementActive: placementController.getState()?.status === 'ACTIVE',
      returnToCatalogOnCancel,
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
