function deepFreeze(value) {
  if (value == null || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function requireConfirmInteraction(interaction) {
  if (!interaction || typeof interaction.getLastResult !== 'function') {
    throw new TypeError('frozen IM-16E confirm/cancel interaction required');
  }
  return interaction;
}

export function projectAuthoritativeConstructionResult(confirmResult) {
  const commitResult = confirmResult?.kind === 'player-placement-confirm-result'
    ? confirmResult.commitResult
    : null;

  if (!commitResult || commitResult.kind !== 'authoritative-placement-commit-result') {
    return null;
  }

  if (commitResult.status === 'COMMITTED') {
    return deepFreeze({
      kind: 'player-construction-result-projection',
      status: 'COMMITTED',
      buildingId: commitResult.buildingId,
      definitionId: commitResult.candidate?.definitionId ?? null,
      reason: commitResult.reason,
      source: commitResult,
    });
  }

  if (commitResult.status === 'REJECTED') {
    return deepFreeze({
      kind: 'player-construction-result-projection',
      status: 'REJECTED',
      buildingId: null,
      definitionId: commitResult.candidate?.definitionId ?? null,
      reason: commitResult.reason,
      source: commitResult,
    });
  }

  return null;
}

export function createAuthoritativeConstructionResultPlayerUIProjection({ confirmInteraction } = {}) {
  const interaction = requireConfirmInteraction(confirmInteraction);
  let lastConsumedConfirmResult = null;
  let currentProjection = null;

  function sync() {
    const confirmResult = interaction.getLastResult();
    if (!confirmResult || confirmResult === lastConsumedConfirmResult) return currentProjection;
    lastConsumedConfirmResult = confirmResult;
    const projected = projectAuthoritativeConstructionResult(confirmResult);
    if (projected) currentProjection = projected;
    return currentProjection;
  }

  return Object.freeze({
    kind: 'authoritative-construction-result-player-ui-projection',
    sync,
    getProjection: () => currentProjection,
    capabilities: Object.freeze({
      consumesActualIM16DCommitResultOnly: true,
      previewValiditySuccessInference: false,
      controlStateSuccessInference: false,
      worldRenderSuccessInference: false,
      buildingMutationAuthority: false,
      commitAuthority: false,
      placementValidityAuthority: false,
      runtimeRenderAuthority: false,
      saveGameAuthority: false,
      inspectorAuthority: false,
    }),
  });
}

function ensureResultSurface() {
  let surface = document.querySelector('[data-im16g-result]');
  if (surface) return surface;
  const footer = document.querySelector('.player-action-region');
  if (!footer) return null;
  surface = document.createElement('output');
  surface.dataset.im16gResult = 'true';
  surface.setAttribute('aria-live', 'polite');
  surface.textContent = 'Noch kein autoritatives Bauergebnis';
  footer.append(surface);
  return surface;
}

export function installIM16GBrowserProjection() {
  if (window.IM16GConstructionResultProjection) return window.IM16GConstructionResultProjection;
  const confirmInteraction = window.IM16EPlayerPlacementConfirmCancel;
  const resultEl = ensureResultSurface();
  if (!confirmInteraction || !resultEl) return null;

  const projection = createAuthoritativeConstructionResultPlayerUIProjection({ confirmInteraction });
  let lastRendered = null;

  function sync() {
    const result = projection.sync();
    if (!result || result === lastRendered) return result;
    lastRendered = result;
    resultEl.dataset.status = result.status;
    resultEl.textContent = result.status === 'COMMITTED'
      ? `Gebaut · ${result.definitionId} · ${result.buildingId}`
      : `Nicht gebaut · ${result.definitionId ?? '—'} · ${result.reason}`;
    return result;
  }

  const timer = window.setInterval(sync, 80);
  sync();
  window.IM16GConstructionResultProjection = Object.freeze({
    ...projection,
    sync,
    destroyProjection: () => window.clearInterval(timer),
  });
  return window.IM16GConstructionResultProjection;
}

if (typeof window !== 'undefined') {
  let attempts = 0;
  const installer = window.setInterval(() => {
    attempts += 1;
    if (installIM16GBrowserProjection() || attempts >= 100) window.clearInterval(installer);
  }, 25);
}
