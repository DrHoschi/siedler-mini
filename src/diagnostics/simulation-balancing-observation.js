export const IM15E_OBSERVATION_SYSTEM_ID = 'im15e.simulation-observation';
export const IM15E_OBSERVATION_PHASE = 'maintenance';
export const IM15E_HISTORY_LIMIT = 120;
export const IM15E_UNAVAILABLE = 'UNAVAILABLE';

function deepFreeze(value) {
  if (value == null || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function requireRuntimeBoundary(runtimeBoundary) {
  if (!runtimeBoundary?.runtime?.scheduler || typeof runtimeBoundary.runtime.scheduler.register !== 'function') {
    throw new TypeError('IM-15E Scheduler registration boundary required');
  }
  if (typeof runtimeBoundary.getActiveRuntimeComposition !== 'function') {
    throw new TypeError('IM-15E active composition read boundary required');
  }
  if (!runtimeBoundary.domains || !runtimeBoundary.housingPopulation || !runtimeBoundary.goldSettlement) {
    throw new TypeError('IM-15E authoritative runtime read boundary required');
  }
  return runtimeBoundary;
}

function itemCount(store) {
  const snapshot = store.snapshot();
  return Object.keys(snapshot.items ?? {}).length;
}

function numericValue(value) {
  return Number.isFinite(value) ? value : null;
}

function firstNumeric(record, paths) {
  for (const path of paths) {
    let current = record;
    for (const segment of path) current = current?.[segment];
    if (Number.isFinite(current)) return current;
  }
  return null;
}

function aggregateBuildingNumericFact(buildingStore, paths) {
  const snapshot = buildingStore.snapshot();
  const records = Object.values(snapshot.items ?? {});
  let found = false;
  let total = 0;
  for (const record of records) {
    const value = firstNumeric(record, paths);
    if (value != null) {
      found = true;
      total += value;
    }
  }
  return found ? total : IM15E_UNAVAILABLE;
}

function projectOptionalFacts(runtimeBoundary) {
  const buildings = runtimeBoundary.domains.buildings;
  const stock = aggregateBuildingNumericFact(buildings, [
    ['stock', 'amount'],
    ['stock', 'quantity'],
    ['buildingStock', 'amount'],
    ['buildingStock', 'quantity'],
  ]);
  const production = aggregateBuildingNumericFact(buildings, [
    ['production', 'amount'],
    ['production', 'produced'],
    ['productionState', 'amount'],
    ['productionState', 'produced'],
  ]);

  return deepFreeze({
    stock,
    production,
    transport: IM15E_UNAVAILABLE,
  });
}

function deltaValue(previous, current) {
  return Number.isFinite(previous) && Number.isFinite(current)
    ? current - previous
    : IM15E_UNAVAILABLE;
}

function createDelta(previous, current) {
  if (!previous || !current || previous.sessionId !== current.sessionId) return null;
  return deepFreeze({
    kind: 'im15e-simulation-observation-delta',
    sessionId: current.sessionId,
    fromSampleIndex: previous.sampleIndex,
    toSampleIndex: current.sampleIndex,
    populationDelta: deltaValue(previous.facts.population, current.facts.population),
    goldDelta: deltaValue(previous.facts.gold, current.facts.gold),
    buildingsDelta: deltaValue(previous.facts.buildings, current.facts.buildings),
    personsDelta: deltaValue(previous.facts.persons, current.facts.persons),
    jobsDelta: deltaValue(previous.facts.jobs, current.facts.jobs),
    resourcesDelta: deltaValue(previous.facts.resources, current.facts.resources),
    optionalDeltas: deepFreeze({
      stock: deltaValue(previous.optionalFacts.stock, current.optionalFacts.stock),
      production: deltaValue(previous.optionalFacts.production, current.optionalFacts.production),
      transport: deltaValue(previous.optionalFacts.transport, current.optionalFacts.transport),
    }),
  });
}

export function createSimulationBalancingObservation({
  runtimeBoundary = window.CleanRuntime,
  historyLimit = IM15E_HISTORY_LIMIT,
} = {}) {
  const source = requireRuntimeBoundary(runtimeBoundary);
  if (!Number.isInteger(historyLimit) || historyLimit < 1 || historyLimit > IM15E_HISTORY_LIMIT) {
    throw new TypeError(`IM-15E historyLimit must be 1..${IM15E_HISTORY_LIMIT}`);
  }

  let sessionOrdinal = 0;
  let compositionRef = null;
  let session = null;
  let history = [];
  let currentSample = null;
  let currentDelta = null;
  let stepIndex = 0;
  let simulatedMs = 0;

  function beginSession(composition) {
    sessionOrdinal += 1;
    compositionRef = composition;
    stepIndex = 0;
    simulatedMs = 0;
    history = [];
    currentSample = null;
    currentDelta = null;
    session = deepFreeze({
      kind: 'im15e-simulation-observation-session',
      sessionId: `session:${String(sessionOrdinal).padStart(4, '0')}`,
      scenarioId: composition?.scenarioId ?? null,
      historyLimit,
    });
    return session;
  }

  function syncSession() {
    const composition = source.getActiveRuntimeComposition();
    if (composition !== compositionRef || !session) beginSession(composition);
    return session;
  }

  function sample(dtMs) {
    const activeSession = syncSession();
    if (!Number.isFinite(dtMs) || dtMs <= 0) throw new TypeError('IM-15E positive Scheduler dtMs required');

    const domains = source.domains;
    const previous = currentSample;
    stepIndex += 1;
    simulatedMs += dtMs;

    const facts = deepFreeze({
      population: numericValue(source.housingPopulation?.population?.count) ?? IM15E_UNAVAILABLE,
      gold: numericValue(source.goldSettlement?.state?.balance) ?? IM15E_UNAVAILABLE,
      buildings: itemCount(domains.buildings),
      persons: itemCount(domains.units),
      jobs: itemCount(domains.jobs),
      resources: itemCount(domains.resources),
    });

    currentSample = deepFreeze({
      kind: 'im15e-simulation-observation-sample',
      sessionId: activeSession.sessionId,
      scenarioId: activeSession.scenarioId,
      sampleIndex: history.length === 0 ? 1 : (history[history.length - 1].sampleIndex + 1),
      stepIndex,
      stepMs: dtMs,
      simulatedMs,
      runtimeState: source.runtime.state,
      facts,
      optionalFacts: projectOptionalFacts(source),
    });

    currentDelta = createDelta(previous, currentSample);
    history.push(currentSample);
    if (history.length > historyLimit) history = history.slice(history.length - historyLimit);
    return currentSample;
  }

  const unregister = source.runtime.scheduler.register({
    id: IM15E_OBSERVATION_SYSTEM_ID,
    phase: IM15E_OBSERVATION_PHASE,
    tick: sample,
  });

  syncSession();

  return Object.freeze({
    kind: 'im15e-simulation-balancing-observation',
    systemId: IM15E_OBSERVATION_SYSTEM_ID,
    phase: IM15E_OBSERVATION_PHASE,
    historyLimit,
    getSession() { syncSession(); return session; },
    getCurrentSample() { syncSession(); return currentSample; },
    getCurrentDelta() { syncSession(); return currentDelta; },
    getHistory() { syncSession(); return Object.freeze([...history]); },
    destroy() { unregister?.(); },
  });
}
