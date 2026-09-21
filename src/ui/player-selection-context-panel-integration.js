function deepFreeze(value) {
  if (value == null || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

export const PlayerSelectionContextPanelModes = Object.freeze({
  PEEK: 'PEEK',
  STANDARD: 'STANDARD',
  EXPANDED: 'EXPANDED',
});

const MODE_ORDER = Object.freeze([
  PlayerSelectionContextPanelModes.PEEK,
  PlayerSelectionContextPanelModes.STANDARD,
  PlayerSelectionContextPanelModes.EXPANDED,
]);

function normalizeMode(value) {
  return MODE_ORDER.includes(value) ? value : PlayerSelectionContextPanelModes.PEEK;
}

function definitionLabel(definitionId) {
  const labels = Object.freeze({
    HQ: 'Hauptquartier',
    WOODCUTTER: 'Holzfäller',
    STOREHOUSE: 'Lagerhaus',
  });
  return labels[definitionId] ?? definitionId ?? 'Gebäude';
}

function lifecycleLabel(value) {
  if (!value) return null;
  const labels = Object.freeze({
    PLANNED: 'Geplant',
    PLACED: 'Platziert',
    ACTIVE: 'Aktiv',
    INACTIVE: 'Inaktiv',
    COMPLETED: 'Fertig',
    PENDING: 'Ausstehend',
    IN_PROGRESS: 'Im Bau',
    AVAILABLE: 'Verfügbar',
    FULL: 'Belegt',
    ASSIGNED: 'Zugewiesen',
    MOVING: 'Unterwegs',
  });
  return labels[value] ?? String(value);
}

function array(value) {
  return Array.isArray(value) ? value : [];
}

function findHousing(authoritative, buildingId) {
  return array(authoritative?.residentHousingAssignment?.housingStates)
    .find(entry => entry?.buildingId === buildingId) ?? null;
}

function findConstruction(authoritative, buildingId) {
  return array(authoritative?.constructionProgress)
    .find(entry => entry?.buildingId === buildingId) ?? null;
}

function findWorkforceForBuilding(authoritative, buildingId) {
  const bindings = array(authoritative?.workforceBindings).filter(entry => entry?.buildingId === buildingId);
  const assignments = array(authoritative?.workforceAssignments);
  return bindings.map(binding => ({
    binding,
    assignment: assignments.find(entry => entry?.assignmentId === binding.assignmentId) ?? null,
  }));
}

function findTransportForBuilding(authoritative, buildingId) {
  const jobs = authoritative?.domains?.jobs;
  if (!jobs || typeof jobs.ids !== 'function' || typeof jobs.get !== 'function') return Object.freeze([]);
  return Object.freeze(jobs.ids()
    .map(id => jobs.get(id))
    .filter(job => job?.targetId === buildingId)
    .map(job => Object.freeze({ id: job.id, status: job.status ?? null })));
}

function findHomeAssignment(authoritative, personId) {
  return array(authoritative?.residentHousingAssignment?.assignments)
    .find(entry => entry?.personId === personId || entry?.residentId === personId || entry?.unitId === personId) ?? null;
}

function findWorkforceForPerson(authoritative, personId) {
  return array(authoritative?.workforceAssignments)
    .find(entry => entry?.personId === personId) ?? null;
}

function findCarrier(authoritative, personId) {
  const units = authoritative?.domains?.units;
  if (!units || typeof units.get !== 'function') return null;
  return units.get(personId)?.carrier ?? null;
}

function findTransportForPerson(authoritative, personId) {
  const bindings = array(authoritative?.carrierBindings).filter(entry => entry?.unitId === personId);
  const executions = array(authoritative?.transportExecutions);
  return bindings.map(binding => ({
    binding,
    execution: executions.find(entry => entry?.jobId === binding.jobId && entry?.unitId === personId) ?? null,
  }));
}

function buildingProjection(selected, authoritative) {
  const construction = findConstruction(authoritative, selected.id);
  const housing = findHousing(authoritative, selected.id);
  const workforce = findWorkforceForBuilding(authoritative, selected.id);
  const transport = findTransportForBuilding(authoritative, selected.id);

  const constructionState = construction?.state ?? null;
  const primaryStatus = constructionState && constructionState !== 'COMPLETED'
    ? constructionState
    : selected.visibleState ?? housing?.status ?? workforce[0]?.assignment?.availability ?? null;

  const details = [];
  if (construction) details.push(`Baufortschritt ${Math.round(Number(construction.progress ?? 0) * 100)}%`);
  if (housing) details.push(`Wohnen ${housing.occupancy}/${housing.capacity}`);
  if (workforce.length) details.push(`Arbeitskräfte ${workforce.length}`);
  if (transport.length) details.push(`Transportaufträge ${transport.length}`);

  return deepFreeze({
    kind: 'building',
    id: selected.id,
    title: definitionLabel(selected.definitionId),
    definitionId: selected.definitionId ?? null,
    primaryStatus,
    primaryStatusLabel: lifecycleLabel(primaryStatus) ?? 'Ausgewählt',
    blockingReason: null,
    metric: housing ? `Wohnen ${housing.occupancy}/${housing.capacity}`
      : construction ? `Bau ${Math.round(Number(construction.progress ?? 0) * 100)}%`
        : null,
    details,
    sources: {
      selection: selected,
      construction,
      housing,
      workforce,
      transport,
    },
  });
}

function personProjection(selected, authoritative) {
  const home = findHomeAssignment(authoritative, selected.id);
  const workforce = findWorkforceForPerson(authoritative, selected.id);
  const carrier = findCarrier(authoritative, selected.id);
  const transport = findTransportForPerson(authoritative, selected.id);
  const movement = authoritative?.carrierMovementEvidence?.unitId === selected.id
    ? authoritative.carrierMovementEvidence
    : null;

  const primaryStatus = movement?.state ?? workforce?.availability ?? carrier?.state ?? selected.visibleState ?? null;
  const details = [];
  if (home) details.push('Wohnplatz zugewiesen');
  if (workforce?.availability) details.push(`Arbeit ${lifecycleLabel(workforce.availability)}`);
  if (carrier?.state) details.push(`Träger ${lifecycleLabel(carrier.state)}`);
  if (transport.length) details.push(`Transport ${transport.length}`);

  return deepFreeze({
    kind: 'person',
    id: selected.id,
    title: 'Bewohner',
    definitionId: null,
    primaryStatus,
    primaryStatusLabel: lifecycleLabel(primaryStatus) ?? 'Ausgewählt',
    blockingReason: null,
    metric: carrier?.state ? `Träger · ${lifecycleLabel(carrier.state)}`
      : workforce?.availability ? `Arbeit · ${lifecycleLabel(workforce.availability)}`
        : null,
    details,
    sources: {
      selection: selected,
      home,
      workforce,
      carrier,
      transport,
      movement,
    },
  });
}

export function projectPlayerSelectionContextPanel({
  selectionContext,
  runtimeComposition,
  mode = PlayerSelectionContextPanelModes.PEEK,
} = {}) {
  const selected = selectionContext?.selected ?? null;
  const normalizedMode = normalizeMode(mode);
  if (!selected) {
    return deepFreeze({
      kind: 'player-selection-context-panel-projection',
      mode: normalizedMode,
      selected: null,
      presentationActions: ['CLOSE'],
    });
  }

  const authoritative = runtimeComposition?.authoritative;
  if (!authoritative?.domains) throw new TypeError('active runtime composition required');

  const projected = selected.kind === 'building'
    ? buildingProjection(selected, authoritative)
    : selected.kind === 'person'
      ? personProjection(selected, authoritative)
      : null;
  if (!projected) throw new TypeError(`unsupported Player context selection kind: ${selected.kind}`);

  return deepFreeze({
    kind: 'player-selection-context-panel-projection',
    mode: normalizedMode,
    selected: projected,
    presentationActions: ['COLLAPSE', 'EXPAND', 'CLOSE'],
  });
}

export function nextPlayerContextMode(current, direction) {
  const index = MODE_ORDER.indexOf(normalizeMode(current));
  const delta = direction === 'COLLAPSE' ? -1 : direction === 'EXPAND' ? 1 : 0;
  return MODE_ORDER[Math.max(0, Math.min(MODE_ORDER.length - 1, index + delta))];
}

function renderPanel(projection, panel) {
  if (!panel) return projection;
  const selected = projection.selected;
  panel.hidden = !selected;
  panel.setAttribute('aria-hidden', selected ? 'false' : 'true');
  panel.dataset.contextMode = projection.mode;
  if (!selected) return projection;

  const kind = panel.querySelector('[data-context-kind]');
  const title = panel.querySelector('[data-context-title]');
  const subtitle = panel.querySelector('[data-context-subtitle]');
  const status = panel.querySelector('[data-context-status]');
  const metric = panel.querySelector('[data-context-metric]');
  const block = panel.querySelector('[data-context-block]');
  const details = panel.querySelector('[data-context-details]');
  const technical = panel.querySelector('[data-context-technical]');
  if (kind) kind.textContent = selected.kind === 'building' ? 'Gebäude' : 'Person';
  if (title) title.textContent = selected.title;
  if (subtitle) subtitle.textContent = selected.kind === 'building' ? (selected.definitionId ?? '') : 'Bewohner';
  if (status) status.textContent = selected.primaryStatusLabel;
  if (metric) {
    metric.textContent = selected.metric ?? '';
    metric.hidden = !selected.metric;
  }
  if (block) {
    block.textContent = selected.blockingReason ?? '';
    block.hidden = !selected.blockingReason;
  }
  if (details) details.textContent = selected.details.join(' · ');
  if (technical) technical.textContent = selected.id;
  return projection;
}

export function createPlayerSelectionContextPanelIntegration({
  selectionController,
  placementController,
  runtime,
  panel,
  documentRef = document,
} = {}) {
  if (!selectionController?.subscribe || !selectionController?.setWorldSelectionGuard || !selectionController?.clear) {
    throw new TypeError('frozen IM-14D Selection boundary with IM-21B additive observer/guard required');
  }
  if (!placementController?.subscribe || typeof placementController.getState !== 'function') {
    throw new TypeError('frozen IM-16B Placement boundary with IM-21B additive observer required');
  }
  if (!runtime?.getActiveRuntimeComposition) throw new TypeError('current active runtime composition reader required');
  if (!(panel instanceof Element)) throw new TypeError('IM-21B Player Context Panel surface required');

  let mode = PlayerSelectionContextPanelModes.PEEK;
  let projection = projectPlayerSelectionContextPanel({
    selectionContext: selectionController.getContext(),
    runtimeComposition: runtime.getActiveRuntimeComposition(),
    mode,
  });

  const buildWorkspace = documentRef.querySelector('[data-player-workspace="build"]');
  const buildButton = documentRef.querySelector('[data-player-entry="build"]');

  function closeBuildWorkspace() {
    if (buildWorkspace && !buildWorkspace.hidden) {
      buildWorkspace.hidden = true;
      buildButton?.setAttribute('aria-expanded', 'false');
    }
  }

  function refresh({ resetMode = false } = {}) {
    if (resetMode && selectionController.getContext()?.selected) mode = PlayerSelectionContextPanelModes.PEEK;
    projection = projectPlayerSelectionContextPanel({
      selectionContext: selectionController.getContext(),
      runtimeComposition: runtime.getActiveRuntimeComposition(),
      mode,
    });
    if (projection.selected) closeBuildWorkspace();
    return renderPanel(projection, panel);
  }

  selectionController.setWorldSelectionGuard(() => placementController.getState()?.status !== 'ACTIVE');

  const unsubscribeSelection = selectionController.subscribe(event => {
    refresh({ resetMode: event.reason === 'WORLD_TAP' || event.reason === 'RESTORE' });
  });

  const unsubscribePlacement = placementController.subscribe(event => {
    if (event.state?.status === 'ACTIVE') {
      selectionController.clear();
    } else {
      refresh();
    }
  });

  const onPanelClick = event => {
    const action = event.target instanceof Element
      ? event.target.closest('[data-context-action]')?.dataset?.contextAction
      : null;
    if (!action) return;
    event.stopPropagation();
    if (action === 'CLOSE') {
      selectionController.clear();
      return;
    }
    if (action === 'EXPAND' || action === 'COLLAPSE') {
      mode = nextPlayerContextMode(mode, action);
      refresh();
    }
  };
  panel.addEventListener('click', onPanelClick);

  const onBuildClick = () => {
    if (buildWorkspace && !buildWorkspace.hidden) selectionController.clear();
  };
  buildButton?.addEventListener('click', onBuildClick);

  refresh();

  return Object.freeze({
    kind: 'player-selection-context-panel-integration',
    getProjection: () => projection,
    getMode: () => mode,
    refresh,
    close: () => selectionController.clear(),
    capabilities: Object.freeze({
      selectionAuthority: false,
      gameplayAuthority: false,
      saveGameAuthority: false,
      inspectorAuthority: false,
      presentationStateOnly: true,
      placementSelectionArbitration: true,
    }),
    destroy() {
      unsubscribeSelection();
      unsubscribePlacement();
      panel.removeEventListener('click', onPanelClick);
      buildButton?.removeEventListener('click', onBuildClick);
      selectionController.setWorldSelectionGuard(() => true);
      panel.hidden = true;
      panel.setAttribute('aria-hidden', 'true');
    },
  });
}

export function installIM21BPlayerSelectionContextPanel() {
  if (window.IM21BPlayerSelectionContextPanel) return window.IM21BPlayerSelectionContextPanel;
  const panel = document.querySelector('[data-player-context-panel]');
  const selectionController = window.IM14DWorldSelectionContext;
  const placementController = window.IM16BPlayerPlacementInteraction;
  const runtime = window.CleanRuntime;
  if (!panel || !selectionController || !placementController || !runtime) return null;
  window.IM21BPlayerSelectionContextPanel = createPlayerSelectionContextPanelIntegration({
    selectionController,
    placementController,
    runtime,
    panel,
    documentRef: document,
  });
  return window.IM21BPlayerSelectionContextPanel;
}

if (typeof window !== 'undefined') {
  let attempts = 0;
  const installer = window.setInterval(() => {
    attempts += 1;
    if (installIM21BPlayerSelectionContextPanel() || attempts >= 100) window.clearInterval(installer);
  }, 25);
}
