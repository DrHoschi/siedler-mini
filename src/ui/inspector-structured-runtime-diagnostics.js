function requireRuntime(runtime) {
  if (!runtime?.domains?.buildings || !runtime?.domains?.units || !runtime?.domains?.resources || !runtime?.domains?.jobs) {
    throw new TypeError('IM-15B authoritative domain stores required');
  }
  if (!runtime?.pathClassification || typeof runtime.pathClassification.entries !== 'function') {
    throw new TypeError('IM-15B path classification read boundary required');
  }
  return runtime;
}

function deepFreeze(value) {
  if (value == null || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function stableEntries(store) {
  const snapshot = store.snapshot();
  return Object.freeze(Object.keys(snapshot.items ?? {})
    .sort()
    .map(id => deepFreeze(structuredClone(snapshot.items[id]))));
}

function compactPosition(position) {
  if (!position || !Number.isFinite(position.x) || !Number.isFinite(position.y)) return null;
  return `${position.x},${position.y}`;
}

function compactObject(value) {
  if (value == null) return '—';
  if (typeof value !== 'object') return String(value);
  const pairs = Object.entries(value)
    .filter(([, child]) => child != null && typeof child !== 'object')
    .map(([key, child]) => `${key}=${child}`);
  return pairs.length > 0 ? pairs.join(' · ') : JSON.stringify(value);
}

function projectBuildings(store) {
  return stableEntries(store).map(building => deepFreeze({
    id: building.id,
    definition: building.identity?.definitionId ?? building.definitionId ?? '—',
    lifecycle: building.lifecycle?.state ?? building.lifecycle?.status ?? compactObject(building.lifecycle),
    position: compactPosition(building.position) ?? '—',
    stock: building.stock ?? building.buildingStock ?? null,
    construction: building.construction ?? building.constructionState ?? null,
    production: building.production ?? building.productionState ?? null,
  }));
}

function projectPersons(store) {
  return stableEntries(store).map(person => deepFreeze({
    id: person.id,
    position: compactPosition(person.position) ?? '—',
    resident: person.resident ?? person.identity?.resident ?? null,
    workforce: person.workforce ?? person.workforceProfile ?? person.assignment ?? null,
    carrier: person.carrier ?? null,
  }));
}

function projectJobs(store) {
  return stableEntries(store).map(job => deepFreeze({
    id: job.id,
    status: job.status ?? job.state ?? job.execution?.state ?? '—',
    carrierId: job.carrierId ?? job.assignedCarrierId ?? job.assignment?.carrierId ?? null,
    source: job.source ?? job.pickup ?? job.sourceBuildingId ?? null,
    target: job.target ?? job.delivery ?? job.targetBuildingId ?? null,
    resource: job.resource ?? job.resourceId ?? job.resourceType ?? null,
    amount: job.amount ?? job.quantity ?? null,
  }));
}

function projectResources(store) {
  return stableEntries(store).map(resource => deepFreeze({
    id: resource.id,
    type: resource.type ?? resource.resourceType ?? resource.definitionId ?? '—',
    amount: resource.amount ?? resource.quantity ?? null,
    location: resource.location ?? null,
  }));
}

function projectNavigation(runtime) {
  const validations = Array.isArray(runtime.runtimeNavigationValidations)
    ? runtime.runtimeNavigationValidations.map(entry => deepFreeze(structuredClone(entry)))
    : [];
  const movement = runtime.carrierMovementEvidence
    ? deepFreeze(structuredClone(runtime.carrierMovementEvidence))
    : null;
  const reachability = runtime.reachabilityEvidence
    ? deepFreeze(structuredClone(runtime.reachabilityEvidence))
    : null;
  return deepFreeze({ validations, movement, reachability });
}

export function projectStructuredRuntimeDiagnostics({ runtime = window.CleanRuntime } = {}) {
  const source = requireRuntime(runtime);
  return deepFreeze({
    kind: 'im15b-structured-runtime-diagnostics',
    buildings: projectBuildings(source.domains.buildings),
    persons: projectPersons(source.domains.units),
    jobs: projectJobs(source.domains.jobs),
    resources: projectResources(source.domains.resources),
    navigation: projectNavigation(source),
    paths: source.pathClassification.entries().map(entry => deepFreeze(structuredClone(entry))),
    unavailable: Object.freeze([
      'live occupancy/reservations/queues/deadlocks',
      'complete live route registry',
      'live wear state',
    ]),
  });
}

function line(value) {
  if (value == null) return '—';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value);
  return compactObject(value);
}

function renderLines(root, selector, lines, emptyText = 'none') {
  const element = root.querySelector(selector);
  if (!element) throw new TypeError(`IM-15B diagnostic field required: ${selector}`);
  element.textContent = lines.length > 0 ? lines.join('\n') : emptyText;
}

export function renderStructuredRuntimeDiagnostics(diagnostics, root = document) {
  if (diagnostics?.kind !== 'im15b-structured-runtime-diagnostics') {
    throw new TypeError('IM-15B diagnostics required');
  }

  renderLines(root, '#inspector-diag-buildings', diagnostics.buildings.map(entry => {
    const optional = [
      entry.stock ? `stock: ${line(entry.stock)}` : null,
      entry.construction ? `construction: ${line(entry.construction)}` : null,
      entry.production ? `production: ${line(entry.production)}` : null,
    ].filter(Boolean).join(' · ');
    return `${entry.id} · ${entry.definition} · ${entry.lifecycle} · pos ${entry.position}${optional ? ` · ${optional}` : ''}`;
  }));

  renderLines(root, '#inspector-diag-persons', diagnostics.persons.map(entry => {
    const optional = [
      entry.resident ? `resident: ${line(entry.resident)}` : null,
      entry.workforce ? `workforce: ${line(entry.workforce)}` : null,
      entry.carrier ? `carrier: ${line(entry.carrier)}` : null,
    ].filter(Boolean).join(' · ');
    return `${entry.id} · pos ${entry.position}${optional ? ` · ${optional}` : ''}`;
  }));

  renderLines(root, '#inspector-diag-jobs', diagnostics.jobs.map(entry => {
    return `${entry.id} · ${entry.status}${entry.carrierId ? ` · carrier ${entry.carrierId}` : ''}${entry.resource ? ` · ${line(entry.resource)}` : ''}${entry.amount != null ? ` × ${entry.amount}` : ''}`;
  }));

  renderLines(root, '#inspector-diag-resources', diagnostics.resources.map(entry => {
    return `${entry.id} · ${entry.type}${entry.amount != null ? ` · amount ${entry.amount}` : ''}${entry.location ? ` · ${line(entry.location)}` : ''}`;
  }));

  const navigationLines = [];
  if (diagnostics.navigation.movement) {
    const movement = diagnostics.navigation.movement;
    navigationLines.push(`movement · ${movement.unitId ?? movement.carrierId ?? '—'} · ${movement.state ?? '—'} · ${line(movement.currentPosition)} → ${line(movement.targetPosition)}`);
  }
  for (const validation of diagnostics.navigation.validations) {
    navigationLines.push(`validation · ${validation.kind ?? 'navigation'} · ${validation.valid === true ? 'VALID' : validation.valid === false ? 'INVALID' : '—'}`);
  }
  if (diagnostics.navigation.reachability) {
    navigationLines.push(`reachability · ${diagnostics.navigation.reachability.reachable === true ? 'REACHABLE' : diagnostics.navigation.reachability.reachable === false ? 'BLOCKED' : line(diagnostics.navigation.reachability)}`);
  }
  renderLines(root, '#inspector-diag-navigation', navigationLines);

  renderLines(root, '#inspector-diag-paths', diagnostics.paths.map(entry => {
    const position = entry.position ?? entry.cell ?? (Number.isFinite(entry.x) && Number.isFinite(entry.y) ? { x: entry.x, y: entry.y } : null);
    return `${entry.cellId ?? line(position)} · ${entry.traversalType ?? entry.type ?? entry.classification ?? '—'}`;
  }));

  renderLines(root, '#inspector-diag-unavailable', diagnostics.unavailable, 'none');

  const summary = root.querySelector('#inspector-diag-summary');
  if (!summary) throw new TypeError('IM-15B diagnostic summary required');
  summary.textContent = `${diagnostics.buildings.length} Buildings · ${diagnostics.persons.length} Persons · ${diagnostics.jobs.length} Jobs · ${diagnostics.resources.length} Resources · ${diagnostics.paths.length} Paths`;

  return diagnostics;
}

export function createStructuredRuntimeDiagnosticsController({
  runtime = window.CleanRuntime,
  root = document,
  refreshMs = 250,
} = {}) {
  requireRuntime(runtime);
  if (!Number.isFinite(refreshMs) || refreshMs < 50) throw new TypeError('IM-15B refreshMs must be >= 50');

  let current = null;
  function refresh() {
    current = projectStructuredRuntimeDiagnostics({ runtime });
    renderStructuredRuntimeDiagnostics(current, root);
    return current;
  }

  refresh();
  const timer = window.setInterval(refresh, refreshMs);
  return Object.freeze({
    kind: 'im15b-structured-runtime-diagnostics-controller',
    refresh,
    getCurrentDiagnostics: () => current,
    destroy() { window.clearInterval(timer); },
  });
}

const inspectorShell = document.querySelector('[data-ui-shell="inspector"]');
if (inspectorShell && window.CleanRuntime) {
  window.IM15BInspectorDiagnostics = createStructuredRuntimeDiagnosticsController({
    runtime: window.CleanRuntime,
    root: document,
  });

  const status = document.querySelector('#test-status');
  if (status) {
    status.textContent = 'IM-15B — IMPLEMENTED / NOT FROZEN — Structured Runtime Diagnostics aktiv · Buildings/Persons/Jobs/Resources/Navigation/Paths ausschließlich read-only projiziert';
    status.dataset.pass = 'pending';
  }
}
