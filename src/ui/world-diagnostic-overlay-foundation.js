import { projectPointToScreen } from '../render/world-to-screen-projection.js';

function deepFreeze(value) {
  if (value == null || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function requireRuntime(runtime) {
  if (!runtime || typeof runtime.renderCurrentWorld !== 'function' || typeof runtime.getCameraState !== 'function') {
    throw new TypeError('IM-15C runtime render/camera boundary required');
  }
  if (!runtime.pathClassification || typeof runtime.pathClassification.entries !== 'function') {
    throw new TypeError('IM-15C path classification read boundary required');
  }
  if (!runtime.domains?.buildings || !runtime.domains?.units) {
    throw new TypeError('IM-15C authoritative domain stores required');
  }
  if (typeof runtime.installDiagnosticOverlayRenderer !== 'function') {
    throw new TypeError('IM-15C read-only overlay render hook required');
  }
  return runtime;
}

function requireCanvas(canvas) {
  if (!(canvas instanceof HTMLCanvasElement)) throw new TypeError('IM-15C overlay canvas required');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new TypeError('IM-15C overlay 2d context required');
  return ctx;
}

function centerOf(command) {
  if (command.type === 'fillCircle') return { x: command.x, y: command.y };
  return { x: command.x + command.width / 2, y: command.y + command.height / 2 };
}

function commandMap(commands, role) {
  return new Map(commands
    .filter(command => command?.role === role && command?.sourceId)
    .map(command => [String(command.sourceId), command]));
}

function worldPointToScreen(position, renderResult) {
  const cellPixels = Number(renderResult?.view?.cellPixels);
  const offset = renderResult?.view?.offset ?? { x: 0, y: 0 };
  if (!Number.isFinite(cellPixels) || !(cellPixels > 0)) throw new TypeError('IM-15C render view cellPixels required');
  if (!position || !Number.isFinite(position.x) || !Number.isFinite(position.y)) return null;
  return projectPointToScreen({
    x: offset.x + position.x * cellPixels,
    y: offset.y + position.y * cellPixels,
  }, renderResult.cameraState);
}

export function projectWorldDiagnosticOverlay({
  runtime = window.CleanRuntime,
  renderResult,
  selection = window.IM14DWorldSelectionContext?.getSelection?.() ?? null,
} = {}) {
  const source = requireRuntime(runtime);
  if (!renderResult || !Array.isArray(renderResult.commands) || !renderResult.cameraState) {
    throw new TypeError('IM-15C render result required');
  }

  const grids = commandMap(renderResult.commands, 'grid-cell');
  const buildings = commandMap(renderResult.commands, 'building');
  const persons = commandMap(renderResult.commands, 'person');

  const paths = source.pathClassification.entries().map(entry => {
    const command = grids.get(String(entry.cellId));
    return command ? deepFreeze({
      cellId: String(entry.cellId),
      traversalType: entry.traversalType,
      rect: { x: command.x, y: command.y, width: command.width, height: command.height },
    }) : null;
  }).filter(Boolean);

  const buildingLabels = [...buildings.entries()].map(([id, command]) => deepFreeze({ id, point: centerOf(command) }));
  const personLabels = [...persons.entries()].map(([id, command]) => deepFreeze({ id, point: centerOf(command) }));

  const movement = source.carrierMovementEvidence ? (() => {
    const evidence = source.carrierMovementEvidence;
    const personCommand = persons.get(String(evidence.unitId));
    const start = personCommand ? centerOf(personCommand) : worldPointToScreen(evidence.currentPosition, renderResult);
    const target = worldPointToScreen(evidence.targetPosition, renderResult);
    if (!start || !target) return null;
    return deepFreeze({
      unitId: String(evidence.unitId),
      state: evidence.state ?? null,
      start,
      target,
    });
  })() : null;

  let selected = null;
  if (selection?.kind === 'building') {
    const command = buildings.get(String(selection.id));
    if (command) selected = deepFreeze({ kind: 'building', id: String(selection.id), command: structuredClone(command) });
  } else if (selection?.kind === 'person') {
    const command = persons.get(String(selection.id));
    if (command) selected = deepFreeze({ kind: 'person', id: String(selection.id), command: structuredClone(command) });
  }

  return deepFreeze({
    kind: 'im15c-world-diagnostic-overlay',
    paths,
    buildingLabels,
    personLabels,
    movement,
    selected,
  });
}

function resizeOverlayCanvas(canvas, ctx, referenceCanvas, maxDevicePixelRatio) {
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

function drawLabel(ctx, text, point, { dx = 7, dy = -7 } = {}) {
  ctx.save();
  ctx.font = '600 10px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.textBaseline = 'bottom';
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(15,18,21,.88)';
  ctx.fillStyle = 'rgba(245,241,230,.96)';
  ctx.strokeText(text, point.x + dx, point.y + dy);
  ctx.fillText(text, point.x + dx, point.y + dy);
  ctx.restore();
}

export function renderWorldDiagnosticOverlay(overlay, ctx) {
  if (overlay?.kind !== 'im15c-world-diagnostic-overlay') throw new TypeError('IM-15C overlay projection required');

  for (const path of overlay.paths) {
    ctx.save();
    ctx.lineWidth = 2;
    ctx.strokeStyle = path.traversalType === 'ROAD' ? 'rgba(255,196,96,.95)' : 'rgba(120,210,255,.95)';
    ctx.setLineDash(path.traversalType === 'ROAD' ? [] : [5, 3]);
    ctx.strokeRect(path.rect.x + 2, path.rect.y + 2, Math.max(1, path.rect.width - 4), Math.max(1, path.rect.height - 4));
    ctx.restore();
    drawLabel(ctx, path.traversalType, { x: path.rect.x, y: path.rect.y + 13 }, { dx: 4, dy: 0 });
  }

  for (const entry of overlay.buildingLabels) drawLabel(ctx, entry.id, entry.point);
  for (const entry of overlay.personLabels) drawLabel(ctx, entry.id, entry.point, { dx: 6, dy: 14 });

  if (overlay.movement) {
    const { start, target, unitId } = overlay.movement;
    ctx.save();
    ctx.strokeStyle = 'rgba(255,116,116,.95)';
    ctx.fillStyle = 'rgba(255,116,116,.95)';
    ctx.lineWidth = 2;
    ctx.setLineDash([7, 4]);
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(target.x, target.y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.arc(target.x, target.y, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    drawLabel(ctx, `${unitId} target`, target, { dx: 7, dy: -6 });
  }

  if (overlay.selected) {
    const command = overlay.selected.command;
    ctx.save();
    ctx.strokeStyle = 'rgba(255,245,118,.98)';
    ctx.lineWidth = 3;
    if (overlay.selected.kind === 'person' && command.type === 'fillCircle') {
      ctx.beginPath();
      ctx.arc(command.x, command.y, command.radius + 6, 0, Math.PI * 2);
      ctx.stroke();
    } else if (command.width != null && command.height != null) {
      ctx.strokeRect(command.x - 5, command.y - 5, command.width + 10, command.height + 10);
    }
    ctx.restore();
  }

  return overlay;
}

export function createWorldDiagnosticOverlayController({
  runtime = window.CleanRuntime,
  canvas,
  referenceCanvas,
  selectionController = window.IM14DWorldSelectionContext,
  selectionRefreshMs = 100,
} = {}) {
  const source = requireRuntime(runtime);
  const ctx = requireCanvas(canvas);
  if (!(referenceCanvas instanceof HTMLCanvasElement)) throw new TypeError('IM-15C reference world canvas required');
  if (!selectionController || typeof selectionController.getSelection !== 'function') {
    throw new TypeError('IM-15C frozen IM-14D selection read boundary required');
  }
  if (!Number.isFinite(selectionRefreshMs) || selectionRefreshMs < 50) {
    throw new TypeError('IM-15C selectionRefreshMs must be >= 50');
  }

  let current = null;
  let lastRenderResult = null;
  let lastSelectionKey = 'none';

  function render(renderResult) {
    lastRenderResult = renderResult;
    resizeOverlayCanvas(canvas, ctx, referenceCanvas, source.config.render.maxDevicePixelRatio);
    const selection = selectionController.getSelection();
    current = projectWorldDiagnosticOverlay({ runtime: source, renderResult, selection });
    renderWorldDiagnosticOverlay(current, ctx);
    lastSelectionKey = selection ? `${selection.kind}:${selection.id}` : 'none';
    return current;
  }

  source.installDiagnosticOverlayRenderer(render);
  const initial = source.renderCurrentWorld();

  const selectionTimer = window.setInterval(() => {
    if (!lastRenderResult) return;
    const selection = selectionController.getSelection();
    const key = selection ? `${selection.kind}:${selection.id}` : 'none';
    if (key !== lastSelectionKey) render(lastRenderResult);
  }, selectionRefreshMs);

  return Object.freeze({
    kind: 'im15c-world-diagnostic-overlay-controller',
    getCurrentOverlay: () => current,
    refresh: () => source.renderCurrentWorld(),
    initial,
    destroy() { window.clearInterval(selectionTimer); },
  });
}

const overlayCanvas = document.querySelector('#diagnostic-overlay-canvas');
const worldCanvas = document.querySelector('#game-canvas');

if (overlayCanvas && worldCanvas && window.CleanRuntime && window.IM14DWorldSelectionContext) {
  window.IM15CWorldDiagnosticOverlay = createWorldDiagnosticOverlayController({
    runtime: window.CleanRuntime,
    canvas: overlayCanvas,
    referenceCanvas: worldCanvas,
    selectionController: window.IM14DWorldSelectionContext,
  });

  const status = document.querySelector('#test-status');
  if (status) {
    status.textContent = 'IM-15C — IMPLEMENTED / NOT FROZEN — World Diagnostic Overlay aktiv · PATH/ROAD · Building/Person IDs · Carrier Movement · Selection Highlight · read-only';
    status.dataset.pass = 'pending';
  }
}
