import { parseStableId } from '../world/stable-id.js';
import { SaveGameSnapshotContract } from './savegame-snapshot-contract.js';
import { PersistentStateInventorySaveGameSchemaContract } from './persistent-state-inventory-schema-contract.js';
import { BuildingConstructionProgressTransitionContract } from '../domain/building-construction-progress-transition-contract.js';
import { BuildingStockContract } from '../domain/building-stock-contract.js';
import { BuildingStockTransportReservationContract } from '../domain/building-stock-transport-reservation-contract.js';
import { WorkforceAssignmentStateContract } from '../domain/workforce-assignment-state-contract.js';
import { ResidentHomeAssignmentContract } from '../domain/resident-home-assignment-contract.js';

const SAVEGAME_KIND = 'savegame-snapshot';
const CAPTURE_KIND = 'post-im13-authoritative-snapshot-capture';

function clone(value) {
  return value == null ? value : structuredClone(value);
}

function deepFreeze(value) {
  if (value == null || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
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

function requireCompatible(name, value, methods) {
  if (!value || methods.some((method) => typeof value[method] !== 'function')) {
    throw new TypeError(`${name}-compatible instance required`);
  }
  return value;
}

function allocatorFromIds(ids, expectedKind) {
  let max = 0;
  for (const id of ids) {
    const parsed = parseStableId(id);
    if (!parsed || parsed.kind !== expectedKind) {
      throw new TypeError(`invalid ${expectedKind} id: ${id}`);
    }
    if (parsed.sequence > max) max = parsed.sequence;
  }
  return max === 0 ? Object.freeze({}) : Object.freeze({ [expectedKind]: max + 1 });
}

function normalizeRevision(snapshot, label) {
  const revision = Number(snapshot?.revision);
  if (!Number.isSafeInteger(revision) || revision < 0) {
    throw new TypeError(`${label} revision must be a non-negative safe integer`);
  }
  return revision;
}

function normalizeDemandRecord(value, expectedId) {
  if (!value || value.kind !== 'demand' || value.id !== expectedId) {
    throw new TypeError(`invalid resource demand: ${expectedId}`);
  }
  const parsedId = parseStableId(value.id);
  const consumer = parseStableId(value.consumerId);
  const definition = parseStableId(value.definitionId);
  if (!parsedId || parsedId.kind !== 'demand') throw new TypeError(`invalid demand id: ${value.id}`);
  if (!consumer) throw new TypeError(`invalid demand consumerId: ${value.consumerId}`);
  if (!definition || definition.kind !== 'resource-type') {
    throw new TypeError(`invalid demand definitionId: ${value.definitionId}`);
  }
  const targetAmount = Number(value.targetAmount);
  if (!Number.isSafeInteger(targetAmount) || targetAmount < 1) {
    throw new TypeError('demand targetAmount must be a positive safe integer');
  }
  const state = String(value.state ?? '').trim().toUpperCase();
  if (!['OPEN', 'PARTIAL', 'RESERVED', 'FULFILLED', 'CANCELLED'].includes(state)) {
    throw new TypeError(`invalid demand state: ${value.state}`);
  }
  return deepFreeze({
    id: value.id,
    kind: 'demand',
    consumerId: value.consumerId,
    definitionId: value.definitionId,
    targetAmount,
    state,
    metadata: clone(value.metadata ?? {})
  });
}

function captureDemands(resourceDemands) {
  const owner = requireCompatible('ResourceDemands', resourceDemands, ['ids', 'get', 'snapshot']);
  const ids = [...owner.ids()].sort((a, b) => a.localeCompare(b));
  const snapshot = owner.snapshot();
  const items = {};
  for (const id of ids) items[id] = normalizeDemandRecord(owner.get(id), id);
  return deepFreeze({
    state: {
      revision: normalizeRevision(snapshot, 'ResourceDemands'),
      items
    },
    allocator: allocatorFromIds(ids, 'demand')
  });
}

function normalizeClaimRecord(value, expectedId) {
  if (!value || value.kind !== 'claim' || value.id !== expectedId) {
    throw new TypeError(`invalid resource claim: ${expectedId}`);
  }
  const parsedId = parseStableId(value.id);
  const resource = parseStableId(value.resourceId);
  const consumer = parseStableId(value.consumerId);
  const demand = value.demandId == null ? null : parseStableId(value.demandId);
  if (!parsedId || parsedId.kind !== 'claim') throw new TypeError(`invalid claim id: ${value.id}`);
  if (!resource || resource.kind !== 'resource') throw new TypeError(`invalid claim resourceId: ${value.resourceId}`);
  if (!consumer) throw new TypeError(`invalid claim consumerId: ${value.consumerId}`);
  if (value.demandId != null && (!demand || demand.kind !== 'demand')) {
    throw new TypeError(`invalid claim demandId: ${value.demandId}`);
  }
  const amount = Number(value.amount);
  if (!Number.isSafeInteger(amount) || amount < 1) throw new TypeError('claim amount must be a positive safe integer');
  const state = String(value.state ?? '').trim().toUpperCase();
  if (!['ACTIVE', 'RELEASED', 'CONSUMED'].includes(state)) {
    throw new TypeError(`invalid claim state: ${value.state}`);
  }
  return deepFreeze({
    id: value.id,
    kind: 'claim',
    resourceId: value.resourceId,
    amount,
    consumerId: value.consumerId,
    demandId: value.demandId ?? null,
    state,
    metadata: clone(value.metadata ?? {})
  });
}

function captureClaims(resourceClaims) {
  const owner = requireCompatible('ResourceClaims', resourceClaims, ['ids', 'get', 'snapshot']);
  const ids = [...owner.ids()].sort((a, b) => a.localeCompare(b));
  const snapshot = owner.snapshot();
  const items = {};
  for (const id of ids) items[id] = normalizeClaimRecord(owner.get(id), id);
  return deepFreeze({
    state: {
      revision: normalizeRevision(snapshot, 'ResourceClaims'),
      items
    },
    allocator: allocatorFromIds(ids, 'claim')
  });
}

function normalizeUniqueArray(values, normalize, keyOf, label) {
  if (!Array.isArray(values)) throw new TypeError(`${label} must be an array`);
  const seen = new Set();
  const result = values.map((value) => {
    const normalized = normalize(value);
    const key = keyOf(normalized);
    if (seen.has(key)) throw new Error(`duplicate ${label} key: ${key}`);
    seen.add(key);
    return normalized;
  });
  result.sort((a, b) => keyOf(a).localeCompare(keyOf(b)));
  return Object.freeze(result);
}

function normalizeSettlementIds(values, label) {
  if (!Array.isArray(values)) throw new TypeError(`${label} must be an array`);
  const normalized = values.map((value) => {
    const id = typeof value === 'string' ? value.trim() : '';
    if (!id) throw new TypeError(`${label} must contain non-empty strings`);
    return id;
  });
  if (new Set(normalized).size !== normalized.length) throw new Error(`${label} contains duplicate ids`);
  normalized.sort((a, b) => a.localeCompare(b));
  return Object.freeze(normalized);
}

function capturePostIM13({
  resourceDemands,
  resourceClaims,
  constructionProgress = [],
  buildingStocks = [],
  buildingStockTransportReservations = [],
  workforceAssignments = [],
  homeAssignments = [],
  productionSettlementIds = [],
  goldSettlementIds = []
} = {}) {
  return deepFreeze({
    resourceDemands: captureDemands(resourceDemands),
    resourceClaims: captureClaims(resourceClaims),
    constructionProgress: normalizeUniqueArray(
      constructionProgress,
      (value) => BuildingConstructionProgressTransitionContract.define(value),
      (value) => value.buildingId,
      'construction progress'
    ),
    buildingStocks: normalizeUniqueArray(
      buildingStocks,
      (value) => BuildingStockContract.define(value),
      (value) => `${value.buildingId}|${value.resourceTypeId}`,
      'building stocks'
    ),
    buildingStockTransportReservations: normalizeUniqueArray(
      buildingStockTransportReservations,
      (value) => BuildingStockTransportReservationContract.define(value),
      (value) => value.id,
      'building stock transport reservations'
    ),
    workforceAssignments: normalizeUniqueArray(
      workforceAssignments,
      (value) => WorkforceAssignmentStateContract.define(value),
      (value) => value.personId,
      'workforce assignments'
    ),
    homeAssignments: normalizeUniqueArray(
      homeAssignments,
      (value) => ResidentHomeAssignmentContract.define(value),
      (value) => value.personId,
      'home assignments'
    ),
    settlementFences: deepFreeze({
      production: normalizeSettlementIds(productionSettlementIds, 'production settlement ids'),
      gold: normalizeSettlementIds(goldSettlementIds, 'gold settlement ids')
    })
  });
}

function assertSchemaBoundary(authoritative) {
  const schema = PersistentStateInventorySaveGameSchemaContract.schema();
  const expected = [
    'authoritative.resourceDemands',
    'authoritative.resourceClaims',
    'authoritative.constructionProgress',
    'authoritative.buildingStocks',
    'authoritative.buildingStockTransportReservations',
    'authoritative.workforceAssignments',
    'authoritative.homeAssignments',
    'authoritative.settlementFences.production',
    'authoritative.settlementFences.gold'
  ];
  const missing = expected.filter((section) => !schema.persistedSections.includes(section));
  if (missing.length > 0) throw new Error(`IM-20A persistence inventory missing sections: ${missing.join(', ')}`);
  if (!authoritative || typeof authoritative !== 'object') throw new TypeError('post-IM13 authoritative state required');
  return schema;
}

export class PostIM13AuthoritativeSnapshotIntegration {
  static get kind() {
    return CAPTURE_KIND;
  }

  static get schemaVersion() {
    return PersistentStateInventorySaveGameSchemaContract.targetSchemaVersion;
  }

  static capture({
    boundary,
    world,
    map,
    domains,
    gold,
    wear,
    resourceDemands,
    resourceClaims,
    constructionProgress = [],
    buildingStocks = [],
    buildingStockTransportReservations = [],
    workforceAssignments = [],
    homeAssignments = [],
    productionSettlementIds = [],
    goldSettlementIds = []
  } = {}) {
    const base = SaveGameSnapshotContract.capture({ boundary, world, map, domains, gold, wear });
    const authoritative = capturePostIM13({
      resourceDemands,
      resourceClaims,
      constructionProgress,
      buildingStocks,
      buildingStockTransportReservations,
      workforceAssignments,
      homeAssignments,
      productionSettlementIds,
      goldSettlementIds
    });
    const schema = assertSchemaBoundary(authoritative);

    return deepFreeze({
      ...clone(base),
      schemaVersion: schema.schemaVersion,
      authoritative
    });
  }

  static serialize(snapshot) {
    if (snapshot?.kind !== SAVEGAME_KIND || snapshot?.schemaVersion !== this.schemaVersion) {
      throw new TypeError('IM-20B schemaVersion 2 SaveGame snapshot required');
    }
    if (!snapshot.authoritative || typeof snapshot.authoritative !== 'object') {
      throw new TypeError('IM-20B authoritative snapshot section required');
    }
    return JSON.stringify(canonicalize(snapshot));
  }

  static capabilities() {
    return Object.freeze({
      v2Capture: true,
      postIM13AuthoritativeCapture: true,
      v2Validation: false,
      v2Restore: false,
      derivedStatePersistence: false,
      browserStorage: false,
      continueLifecycle: false
    });
  }
}
