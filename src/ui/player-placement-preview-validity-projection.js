function deepFreeze(value) {
  if (value == null || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function requirePlacementState(state) {
  if (state?.kind !== 'player-placement-interaction-state') {
    throw new TypeError('frozen IM-16B placement state required');
  }
  return state;
}

function requireRenderResult(renderResult) {
  if (!renderResult || !Array.isArray(renderResult.commands)) {
    throw new TypeError('camera-projected render result required');
  }
  return renderResult;
}

function gridCommandFor(renderResult, cellId) {
  return renderResult.commands.find(command => command?.role === 'grid-cell'
    && command?.type === 'strokeRect'
    && command?.sourceId === cellId) ?? null;
}

export function projectPlayerPlacementPreview({ placementState, renderResult } = {}) {
  const state = requirePlacementState(placementState);
  const rendered = requireRenderResult(renderResult);

  if (state.status !== 'ACTIVE') {
    return deepFreeze({
      kind: 'player-placement-preview-projection',
      status: 'INACTIVE',
      definitionId: null,
      targetCellId: null,
      validity: null,
      cellRect: null,
      ghostRect: null,
    });
  }

  if (!state.targetCellId || !state.evaluation) {
    return deepFreeze({
      kind: 'player-placement-preview-projection',
      status: 'NO_TARGET',
      definitionId: state.definitionId,
      targetCellId: null,
      validity: null,
      cellRect: null,
      ghostRect: null,
    });
  }

  const command = gridCommandFor(rendered, state.targetCellId);
  if (!command) {
    return deepFreeze({
      kind: 'player-placement-preview-projection',
      status: 'NO_TARGET',
      definitionId: state.definitionId,
      targetCellId: null,
      validity: null,
      cellRect: null,
      ghostRect: null,
    });
  }

  const validity = state.evaluation.reason;
  if (validity !== 'VALID' && validity !== 'TARGET_CELL_OCCUPIED') {
    return deepFreeze({
      kind: 'player-placement-preview-projection',
      status: 'NO_TARGET',
      definitionId: state.definitionId,
      targetCellId: null,
      validity: null,
      cellRect: null,
      ghostRect: null,
    });
  }

  const inset = Math.max(4, Math.round(Math.min(command.width, command.height) * 0.18));
  const cellRect = {
    x: command.x,
    y: command.y,
    width: command.width,
    height: command.height,
  };
  const ghostRect = {
    x: command.x + inset,
    y: command.y + inset,
    width: Math.max(1, command.width - inset * 2),
    height: Math.max(1, command.height - inset * 2),
  };

  return deepFreeze({
    kind: 'player-placement-preview-projection',
    status: validity === 'VALID' ? 'VALID' : 'INVALID',
    definitionId: state.definitionId,
    targetCellId: state.targetCellId,
    validity,
    cellRect,
    ghostRect,
  });
}

function requireCanvas(canvas) {
  if (!(canvas instanceof HTMLCanvasElement)) throw new TypeError('IM-16C preview canvas required');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new TypeError('IM-16C preview 2d context required');
  return ctx;
}

function resizePreviewCanvas(canvas, ctx, referenceCanvas, maxDevicePixelRatio) {
  const rect = referenceCanvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, maxDevicePixelRatio);
  const width = Math.max(1, rect.width);
  const height = Math.max(1, rect.height);
  const pixelWidth = Math.max(1, Math.round(width * dpr));
  const pixelHeight = Math.max(1, Math.round(height * dpr));
  if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
    canvas.width = pixelWidth;
    canvas.height = pixelHeight;
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);
  return { width, height };
}

