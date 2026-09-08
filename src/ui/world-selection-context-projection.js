import { createUnifiedPointerTouchInteraction } from './unified-pointer-touch-interaction.js?v=im14d-1';

function deepFreeze(value) {
  if (value == null || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function finitePoint(point, name = 'point') {
  if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) {
    throw new TypeError(`${name} must contain finite x/y`);
  }
  return point;
}

function distance(a, b) {
  finitePoint(a, 'a');
  finitePoint(b, 'b');
  return Math.hypot(b.x - a.x, b.y - a.y);
}

function pointInRect(point, command) {
  return point.x >= command.x
    && point.x <= command.x + command.width
    && point.y >= command.y
    && point.y <= command.y + command.height;
}

function pointInCircle(point, command) {
  return Math.hypot(point.x - command.x, point.y - command.y) <= command.radius;
}

function candidatePriority(command) {
  if (command?.role === 'person') return 0;
  if (command?.role === 'building') return 1;
  return 99;
}

export function hitTestWorldCommands(commands, point) {
  if (!Array.isArray(commands)) throw new TypeError('render commands array required');
  const p = finitePoint(point);

  const matches = commands.filter(command => {
    if (!command?.sourceId) return false;
    if (command.role === 'person' && command.type === 'fillCircle') return pointInCircle(p, command);
    if (command.role === 'building' && command.type === 'fillRect') return pointInRect(p, command);
    return false;
  }).sort((a, b) => {
    const priority = candidatePriority(a) - candidatePriority(b);
    return priority || String(a.sourceId).localeCompare(String(b.sourceId));
  });

  const winner = matches[0] ?? null;
  if (!winner) return null;
  return deepFreeze({ kind: winner.role, id: String(winner.sourceId) });
}

export function projectSelectionContext(projection, selection) {
  if (selection == null) return deepFreeze({ kind: 'selection-context', selected: null });
  if (!projection || typeof projection !== 'object') throw new TypeError('runtime render projection required');

  if (selection.kind === 'building') {
    const building = (projection.buildings ?? []).find(entry => entry.id === selection.id);
    if (!building) return deepFreeze({ kind: 'selection-context', selected: null });
    return deepFreeze({
      kind: 'selection-context',
      selected: {
        kind: 'building',
        id: building.id,
        definitionId: building.definitionId ?? null,
        visibleState: building.visibleState ?? null,
      },
    });
  }

  if (selection.kind === 'person') {
    const person = (projection.persons ?? []).find(entry => entry.id === selection.id);
    if (!person) return deepFreeze({ kind: 'selection-context', selected: null });
    return deepFreeze({
      kind: 'selection-context',
      selected: {
        kind: 'person',
        id: person.id,
        visibleState: person.visibleState ?? null,
      },
    });
  }

  throw new TypeError(`unsupported selection kind: ${selection.kind}`);
}

export function renderSelectionContext(context, documentRef = document) {
  const kindEl = documentRef.querySelector('#context-kind');
  const detailEl = documentRef.querySelector('#context-detail');
  if (!kindEl || !detailEl) throw new TypeError('IM-14D context surface required');

  if (!context?.selected) {
    kindEl.textContent = 'Keine Auswahl';
    detailEl.textContent = 'Weltobjekt antippen';
    kindEl.dataset.selection = 'none';
    detailEl.dataset.selectionId = '';
    return context;
  }

  const selected = context.selected;
  kindEl.textContent = selected.kind === 'building' ? 'Gebäude' : 'Person';
  const state = selected.visibleState ? ` · ${selected.visibleState}` : '';
  const type = selected.kind === 'building' && selected.definitionId ? ` · ${selected.definitionId}` : '';
  detailEl.textContent = `${selected.id}${type}${state}`;
  kindEl.dataset.selection = selected.kind;
  detailEl.dataset.selectionId = selected.id;
  return context;
}

export function isSelectionTapGesture({ start, end, moved = false, multiTouch = false, tapSlop = 8 } = {}) {
  finitePoint(start, 'start');
  finitePoint(end, 'end');
  if (!Number.isFinite(tapSlop) || tapSlop < 0) throw new TypeError('tapSlop must be non-negative');
  return !moved && !multiTouch && distance(start, end) <= tapSlop;
}

export function createWorldSelectionContextController({
  root,
  worldSurface,
  runtime,
  documentRef = document,
  tapSlop = 8,
} = {}) {
  if (!runtime || typeof runtime.renderCurrentWorld !== 'function') {
    throw new TypeError('IM-14D runtime render boundary required');
  }

  const input = createUnifiedPointerTouchInteraction({ root, worldSurface });
  const gestures = new Map();
  let selection = null;
  let context = deepFreeze({ kind: 'selection-context', selected: null });

  function refreshContext(renderResult = null) {
    const current = renderResult ?? runtime.renderCurrentWorld();
    context = projectSelectionContext(current.projection, selection);
    renderSelectionContext(context, documentRef);
    return context;
  }

  const unsubscribe = input.subscribe(input.owners.WORLD, sample => {
    if (sample.phase === 'pointerdown') {
      gestures.set(sample.pointerId, {
        start: sample.local,
        moved: false,
        multiTouch: gestures.size > 0,
      });
      if (gestures.size > 1) {
        for (const gesture of gestures.values()) gesture.multiTouch = true;
      }
      return;
    }

    const gesture = gestures.get(sample.pointerId);
    if (!gesture) return;

    if (sample.phase === 'pointermove') {
      if (distance(gesture.start, sample.local) > tapSlop) gesture.moved = true;
      return;
    }

    if (sample.phase === 'pointercancel') {
      gestures.delete(sample.pointerId);
      return;
    }

    if (sample.phase === 'pointerup') {
      gestures.delete(sample.pointerId);
      if (!isSelectionTapGesture({
        start: gesture.start,
        end: sample.local,
        moved: gesture.moved,
        multiTouch: gesture.multiTouch,
        tapSlop,
      })) return;

      const rendered = runtime.renderCurrentWorld();
      selection = hitTestWorldCommands(rendered.commands, sample.local);
      refreshContext(rendered);
    }
  });

  renderSelectionContext(context, documentRef);

  return Object.freeze({
    kind: 'world-selection-context-controller',
    input,
    getSelection: () => selection,
    getContext: () => context,
    clear() {
      selection = null;
      return refreshContext();
    },
    destroy() {
      unsubscribe();
      input.destroy();
      gestures.clear();
    },
  });
}

const shell = document.querySelector('[data-ui-shell="player"]');
const worldSurface = document.querySelector('[data-ui-region="world"]');

if (shell && worldSurface && window.CleanRuntime) {
  window.IM14DWorldSelectionContext = createWorldSelectionContextController({
    root: shell,
    worldSurface,
    runtime: window.CleanRuntime,
    documentRef: document,
  });
}
