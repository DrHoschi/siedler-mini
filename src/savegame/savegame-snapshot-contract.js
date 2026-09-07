const SAVEGAME_KIND = 'savegame-snapshot';
const SCHEMA_VERSION = 1;

function clone(value) {
  return value == null ? value : structuredClone(value);
}

function deepFreeze(value) {
  if (value == null || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function requireSafeNonNegativeInteger(value, name) {
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n < 0) throw new TypeError(`${name} must be a non-negative safe integer`);
  return n;
}

function requireCaptureBoundary(boundary) {
  if (boundary?.kind !== 'completed-simulation-step-boundary' || boundary?.status !== 'COMPLETED') {
    throw new TypeError('completed simulation-step boundary required');
  }
  return Object.freeze({
    kind: boundary.kind,
    status: boundary.status,
    stepIndex: requireSafeNonNegativeInteger(boundary.stepIndex, 'stepIndex'),
  });
}

function requireWorld(world) {
  if (!world || typeof world.snapshot !== 'function' || typeof world.idSnapshot !== 'function') {
    throw new TypeError('WorldStore-compatible world required');
  }
  const state = clone(world.snapshot());
  if (!state?.worldId || !state?.entities || typeof state.entities !== 'object') {
    throw new TypeError('invalid world snapshot');
  }
  return Object.freeze({ state, allocator: clone(world.idSnapshot()) });
}

function requireMap(map) {
  if (!map || typeof map.snapshot !== 'function' || typeof map.cellIds !== 'function' || typeof map.dimensions !== 'function') {
    throw new TypeError('MapStructure-compatible map required');
  }
  const snapshot = map.snapshot();
  const dimensions = map.dimensions();
  const cellIds = [...map.cellIds()].sort((a, b) => a.localeCompare(b));
  if (!snapshot?.map?.id || !snapshot?.defaultTileId) throw new TypeError('invalid map snapshot');
  return Object.freeze({
    mapId: snapshot.map.id,
    defaultTileId: snapshot.defaultTileId,
    dimensions: clone(dimensions),
    cellIds,
  });
}

function requireDomains(domains) {
  if (!domains || typeof domains.names !== 'function') throw new TypeError('CoreDomainStores-compatible domains required');
  const names = [...domains.names()].sort((a, b) => a.localeCompare(b));
  const result = {};
  for (const name of names) {
    const store = domains[name];
    if (!store || typeof store.snapshot !== 'function' || typeof store.idSnapshot !== 'function') {
      throw new TypeError(`domain store missing snapshot contract: ${name}`);
    }
    result[name] = {
      state: clone(store.snapshot()),
      allocator: clone(store.idSnapshot()),
    };
  }
  return result;
}

function requireGold(gold) {
  if (!gold || typeof gold.snapshot !== 'function') throw new TypeError('GoldEconomyOwner-compatible gold owner required');
  const state = clone(gold.snapshot());
  if (state?.kind !== 'gold-economy-state') throw new TypeError('invalid gold state');
  requireSafeNonNegativeInteger(state.balance, 'gold balance');
  if (state.physical !== false) throw new TypeError('gold must remain non-physical');
  return state;
}

function requireWear(wear) {
  if (!wear || typeof wear.entries !== 'function') throw new TypeError('CR-32B wear source required');
  const entries = [...wear.entries()].map(entry => {
    if (!entry?.cellId || (entry.traversalType !== 'PATH' && entry.traversalType !== 'ROAD')) {
      throw new TypeError('invalid PATH/ROAD wear entry');
    }
    const usageCount = requireSafeNonNegativeInteger(entry.usageCount, 'usageCount');
    const wearUnits = requireSafeNonNegativeInteger(entry.wearUnits, 'wearUnits');
    if (usageCount !== wearUnits) throw new Error('CR-32B usageCount/wearUnits mismatch');
    return {
      cellId: String(entry.cellId),
      traversalType: entry.traversalType,
      usageCount,
      wearUnits,
    };
  }).sort((a, b) => a.cellId.localeCompare(b.cellId));
  const ids = entries.map(entry => entry.cellId);
  if (new Set(ids).size !== ids.length) throw new Error('duplicate wear cellId');
  return entries;
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    const result = {};
    for (const key of Object.keys(value).sort()) result[key] = canonicalize(value[key]);
    return result;
  }
  return value;
}

export class SaveGameSnapshotContract {
  static get kind() { return SAVEGAME_KIND; }
  static get schemaVersion() { return SCHEMA_VERSION; }

  static completedStepBoundary(stepIndex) {
    return deepFreeze({
      kind: 'completed-simulation-step-boundary',
      status: 'COMPLETED',
      stepIndex: requireSafeNonNegativeInteger(stepIndex, 'stepIndex'),
    });
  }

  static capture({ boundary, world, map, domains, gold, wear } = {}) {
    const completedBoundary = requireCaptureBoundary(boundary);
    const worldState = requireWorld(world);
    const mapState = requireMap(map);
    const domainState = requireDomains(domains);
    const goldState = requireGold(gold);
    const wearEntries = requireWear(wear);

    const payload = {
      kind: SAVEGAME_KIND,
      schemaVersion: SCHEMA_VERSION,
      capture: {
        boundaryKind: completedBoundary.kind,
        stepIndex: completedBoundary.stepIndex,
      },
      world: worldState,
      map: mapState,
      domains: domainState,
      economy: { gold: goldState },
      pathWear: { entries: wearEntries },
    };

    return deepFreeze(payload);
  }

  static serialize(snapshot) {
    if (snapshot?.kind !== SAVEGAME_KIND || snapshot?.schemaVersion !== SCHEMA_VERSION) {
      throw new TypeError('IM-13A schemaVersion 1 SaveGame snapshot required');
    }
    return JSON.stringify(canonicalize(snapshot));
  }
}