export function renderPlayerPlacementPreview(projection, ctx) {
  if (projection?.kind !== 'player-placement-preview-projection') {
    throw new TypeError('IM-16C preview projection required');
  }
  if (projection.status !== 'VALID' && projection.status !== 'INVALID') return projection;

  const isValid = projection.status === 'VALID';
  ctx.save();
  ctx.lineWidth = 3;
  ctx.setLineDash(isValid ? [] : [7, 4]);
  ctx.strokeStyle = isValid ? 'rgba(91,220,132,.98)' : 'rgba(255,104,104,.98)';
  ctx.fillStyle = isValid ? 'rgba(91,220,132,.18)' : 'rgba(255,104,104,.18)';
  ctx.fillRect(projection.cellRect.x, projection.cellRect.y, projection.cellRect.width, projection.cellRect.height);
  ctx.strokeRect(projection.cellRect.x + 2, projection.cellRect.y + 2, Math.max(1, projection.cellRect.width - 4), Math.max(1, projection.cellRect.height - 4));

  ctx.setLineDash([]);
  ctx.globalAlpha = 0.72;
  ctx.fillStyle = isValid ? 'rgba(169,255,195,.68)' : 'rgba(255,160,160,.68)';
  ctx.fillRect(projection.ghostRect.x, projection.ghostRect.y, projection.ghostRect.width, projection.ghostRect.height);
  ctx.globalAlpha = 1;
  ctx.strokeStyle = isValid ? 'rgba(230,255,237,.96)' : 'rgba(255,226,226,.96)';
  ctx.lineWidth = 2;
  ctx.strokeRect(projection.ghostRect.x, projection.ghostRect.y, projection.ghostRect.width, projection.ghostRect.height);

  ctx.font = '700 10px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.textBaseline = 'top';
  ctx.fillStyle = 'rgba(248,246,238,.98)';
  ctx.strokeStyle = 'rgba(15,18,21,.9)';
  ctx.lineWidth = 3;
  const label = `${projection.definitionId} · ${projection.validity}`;
  const labelX = projection.cellRect.x + 5;
  const labelY = projection.cellRect.y + 5;
  ctx.strokeText(label, labelX, labelY);
  ctx.fillText(label, labelX, labelY);
  ctx.restore();
  return projection;
}

export function createPlayerPlacementPreviewController({
  runtime = window.CleanRuntime,
  placementController = window.IM16BPlayerPlacementInteraction,
  canvas,
  referenceCanvas,
  refreshMs = 80,
} = {}) {
  if (!runtime || typeof runtime.renderCurrentWorld !== 'function') {
    throw new TypeError('current runtime render boundary required');
  }
  if (!placementController || typeof placementController.getState !== 'function') {
    throw new TypeError('frozen IM-16B placement controller required');
  }
  if (!(referenceCanvas instanceof HTMLCanvasElement)) throw new TypeError('world reference canvas required');
  if (!Number.isFinite(refreshMs) || refreshMs < 50) throw new TypeError('refreshMs must be >= 50');

  const ctx = requireCanvas(canvas);
  let current = null;

  function refresh() {
    resizePreviewCanvas(canvas, ctx, referenceCanvas, runtime.config.render.maxDevicePixelRatio);
    const renderResult = runtime.renderCurrentWorld();
    current = projectPlayerPlacementPreview({
      placementState: placementController.getState(),
      renderResult,
    });
    renderPlayerPlacementPreview(current, ctx);
    return current;
  }

  const timer = window.setInterval(refresh, refreshMs);
  window.addEventListener('resize', refresh, { passive: true });
  refresh();

  return Object.freeze({
    kind: 'player-placement-preview-controller',
    refresh,
    getCurrentProjection: () => current,
    capabilities: Object.freeze({
      temporaryPresentationOnly: true,
      authoritativeValidityConsumed: true,
      cameraSynchronousProjectionConsumed: true,
      buildingMutation: false,
      confirmCommit: false,
      saveGamePersistence: false,
      inspectorAuthority: false,
    }),
    destroy() {
      window.clearInterval(timer);
      window.removeEventListener('resize', refresh);
      resizePreviewCanvas(canvas, ctx, referenceCanvas, runtime.config.render.maxDevicePixelRatio);
    },
  });
}

if (typeof window !== 'undefined') {
  const previewCanvas = document.querySelector('#player-placement-preview-canvas');
  const worldCanvas = document.querySelector('#game-canvas');
  if (previewCanvas && worldCanvas && window.CleanRuntime && window.IM16BPlayerPlacementInteraction) {
    window.IM16CPlayerPlacementPreview = createPlayerPlacementPreviewController({
      runtime: window.CleanRuntime,
      placementController: window.IM16BPlayerPlacementInteraction,
      canvas: previewCanvas,
      referenceCanvas: worldCanvas,
    });
  }
}
