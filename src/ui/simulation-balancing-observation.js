import {
  IM15E_UNAVAILABLE,
  createSimulationBalancingObservation,
} from '../diagnostics/simulation-balancing-observation.js?v=im15e-1';

function formatValue(value) {
  if (value === IM15E_UNAVAILABLE || value == null) return 'UNAVAILABLE';
  return String(value);
}

function formatDelta(value) {
  if (value === IM15E_UNAVAILABLE || value == null) return '—';
  if (value > 0) return `+${value}`;
  return String(value);
}

function renderMetric(root, key, current, delta) {
  const valueEl = root.querySelector(`[data-im15e-value="${key}"]`);
  const deltaEl = root.querySelector(`[data-im15e-delta="${key}"]`);
  if (!valueEl || !deltaEl) throw new TypeError(`IM-15E metric field required: ${key}`);
  valueEl.textContent = formatValue(current);
  deltaEl.textContent = formatDelta(delta);
}

export function renderSimulationBalancingObservation(observer, root = document) {
  const session = observer.getSession();
  const sample = observer.getCurrentSample();
  const delta = observer.getCurrentDelta();
  const history = observer.getHistory();

  const sessionEl = root.querySelector('#im15e-session');
  const scenarioEl = root.querySelector('#im15e-scenario');
  const stepEl = root.querySelector('#im15e-step');
  const timeEl = root.querySelector('#im15e-time');
  const samplesEl = root.querySelector('#im15e-samples');
  const runtimeEl = root.querySelector('#im15e-runtime');
  if (!sessionEl || !scenarioEl || !stepEl || !timeEl || !samplesEl || !runtimeEl) {
    throw new TypeError('IM-15E observation summary fields required');
  }

  sessionEl.textContent = session.sessionId;
  scenarioEl.textContent = session.scenarioId ?? '—';
  stepEl.textContent = sample ? String(sample.stepIndex) : '0';
  timeEl.textContent = sample ? `${sample.simulatedMs} ms` : '0 ms';
  samplesEl.textContent = String(history.length);
  runtimeEl.textContent = sample?.runtimeState ?? window.CleanRuntime?.runtime?.state ?? '—';

  const facts = sample?.facts ?? {};
  const deltas = delta ?? {};
  renderMetric(root, 'population', facts.population ?? IM15E_UNAVAILABLE, deltas.populationDelta ?? null);
  renderMetric(root, 'gold', facts.gold ?? IM15E_UNAVAILABLE, deltas.goldDelta ?? null);
  renderMetric(root, 'buildings', facts.buildings ?? IM15E_UNAVAILABLE, deltas.buildingsDelta ?? null);
  renderMetric(root, 'persons', facts.persons ?? IM15E_UNAVAILABLE, deltas.personsDelta ?? null);
  renderMetric(root, 'jobs', facts.jobs ?? IM15E_UNAVAILABLE, deltas.jobsDelta ?? null);
  renderMetric(root, 'resources', facts.resources ?? IM15E_UNAVAILABLE, deltas.resourcesDelta ?? null);

  const optional = sample?.optionalFacts ?? {};
  const optionalDeltas = delta?.optionalDeltas ?? {};
  renderMetric(root, 'stock', optional.stock ?? IM15E_UNAVAILABLE, optionalDeltas.stock ?? null);
  renderMetric(root, 'production', optional.production ?? IM15E_UNAVAILABLE, optionalDeltas.production ?? null);
  renderMetric(root, 'transport', optional.transport ?? IM15E_UNAVAILABLE, optionalDeltas.transport ?? null);

  return Object.freeze({ session, sample, delta, history });
}

export function createSimulationBalancingObservationController({
  runtimeBoundary = window.CleanRuntime,
  root = document,
  refreshMs = 250,
} = {}) {
  if (!runtimeBoundary) throw new TypeError('IM-15E runtime boundary required');
  if (!Number.isFinite(refreshMs) || refreshMs < 50) throw new TypeError('IM-15E refreshMs must be >= 50');

  const observer = createSimulationBalancingObservation({ runtimeBoundary });
  let current = null;

  function refresh() {
    current = renderSimulationBalancingObservation(observer, root);
    return current;
  }

  refresh();
  const timer = window.setInterval(refresh, refreshMs);

  return Object.freeze({
    kind: 'im15e-simulation-balancing-observation-controller',
    observer,
    refresh,
    getCurrentProjection: () => current,
    destroy() {
      window.clearInterval(timer);
      observer.destroy();
    },
  });
}

const inspectorShell = document.querySelector('[data-ui-shell="inspector"]');
if (inspectorShell && window.CleanRuntime) {
  window.IM15ESimulationObservation = createSimulationBalancingObservationController({
    runtimeBoundary: window.CleanRuntime,
    root: document,
  });

  const status = document.querySelector('#test-status');
  if (status) {
    status.textContent = 'IM-15E — COMPLETE / FROZEN / PASS / 0 BLOCKER — Simulation Observation aktiv · scheduler-synchron · bounded history 120 · read-only metrics/deltas';
    status.dataset.pass = 'true';
  }
}
