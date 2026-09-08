function requireRuntime(runtime) {
  if (!runtime?.config || !runtime?.runtime || !runtime?.map || !runtime?.domains) {
    throw new TypeError('IM-15A authoritative runtime boundary required');
  }
  if (!runtime?.housingPopulation?.population || !runtime?.goldEconomy) {
    throw new TypeError('IM-15A population and gold sources required');
  }
  return runtime;
}

function deepFreeze(value) {
  if (value == null || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function selectedIdentity(selectionController) {
  const context = selectionController?.getContext?.();
  const selected = context?.selected ?? null;
  if (!selected) return null;
  if (selected.kind === 'building') {
    return deepFreeze({
      kind: 'building',
      id: selected.id,
      definitionId: selected.definitionId ?? null,
    });
  }
  if (selected.kind === 'person') {
    return deepFreeze({ kind: 'person', id: selected.id });
  }
  return null;
}

export function projectInspectorRuntimeObservation({
  runtime = window.CleanRuntime,
  selectionController = window.IM14DWorldSelectionContext,
} = {}) {
  const source = requireRuntime(runtime);
  const population = source.housingPopulation.population;
  const gold = source.goldEconomy.snapshot();
  const mapStructure = source.map;
  const worldMap = mapStructure.map();
  const dimensions = mapStructure.dimensions();

  return deepFreeze({
    kind: 'im15a-read-only-runtime-observation',
    runtime: {
      product: source.config.product,
      build: source.config.build,
      state: source.runtime.state,
    },
    world: {
      name: worldMap.name ?? null,
      width: dimensions.width,
      height: dimensions.height,
      cellSize: worldMap.cellSize ?? null,
    },
    population: population.count,
    gold: gold.balance,
    selected: selectedIdentity(selectionController),
  });
}

function setText(root, selector, value) {
  const element = root.querySelector(selector);
  if (!element) throw new TypeError(`IM-15A inspector field required: ${selector}`);
  element.textContent = value;
  return element;
}

export function renderInspectorRuntimeObservation(observation, root = document) {
  if (observation?.kind !== 'im15a-read-only-runtime-observation') {
    throw new TypeError('IM-15A observation required');
  }

  setText(root, '#inspector-runtime', `${observation.runtime.product} · ${observation.runtime.state}`);
  setText(root, '#inspector-build', observation.runtime.build);
  setText(root, '#inspector-world', `${observation.world.name ?? 'Welt'} · ${observation.world.width ?? '—'}×${observation.world.height ?? '—'} · Zelle ${observation.world.cellSize ?? '—'}`);
  setText(root, '#inspector-population', String(observation.population));
  setText(root, '#inspector-gold', String(observation.gold));

  const selected = observation.selected;
  const selectedEl = root.querySelector('#inspector-selection');
  if (!selectedEl) throw new TypeError('IM-15A inspector selection field required');
  if (!selected) {
    selectedEl.textContent = 'Keine Auswahl';
    selectedEl.dataset.selectionKind = 'none';
    selectedEl.dataset.selectionId = '';
  } else if (selected.kind === 'building') {
    selectedEl.textContent = `Gebäude · ${selected.id}${selected.definitionId ? ` · ${selected.definitionId}` : ''}`;
    selectedEl.dataset.selectionKind = 'building';
    selectedEl.dataset.selectionId = selected.id;
  } else {
    selectedEl.textContent = `Person · ${selected.id}`;
    selectedEl.dataset.selectionKind = 'person';
    selectedEl.dataset.selectionId = selected.id;
  }

  return observation;
}

export function createInspectorRuntimeObservationController({
  runtime = window.CleanRuntime,
  selectionController = window.IM14DWorldSelectionContext,
  root = document,
  refreshMs = 250,
} = {}) {
  requireRuntime(runtime);
  if (!Number.isFinite(refreshMs) || refreshMs < 50) throw new TypeError('IM-15A refreshMs must be >= 50');

  let current = null;
  function refresh() {
    current = projectInspectorRuntimeObservation({ runtime, selectionController });
    renderInspectorRuntimeObservation(current, root);
    return current;
  }

  refresh();
  const timer = window.setInterval(refresh, refreshMs);

  return Object.freeze({
    kind: 'im15a-inspector-read-only-runtime-observation-controller',
    refresh,
    getCurrentObservation: () => current,
    destroy() {
      window.clearInterval(timer);
    },
  });
}

const inspectorShell = document.querySelector('[data-ui-shell="inspector"]');
if (inspectorShell && window.CleanRuntime) {
  window.IM15AInspector = createInspectorRuntimeObservationController({
    runtime: window.CleanRuntime,
    selectionController: window.IM14DWorldSelectionContext,
    root: document,
  });

  const status = document.querySelector('#test-status');
  if (status) {
    status.textContent = 'IM-15A — IMPLEMENTED / NOT FROZEN — Inspector Shell aktiv · Runtime/World/Population/Gold/Selection ausschließlich read-only projiziert';
    status.dataset.pass = 'true';
  }
}
