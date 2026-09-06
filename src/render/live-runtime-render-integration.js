import { projectGameState } from './game-state-render-projection.js';
import { renderProjectedWorldToCanvas } from './world-canvas-rendering.js';

function requireSnapshotSource(source, name) {
  if (!source || typeof source.snapshot !== 'function') {
    throw new TypeError(`${name} snapshot source required`);
  }
  return source;
}

function requireContext(ctx) {
  if (!ctx || typeof ctx.clearRect !== 'function') {
    throw new TypeError('CanvasRenderingContext2D-compatible context required');
  }
  return ctx;
}

export function snapshotVisibleRuntimeState({ map, domains } = {}) {
  const mapSource = requireSnapshotSource(map, 'map');
  if (!domains || !domains.buildings || !domains.units) {
    throw new TypeError('current domain stores required');
  }

  return {
    map: mapSource.snapshot(),
    buildings: requireSnapshotSource(domains.buildings, 'buildings').snapshot(),
    persons: requireSnapshotSource(domains.units, 'persons').snapshot()
  };
}

export function projectVisibleRuntimeState(sources) {
  return projectGameState(snapshotVisibleRuntimeState(sources));
}

export function renderLiveRuntimeToCanvas(ctx, sources, options = {}) {
  requireContext(ctx);
  const projection = projectVisibleRuntimeState(sources);
  const commands = renderProjectedWorldToCanvas(ctx, projection, options);
  return Object.freeze({ projection, commands });
}
