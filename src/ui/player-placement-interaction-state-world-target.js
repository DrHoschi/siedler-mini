import { AuthoritativeConstructionPlacementContract } from '../domain/authoritative-construction-placement-contract.js';

function deepFreeze(value) {
  if (value == null || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function requireDefinitionId(value) {
  const normalized = String(value ?? '').trim();
  if (!normalized) throw new TypeError('building definition id required');
  return normalized;
}

function requirePoint(point) {
  const x = Number(point?.x);
  const y = Number(point?.y);
  if (!Number.isFinite(x) || !Number.isFinite(y)) throw new TypeError('finite screen point required');
  return Object.freeze({ x, y });
}

function requireMap(map) {
  if (!map || typeof map.snapshot !== 'function') throw new TypeError('MapStructure-compatible map required');
  return map;
}

function pointInHalfOpenRect(point, command) {
  return point.x >= command.x
    && point.x < command.x + command.width
    && point.y >= command.y
    && point.y < command.y + command.height;
}

export function resolveProjectedWorldTargetCell({ renderResult, point, map } = {}) {
  const targetMap = requireMap(map);
  const screenPoint = requirePoint(point);
  const commands = renderResult?.commands;
  if (!Array.isArray(commands)) throw new TypeError('camera-projected render commands required');

  const realCellIds = new Set((targetMap.snapshot()?.cells ?? []).map(cell => cell?.id).filter(Boolean));
  const command = commands.find(entry => entry?.role === 'grid-cell'
    && entry?.type === 'strokeRect'
    && realCellIds.has(entry.sourceId)
    && pointInHalfOpenRect(screenPoint, entry));

  return command?.sourceId ?? null;
}

export const PlayerPlacementInteractionStateContract = Object.freeze({
  inactive() {
    return deepFreeze({
      kind: 'player-placement-interaction-state',
      status: 'INACTIVE',
      definitionId: null,
      targetCellId: null,
      evaluation: null,
    });
  },

  active({ definitionId, targetCellId = null, evaluation = null } = {}) {
    const normalizedDefinitionId = requireDefinitionId(definitionId);
    const normalizedCellId = targetCellId == null ? null : String(targetCellId).trim() || null;
    if (evaluation != null) {
      if (evaluation.kind !== 'authoritative-construction-placement-evaluation') {
        throw new TypeError('frozen IM-16A placement evaluation required');
      }
      if (evaluation.candidate?.definitionId !== normalizedDefinitionId) {
        throw new TypeError('placement evaluation definitionId mismatch');
      }
      if (evaluation.candidate?.cellId !== normalizedCellId) {
        throw new TypeError('placement evaluation targetCellId mismatch');
      }
    }
    return deepFreeze({
      kind: 'player-placement-interaction-state',
      status: 'ACTIVE',
      definitionId: normalizedDefinitionId,
      targetCellId: normalizedCellId,
      evaluation,
    });
  },
});

export function createPlayerPlacementInteractionController({ selectionController, runtime } = {}) {
  const input = selectionController?.input;
  if (!input || typeof input.subscribe !== 'function' || !input.owners?.WORLD) {
    throw new TypeError('frozen IM-14 unified WORLD input required');
  }
  if (!runtime || !runtime.map || !runtime.domains || typeof runtime.renderCurrentWorld !== 'function') {
    throw new TypeError('current runtime Map/Domain/render boundary required');
  }

  const placement = new AuthoritativeConstructionPlacementContract({ map: runtime.map, domains: runtime.domains });
  let state = PlayerPlacementInteractionStateContract.inactive();
  const metrics = { worldSamples: 0, targetUpdates: 0, multiTouchIgnored: 0, cancelledSamples: 0 };

  function activate(definitionId) {
    state = PlayerPlacementInteractionStateContract.active({ definitionId });
    return state;
  }

  function deactivate() {
    state = PlayerPlacementInteractionStateContract.inactive();
    return state;
  }

  function updateTarget(point) {
    if (state.status !== 'ACTIVE') return state;
    const renderResult = runtime.renderCurrentWorld();
    const targetCellId = resolveProjectedWorldTargetCell({ renderResult, point, map: runtime.map });
    const evaluation = targetCellId == null
      ? null
      : placement.evaluate({ definitionId: state.definitionId, cellId: targetCellId });
    state = PlayerPlacementInteractionStateContract.active({
      definitionId: state.definitionId,
      targetCellId,
      evaluation,
    });
    metrics.targetUpdates += 1;
    return state;
  }

  const unsubscribe = input.subscribe(input.owners.WORLD, sample => {
    metrics.worldSamples += 1;
    if (state.status !== 'ACTIVE') return;
    if (sample.phase === 'pointercancel') {
      metrics.cancelledSamples += 1;
      return;
    }
    if (sample.phase !== 'pointerdown' && sample.phase !== 'pointermove' && sample.phase !== 'pointerup') return;
    if ((input.activeContacts?.().length ?? 0) > 1) {
      metrics.multiTouchIgnored += 1;
      return;
    }
    updateTarget(sample.local);
  });

  return Object.freeze({
    kind: 'player-placement-interaction-controller',
    input,
    activate,
    deactivate,
    updateTarget,
    getState: () => state,
    getMetrics: () => Object.freeze({ ...metrics }),
    capabilities: Object.freeze({
      temporaryInteractionStateOnly: true,
      projectedWorldTargetResolution: true,
      authoritativePlacementEvaluationConsumed: true,
      buildingMutation: false,
      confirmCommit: false,
      previewRendering: false,
      saveGamePersistence: false,
    }),
    destroy() {
      unsubscribe();
      state = PlayerPlacementInteractionStateContract.inactive();
    },
  });
}

if (typeof window !== 'undefined') {
  const selectionController = window.IM14DWorldSelectionContext;
  const runtime = window.CleanRuntime;
  if (selectionController && runtime) {
    window.IM16BPlayerPlacementInteraction = createPlayerPlacementInteractionController({
      selectionController,
      runtime,
    });
  }
}
