import { parseStableId } from '../world/stable-id.js';

const SAVEGAME_KIND = 'savegame-snapshot';
const SCHEMA_VERSION = 1;
const RESULT_KIND = 'savegame-validation-result';
const EXPECTED_DOMAINS = Object.freeze({
  buildings: 'building',
  units: 'unit',
  resources: 'resource',
  jobs: 'transport-job',
});

function deepFreeze(value) {
  if (value == null || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function isObject(value) {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

function isSafeNonNegativeInteger(value) {
  return Number.isSafeInteger(value) && value >= 0;
}

function isSafePositiveInteger(value) {
  return Number.isSafeInteger(value) && value >= 1;
}

function errorKey(error) {
  return `${error.path}\u0000${error.code}`;
}

function createCollector() {
  const errors = [];
  const seen = new Set();
  return {
    add(code, path) {
      const error = { code: String(code), path: String(path) };
      const key = errorKey(error);
      if (seen.has(key)) return;
      seen.add(key);
      errors.push(error);
    },
    result() {
      errors.sort((a, b) => errorKey(a).localeCompare(errorKey(b)));
      return errors;
    },
  };
}

function validateStableId(value, path, collector, expectedKind = null) {
  const parsed = parseStableId(value);
  if (!parsed) {
    collector.add('INVALID_STABLE_ID', path);
    return null;
  }
  if (expectedKind && parsed.kind !== expectedKind) collector.add('STABLE_ID_KIND_MISMATCH', path);
  return parsed;
}

function validateAllocator(allocator, ids, path, collector) {
  if (!isObject(allocator)) {
    collector.add('INVALID_ALLOCATOR', path);
    return;
  }

  for (const [kind, next] of Object.entries(allocator)) {
    if (!/^[a-z][a-z0-9-]*$/.test(kind) || !isSafePositiveInteger(next)) {
      collector.add('INVALID_ALLOCATOR_ENTRY', `${path}.${kind}`);
    }
  }

  const maxByKind = new Map();
  for (const id of ids) {
    const parsed = parseStableId(id);
    if (!parsed) continue;
    maxByKind.set(parsed.kind, Math.max(maxByKind.get(parsed.kind) ?? 0, parsed.sequence));
  }
  for (const [kind, maxSequence] of maxByKind) {
    const next = allocator[kind];
    if (!isSafePositiveInteger(next) || next <= maxSequence) {
      collector.add('ALLOCATOR_REUSE_RISK', `${path}.${kind}`);
    }
  }
}

function registerGlobalId(id, path, globalIds, collector) {
  if (!parseStableId(id)) return;
  const prior = globalIds.get(id);
  if (prior && prior !== path) collector.add('DUPLICATE_STABLE_ID', path);
  else globalIds.set(id, path);
}

function validateWorld(snapshot, collector, globalIds) {
  const world = snapshot?.world;
  if (!isObject(world) || !isObject(world.state) || !isObject(world.allocator)) {
    collector.add('INVALID_WORLD_SECTION', 'world');
    return { entities: {}, worldIds: [] };
  }

  const state = world.state;
  const worldId = validateStableId(state.worldId, 'world.state.worldId', collector, 'world');
  const entities = isObject(state.entities) ? state.entities : {};
  if (!isObject(state.entities)) collector.add('INVALID_WORLD_ENTITIES', 'world.state.entities');
  if (!isSafeNonNegativeInteger(state.revision)) collector.add('INVALID_REVISION', 'world.state.revision');

  const worldIds = [];
  if (worldId) {
    worldIds.push(worldId.id);
    registerGlobalId(worldId.id, 'world.state.worldId', globalIds, collector);
  }

  for (const id of Object.keys(entities).sort()) {
    const entity = entities[id];
    const parsed = validateStableId(id, `world.state.entities.${id}`, collector);
    if (parsed) {
      worldIds.push(id);
      registerGlobalId(id, `world.state.entities.${id}`, globalIds, collector);
    }
    if (!isObject(entity)) {
      collector.add('INVALID_WORLD_ENTITY', `world.state.entities.${id}`);
      continue;
    }
    if (entity.id !== id) collector.add('ENTITY_ID_KEY_MISMATCH', `world.state.entities.${id}.id`);
    if (typeof entity.kind !== 'string' || entity.kind.length === 0) collector.add('MISSING_ENTITY_KIND', `world.state.entities.${id}.kind`);
  }

  validateAllocator(world.allocator, worldIds, 'world.allocator', collector);
  return { entities, worldIds };
}

function validateMap(snapshot, entities, collector) {
  const map = snapshot?.map;
  if (!isObject(map)) {
    collector.add('INVALID_MAP_SECTION', 'map');
    return new Set();
  }

  const mapId = validateStableId(map.mapId, 'map.mapId', collector, 'map');
  const defaultTileId = validateStableId(map.defaultTileId, 'map.defaultTileId', collector, 'tile');
  const dimensions = map.dimensions;
  const width = dimensions?.width;
  const height = dimensions?.height;
  if (!isObject(dimensions) || !isSafePositiveInteger(width) || !isSafePositiveInteger(height)) {
    collector.add('INVALID_MAP_DIMENSIONS', 'map.dimensions');
  }

  if (mapId) {
    const entity = entities[mapId.id];
    if (!entity || entity.kind !== 'map') collector.add('DANGLING_MAP_REFERENCE', 'map.mapId');
    else if (isObject(dimensions) && (entity.width !== width || entity.height !== height)) collector.add('MAP_DIMENSIONS_MISMATCH', 'map.dimensions');
  }
  if (defaultTileId) {
    const entity = entities[defaultTileId.id];
    if (!entity || entity.kind !== 'tile') collector.add('DANGLING_TILE_REFERENCE', 'map.defaultTileId');
  }

  if (!Array.isArray(map.cellIds)) {
    collector.add('INVALID_CELL_ID_LIST', 'map.cellIds');
    return new Set();
  }
  const cellIds = new Set();
  for (let index = 0; index < map.cellIds.length; index += 1) {
    const id = map.cellIds[index];
    const path = `map.cellIds.${index}`;
    const parsed = validateStableId(id, path, collector, 'cell');
    if (!parsed) continue;
    if (cellIds.has(id)) collector.add('DUPLICATE_MAP_CELL_ID', path);
    cellIds.add(id);
    const cell = entities[id];
    if (!cell || cell.kind !== 'cell') {
      collector.add('DANGLING_CELL_REFERENCE', path);
      continue;
    }
    if (mapId && cell.mapId !== mapId.id) collector.add('CELL_MAP_REFERENCE_MISMATCH', `world.state.entities.${id}.mapId`);
    const tile = entities[cell.tileId];
    if (!parseStableId(cell.tileId) || !tile || tile.kind !== 'tile') collector.add('DANGLING_TILE_REFERENCE', `world.state.entities.${id}.tileId`);
  }
  if (isSafePositiveInteger(width) && isSafePositiveInteger(height) && map.cellIds.length !== width * height) {
    collector.add('MAP_CELL_COUNT_MISMATCH', 'map.cellIds');
  }
  return cellIds;
}

function walkDomainReferences(value, path, ownId, globalIds, collector) {
  if (Array.isArray(value)) {
    value.forEach((child, index) => walkDomainReferences(child, `${path}.${index}`, ownId, globalIds, collector));
    return;
  }
  if (!isObject(value)) return;
  for (const [key, child] of Object.entries(value)) {
    const childPath = `${path}.${key}`;
    if (key !== 'id' && key !== 'definitionId' && /Id$/.test(key) && typeof child === 'string') {
      const parsed = parseStableId(child);
      if (parsed && child !== ownId && !globalIds.has(child)) collector.add('DANGLING_DOMAIN_REFERENCE', childPath);
    }
    walkDomainReferences(child, childPath, ownId, globalIds, collector);
  }
}

function validateDomains(snapshot, collector, globalIds) {
  const domains = snapshot?.domains;
  if (!isObject(domains)) {
    collector.add('INVALID_DOMAINS_SECTION', 'domains');
    return [];
  }

  const actualNames = Object.keys(domains).sort();
  const expectedNames = Object.keys(EXPECTED_DOMAINS).sort();
  if (actualNames.join('|') !== expectedNames.join('|')) collector.add('DOMAIN_SET_MISMATCH', 'domains');

  const itemsForReferencePass = [];
  for (const name of expectedNames) {
    const section = domains[name];
    const path = `domains.${name}`;
    if (!isObject(section) || !isObject(section.state) || !isObject(section.allocator)) {
      collector.add('INVALID_DOMAIN_SECTION', path);
      continue;
    }
    const items = section.state.items;
    if (!isObject(items)) {
      collector.add('INVALID_DOMAIN_ITEMS', `${path}.state.items`);
      continue;
    }
    if (!isSafeNonNegativeInteger(section.state.revision)) collector.add('INVALID_REVISION', `${path}.state.revision`);

    const domainIds = [];
    for (const id of Object.keys(items).sort()) {
      const item = items[id];
      const itemPath = `${path}.state.items.${id}`;
      const parsed = validateStableId(id, itemPath, collector, EXPECTED_DOMAINS[name]);
      if (parsed) {
        domainIds.push(id);
        registerGlobalId(id, itemPath, globalIds, collector);
      }
      if (!isObject(item)) {
        collector.add('INVALID_DOMAIN_ITEM', itemPath);
        continue;
      }
      if (item.id !== id) collector.add('ITEM_ID_KEY_MISMATCH', `${itemPath}.id`);
      if (item.kind !== EXPECTED_DOMAINS[name]) collector.add('ITEM_KIND_MISMATCH', `${itemPath}.kind`);
      itemsForReferencePass.push({ item, path: itemPath, ownId: id });
    }
    validateAllocator(section.allocator, domainIds, `${path}.allocator`, collector);
  }
  return itemsForReferencePass;
}

function validateGold(snapshot, collector) {
  const gold = snapshot?.economy?.gold;
  if (!isObject(snapshot?.economy) || !isObject(gold)) {
    collector.add('INVALID_GOLD_SECTION', 'economy.gold');
    return;
  }
  if (gold.kind !== 'gold-economy-state') collector.add('INVALID_GOLD_KIND', 'economy.gold.kind');
  if (!isSafeNonNegativeInteger(gold.balance)) collector.add('INVALID_GOLD_BALANCE', 'economy.gold.balance');
  if (gold.physical !== false) collector.add('GOLD_MUST_BE_NON_PHYSICAL', 'economy.gold.physical');
}

function validateWear(snapshot, cellIds, entities, collector) {
  const entries = snapshot?.pathWear?.entries;
  if (!isObject(snapshot?.pathWear) || !Array.isArray(entries)) {
    collector.add('INVALID_PATH_WEAR_SECTION', 'pathWear.entries');
    return;
  }
  const seen = new Set();
  for (let index = 0; index < entries.length; index += 1) {
    const entry = entries[index];
    const path = `pathWear.entries.${index}`;
    if (!isObject(entry)) {
      collector.add('INVALID_WEAR_ENTRY', path);
      continue;
    }
    const parsed = validateStableId(entry.cellId, `${path}.cellId`, collector, 'cell');
    if (parsed) {
      if (seen.has(entry.cellId)) collector.add('DUPLICATE_WEAR_CELL_ID', `${path}.cellId`);
      seen.add(entry.cellId);
      if (!cellIds.has(entry.cellId)) collector.add('DANGLING_WEAR_CELL_REFERENCE', `${path}.cellId`);
    }
    if (entry.traversalType !== 'PATH' && entry.traversalType !== 'ROAD') collector.add('INVALID_WEAR_TRAVERSAL_TYPE', `${path}.traversalType`);
    if (!isSafeNonNegativeInteger(entry.usageCount)) collector.add('INVALID_WEAR_USAGE_COUNT', `${path}.usageCount`);
    if (!isSafeNonNegativeInteger(entry.wearUnits)) collector.add('INVALID_WEAR_UNITS', `${path}.wearUnits`);
    if (isSafeNonNegativeInteger(entry.usageCount) && isSafeNonNegativeInteger(entry.wearUnits) && entry.usageCount !== entry.wearUnits) {
      collector.add('WEAR_USAGE_MISMATCH', path);
    }
    if (parsed && cellIds.has(entry.cellId)) {
      const cell = entities[entry.cellId];
      const tile = cell ? entities[cell.tileId] : null;
      if (!tile || tile.traversalType !== entry.traversalType) collector.add('WEAR_TRAVERSAL_TYPE_MISMATCH', `${path}.traversalType`);
    }
  }
}

function validateCapture(snapshot, collector) {
  const capture = snapshot?.capture;
  if (!isObject(capture)) {
    collector.add('INVALID_CAPTURE_SECTION', 'capture');
    return;
  }
  if (capture.boundaryKind !== 'completed-simulation-step-boundary') collector.add('INVALID_CAPTURE_BOUNDARY', 'capture.boundaryKind');
  if (!isSafeNonNegativeInteger(capture.stepIndex)) collector.add('INVALID_CAPTURE_STEP', 'capture.stepIndex');
}

export class SaveGameValidationContract {
  static get resultKind() { return RESULT_KIND; }
  static get schemaVersion() { return SCHEMA_VERSION; }

  static validate(snapshot) {
    const collector = createCollector();
    if (!isObject(snapshot)) {
      collector.add('INVALID_PAYLOAD', '$');
    } else {
      if (snapshot.kind !== SAVEGAME_KIND) collector.add('INVALID_SAVEGAME_KIND', 'kind');
      if (snapshot.schemaVersion !== SCHEMA_VERSION) collector.add('UNSUPPORTED_SCHEMA_VERSION', 'schemaVersion');
      validateCapture(snapshot, collector);
      const globalIds = new Map();
      const { entities } = validateWorld(snapshot, collector, globalIds);
      const cellIds = validateMap(snapshot, entities, collector);
      const domainItems = validateDomains(snapshot, collector, globalIds);
      for (const { item, path, ownId } of domainItems) walkDomainReferences(item, path, ownId, globalIds, collector);
      validateGold(snapshot, collector);
      validateWear(snapshot, cellIds, entities, collector);
    }

    const errors = collector.result();
    return deepFreeze({
      kind: RESULT_KIND,
      schemaVersion: SCHEMA_VERSION,
      status: errors.length === 0 ? 'VALID' : 'INVALID',
      errors,
    });
  }
}
