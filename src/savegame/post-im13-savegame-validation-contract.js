import { parseStableId } from '../world/stable-id.js';
import { SaveGameValidationContract } from './savegame-validation-contract.js';
import { BuildingConstructionProgressTransitionContract } from '../domain/building-construction-progress-transition-contract.js';
import { BuildingStockContract } from '../domain/building-stock-contract.js';
import { BuildingStockTransportReservationContract } from '../domain/building-stock-transport-reservation-contract.js';
import { WorkforceAssignmentStateContract } from '../domain/workforce-assignment-state-contract.js';
import { ResidentHomeAssignmentContract } from '../domain/resident-home-assignment-contract.js';
import { PersonWorkforceProfileContract } from '../domain/person-workforce-profile-contract.js';
import { ProductionBuildingStockContract } from '../domain/production-building-stock-contract.js';

const RESULT_KIND = 'post-im13-savegame-validation-result';
const SCHEMA_VERSION = 2;

function clone(value) {
  return value == null ? value : structuredClone(value);
}

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

function createCollector() {
  const errors = [];
  const seen = new Set();
  return {
    add(code, path) {
      const error = { code: String(code), path: String(path) };
      const key = `${error.path}\u0000${error.code}`;
      if (seen.has(key)) return;
      seen.add(key);
      errors.push(error);
    },
    addAll(values) {
      for (const value of values ?? []) this.add(value.code, value.path);
    },
    result() {
      errors.sort((a, b) => {
        const ak = `${a.path}\u0000${a.code}`;
        const bk = `${b.path}\u0000${b.code}`;
        return ak.localeCompare(bk);
      });
      return errors;
    }
  };
}

function validateStableId(value, expectedKind, path, collector) {
  const parsed = parseStableId(value);
  if (!parsed) {
    collector.add('INVALID_STABLE_ID', path);
    return null;
  }
  if (expectedKind && parsed.kind !== expectedKind) {
    collector.add('STABLE_ID_KIND_MISMATCH', path);
    return null;
  }
  return parsed;
}

function validateAllocator(allocator, ids, expectedKind, path, collector) {
  if (!isObject(allocator)) {
    collector.add('INVALID_ALLOCATOR', path);
    return;
  }
  for (const [kind, next] of Object.entries(allocator)) {
    if (!/^[a-z][a-z0-9-]*$/.test(kind) || !isSafePositiveInteger(next)) {
      collector.add('INVALID_ALLOCATOR_ENTRY', `${path}.${kind}`);
    }
  }
  let max = 0;
  for (const id of ids) {
    const parsed = parseStableId(id);
    if (parsed?.kind === expectedKind) max = Math.max(max, parsed.sequence);
  }
  if (max > 0) {
    const next = allocator[expectedKind];
    if (!isSafePositiveInteger(next) || next <= max) {
      collector.add('ALLOCATOR_REUSE_RISK', `${path}.${expectedKind}`);
    }
  }
}

function existingRefs(snapshot) {
  const refs = new Set();
  const world = snapshot?.world?.state;
  if (parseStableId(world?.worldId)) refs.add(world.worldId);
  for (const id of Object.keys(world?.entities ?? {})) {
    if (parseStableId(id)) refs.add(id);
  }
  for (const domain of ['buildings', 'units', 'resources', 'jobs']) {
    for (const id of Object.keys(snapshot?.domains?.[domain]?.state?.items ?? {})) {
      if (parseStableId(id)) refs.add(id);
    }
  }
  return refs;
}

function validateResourceDefinitions(snapshot, collector) {
  const section = snapshot?.authoritative?.definitions?.resourceTypes;
  const path = 'authoritative.definitions.resourceTypes';
  if (!isObject(section) || !isObject(section.state) || !isObject(section.state.items) || !isObject(section.allocator)) {
    collector.add('INVALID_RESOURCE_DEFINITION_SECTION', path);
    return new Set();
  }
  if (!isSafeNonNegativeInteger(section.state.revision)) collector.add('INVALID_REVISION', `${path}.state.revision`);
  const ids = Object.keys(section.state.items).sort();
  const technicalNames = new Set();
  for (const id of ids) {
    const item = section.state.items[id];
    const itemPath = `${path}.state.items.${id}`;
    validateStableId(id, 'resource-type', itemPath, collector);
    if (!isObject(item)) {
      collector.add('INVALID_RESOURCE_DEFINITION', itemPath);
      continue;
    }
    if (item.id !== id) collector.add('ITEM_ID_KEY_MISMATCH', `${itemPath}.id`);
    if (item.kind !== 'resource-type') collector.add('ITEM_KIND_MISMATCH', `${itemPath}.kind`);
    const name = String(item.technicalName ?? '');
    if (!/^[a-z][a-z0-9._-]*$/.test(name)) collector.add('INVALID_RESOURCE_TECHNICAL_NAME', `${itemPath}.technicalName`);
    if (technicalNames.has(name)) collector.add('DUPLICATE_RESOURCE_TECHNICAL_NAME', `${itemPath}.technicalName`);
    technicalNames.add(name);
    if (typeof item.label !== 'string') collector.add('INVALID_RESOURCE_LABEL', `${itemPath}.label`);
    if (!isObject(item.metadata)) collector.add('INVALID_RESOURCE_METADATA', `${itemPath}.metadata`);
  }
  validateAllocator(section.allocator, ids, 'resource-type', `${path}.allocator`, collector);
  return new Set(ids);
}

function validateDefinitions(snapshot, collector, resourceTypeIds, refs) {
  const definitions = snapshot?.authoritative?.definitions;
  if (!isObject(definitions)) {
    collector.add('INVALID_DEFINITIONS_SECTION', 'authoritative.definitions');
    return {
      housingBuildings: new Set(),
      workforcePeople: new Set()
    };
  }

  const housingBuildings = new Set();
  const housing = definitions.housingCapabilities;
  if (!Array.isArray(housing)) collector.add('INVALID_HOUSING_CAPABILITIES', 'authoritative.definitions.housingCapabilities');
  else housing.forEach((value, index) => {
    const path = `authoritative.definitions.housingCapabilities.${index}`;
    if (!isObject(value) || value.kind !== 'building-housing') collector.add('INVALID_HOUSING_CAPABILITY', path);
    const building = validateStableId(value?.buildingId, 'building', `${path}.buildingId`, collector);
    if (building) {
      if (housingBuildings.has(building.id)) collector.add('DUPLICATE_HOUSING_BUILDING', `${path}.buildingId`);
      housingBuildings.add(building.id);
      if (!refs.has(building.id)) collector.add('DANGLING_HOUSING_BUILDING', `${path}.buildingId`);
    }
    if (!isSafeNonNegativeInteger(value?.capacity)) collector.add('INVALID_HOUSING_CAPACITY', `${path}.capacity`);
  });

  const workforcePeople = new Set();
  const profiles = definitions.workforceProfiles;
  if (!Array.isArray(profiles)) collector.add('INVALID_WORKFORCE_PROFILES', 'authoritative.definitions.workforceProfiles');
  else profiles.forEach((value, index) => {
    const path = `authoritative.definitions.workforceProfiles.${index}`;
    try {
      const normalized = PersonWorkforceProfileContract.define(value);
      if (workforcePeople.has(normalized.personId)) collector.add('DUPLICATE_WORKFORCE_PROFILE', `${path}.personId`);
      workforcePeople.add(normalized.personId);
      if (!refs.has(normalized.personId)) collector.add('DANGLING_WORKFORCE_PERSON', `${path}.personId`);
    } catch {
      collector.add('INVALID_WORKFORCE_PROFILE', path);
    }
  });

  const requirementBuildings = new Set();
  const requirements = definitions.workforceRequirements;
  const allowedSpecializations = new Set(Object.values(PersonWorkforceProfileContract.specializations));
  const allowedCapabilities = new Set(Object.values(PersonWorkforceProfileContract.capabilities));
  if (!Array.isArray(requirements)) collector.add('INVALID_WORKFORCE_REQUIREMENTS', 'authoritative.definitions.workforceRequirements');
  else requirements.forEach((value, index) => {
    const path = `authoritative.definitions.workforceRequirements.${index}`;
    if (!isObject(value) || value.kind !== 'operational-building-workforce-requirement-definition') {
      collector.add('INVALID_WORKFORCE_REQUIREMENT', path);
      return;
    }
    const building = validateStableId(value.buildingId, 'building', `${path}.buildingId`, collector);
    if (building) {
      if (requirementBuildings.has(building.id)) collector.add('DUPLICATE_WORKFORCE_REQUIREMENT', `${path}.buildingId`);
      requirementBuildings.add(building.id);
      if (!refs.has(building.id)) collector.add('DANGLING_WORKFORCE_BUILDING', `${path}.buildingId`);
    }
    if (!isSafePositiveInteger(value.count)) collector.add('INVALID_WORKFORCE_REQUIREMENT_COUNT', `${path}.count`);
    if (!allowedSpecializations.has(value.requiredSpecialization)) collector.add('INVALID_WORKFORCE_SPECIALIZATION', `${path}.requiredSpecialization`);
    if (!Array.isArray(value.requiredCapabilities) || value.requiredCapabilities.length < 1) {
      collector.add('INVALID_WORKFORCE_CAPABILITIES', `${path}.requiredCapabilities`);
    } else {
      const seen = new Set();
      value.requiredCapabilities.forEach((capability, capIndex) => {
        if (!allowedCapabilities.has(capability)) collector.add('INVALID_WORKFORCE_CAPABILITY', `${path}.requiredCapabilities.${capIndex}`);
        if (seen.has(capability)) collector.add('DUPLICATE_WORKFORCE_CAPABILITY', `${path}.requiredCapabilities.${capIndex}`);
        seen.add(capability);
      });
    }
  });

  const recipeBuildings = new Set();
  const recipes = definitions.productionRecipes;
  if (!Array.isArray(recipes)) collector.add('INVALID_PRODUCTION_RECIPES', 'authoritative.definitions.productionRecipes');
  else recipes.forEach((value, index) => {
    const path = `authoritative.definitions.productionRecipes.${index}`;
    try {
      const normalized = ProductionBuildingStockContract.define(value);
      if (recipeBuildings.has(normalized.buildingId)) collector.add('DUPLICATE_PRODUCTION_RECIPE', `${path}.buildingId`);
      recipeBuildings.add(normalized.buildingId);
      if (!refs.has(normalized.buildingId)) collector.add('DANGLING_PRODUCTION_BUILDING', `${path}.buildingId`);
      for (const [group, entries] of [['inputs', normalized.inputs], ['outputs', normalized.outputs]]) {
        entries.forEach((entry, entryIndex) => {
          if (!resourceTypeIds.has(entry.resourceTypeId)) {
            collector.add('DANGLING_RESOURCE_TYPE_REFERENCE', `${path}.${group}.${entryIndex}.resourceTypeId`);
          }
        });
      }
    } catch {
      collector.add('INVALID_PRODUCTION_RECIPE', path);
    }
  });

  return { housingBuildings, workforcePeople };
}

function validateDomainResourceDefinitions(snapshot, resourceTypeIds, collector) {
  const resources = snapshot?.domains?.resources?.state?.items ?? {};
  for (const [id, resource] of Object.entries(resources)) {
    if (!resourceTypeIds.has(resource?.definitionId)) {
      collector.add('DANGLING_RESOURCE_TYPE_REFERENCE', `domains.resources.state.items.${id}.definitionId`);
    }
  }
}

function validateDemands(snapshot, resourceTypeIds, refs, collector) {
  const section = snapshot?.authoritative?.resourceDemands;
  const path = 'authoritative.resourceDemands';
  if (!isObject(section) || !isObject(section.state) || !isObject(section.state.items) || !isObject(section.allocator)) {
    collector.add('INVALID_RESOURCE_DEMAND_SECTION', path);
    return new Map();
  }
  if (!isSafeNonNegativeInteger(section.state.revision)) collector.add('INVALID_REVISION', `${path}.state.revision`);
  const ids = Object.keys(section.state.items).sort();
  const demands = new Map();
  const states = new Set(['OPEN', 'PARTIAL', 'RESERVED', 'FULFILLED', 'CANCELLED']);
  for (const id of ids) {
    const item = section.state.items[id];
    const itemPath = `${path}.state.items.${id}`;
    validateStableId(id, 'demand', itemPath, collector);
    if (!isObject(item)) {
      collector.add('INVALID_RESOURCE_DEMAND', itemPath);
      continue;
    }
    if (item.id !== id || item.kind !== 'demand') collector.add('DEMAND_ID_KIND_MISMATCH', itemPath);
    const consumer = validateStableId(item.consumerId, null, `${itemPath}.consumerId`, collector);
    if (consumer && !refs.has(consumer.id)) collector.add('DANGLING_DEMAND_CONSUMER', `${itemPath}.consumerId`);
    if (!resourceTypeIds.has(item.definitionId)) collector.add('DANGLING_RESOURCE_TYPE_REFERENCE', `${itemPath}.definitionId`);
    if (!isSafePositiveInteger(item.targetAmount)) collector.add('INVALID_DEMAND_TARGET', `${itemPath}.targetAmount`);
    if (!states.has(item.state)) collector.add('INVALID_DEMAND_STATE', `${itemPath}.state`);
    if (!isObject(item.metadata)) collector.add('INVALID_DEMAND_METADATA', `${itemPath}.metadata`);
    demands.set(id, item);
  }
  validateAllocator(section.allocator, ids, 'demand', `${path}.allocator`, collector);
  return demands;
}

function validateClaims(snapshot, demands, refs, collector) {
  const section = snapshot?.authoritative?.resourceClaims;
  const path = 'authoritative.resourceClaims';
  const resources = snapshot?.domains?.resources?.state?.items ?? {};
  if (!isObject(section) || !isObject(section.state) || !isObject(section.state.items) || !isObject(section.allocator)) {
    collector.add('INVALID_RESOURCE_CLAIM_SECTION', path);
    return new Map();
  }
  if (!isSafeNonNegativeInteger(section.state.revision)) collector.add('INVALID_REVISION', `${path}.state.revision`);
  const ids = Object.keys(section.state.items).sort();
  const claims = new Map();
  const states = new Set(['ACTIVE', 'RELEASED', 'CONSUMED']);
  const claimedByResource = new Map();
  for (const id of ids) {
    const item = section.state.items[id];
    const itemPath = `${path}.state.items.${id}`;
    validateStableId(id, 'claim', itemPath, collector);
    if (!isObject(item)) {
      collector.add('INVALID_RESOURCE_CLAIM', itemPath);
      continue;
    }
    if (item.id !== id || item.kind !== 'claim') collector.add('CLAIM_ID_KIND_MISMATCH', itemPath);
    if (!resources[item.resourceId]) collector.add('DANGLING_CLAIM_RESOURCE', `${itemPath}.resourceId`);
    const consumer = validateStableId(item.consumerId, null, `${itemPath}.consumerId`, collector);
    if (consumer && !refs.has(consumer.id)) collector.add('DANGLING_CLAIM_CONSUMER', `${itemPath}.consumerId`);
    if (!isSafePositiveInteger(item.amount)) collector.add('INVALID_CLAIM_AMOUNT', `${itemPath}.amount`);
    if (!states.has(item.state)) collector.add('INVALID_CLAIM_STATE', `${itemPath}.state`);
    if (!isObject(item.metadata)) collector.add('INVALID_CLAIM_METADATA', `${itemPath}.metadata`);
    if (item.demandId != null) {
      const demand = demands.get(item.demandId);
      if (!demand) collector.add('DANGLING_CLAIM_DEMAND', `${itemPath}.demandId`);
      else {
        if (demand.consumerId !== item.consumerId) collector.add('CLAIM_DEMAND_CONSUMER_MISMATCH', itemPath);
        if (resources[item.resourceId] && resources[item.resourceId].definitionId !== demand.definitionId) {
          collector.add('CLAIM_DEMAND_RESOURCE_TYPE_MISMATCH', itemPath);
        }
      }
    }
    if ((item.state === 'ACTIVE' || item.state === 'CONSUMED') && resources[item.resourceId] && isSafePositiveInteger(item.amount)) {
      claimedByResource.set(item.resourceId, (claimedByResource.get(item.resourceId) ?? 0) + item.amount);
    }
    claims.set(id, item);
  }
  validateAllocator(section.allocator, ids, 'claim', `${path}.allocator`, collector);
  for (const [resourceId, amount] of claimedByResource) {
    const resourceAmount = resources[resourceId]?.amount;
    if (isSafePositiveInteger(resourceAmount) && amount > resourceAmount) {
      collector.add('RESOURCE_CLAIM_AMOUNT_EXCEEDED', `domains.resources.state.items.${resourceId}.amount`);
    }
  }
  return claims;
}

function validateDemandClaimInvariants(demands, claims, collector) {
  for (const [id, demand] of demands) {
    const related = [...claims.values()].filter(claim => claim.demandId === id);
    const reserved = related.filter(claim => claim.state === 'ACTIVE').reduce((sum, claim) => sum + (Number(claim.amount) || 0), 0);
    const fulfilled = related.filter(claim => claim.state === 'CONSUMED').reduce((sum, claim) => sum + (Number(claim.amount) || 0), 0);
    if (isSafePositiveInteger(demand.targetAmount) && reserved + fulfilled > demand.targetAmount) {
      collector.add('DEMAND_CLAIM_AMOUNT_EXCEEDED', `authoritative.resourceDemands.state.items.${id}`);
      continue;
    }
    if (!isSafePositiveInteger(demand.targetAmount)) continue;
    const remaining = Math.max(0, demand.targetAmount - reserved - fulfilled);
    let expected = 'OPEN';
    if (demand.state === 'CANCELLED') expected = 'CANCELLED';
    else if (fulfilled >= demand.targetAmount) expected = 'FULFILLED';
    else if (remaining === 0 && reserved > 0) expected = 'RESERVED';
    else if (reserved > 0 || fulfilled > 0) expected = 'PARTIAL';
    if (demand.state !== expected) {
      collector.add('DEMAND_STATE_MISMATCH', `authoritative.resourceDemands.state.items.${id}.state`);
    }
  }
}

function validateContractArray(values, path, normalize, keyOf, refs, collector, extra = null) {
  if (!Array.isArray(values)) {
    collector.add('INVALID_ARRAY_SECTION', path);
    return [];
  }
  const seen = new Set();
  const out = [];
  values.forEach((value, index) => {
    const itemPath = `${path}.${index}`;
    try {
      const normalized = normalize(value);
      const key = keyOf(normalized);
      if (seen.has(key)) collector.add('DUPLICATE_AUTHORITATIVE_KEY', itemPath);
      seen.add(key);
      if (typeof extra === 'function') extra(normalized, itemPath, refs, collector);
      out.push(normalized);
    } catch {
      collector.add('INVALID_AUTHORITATIVE_CONTRACT', itemPath);
    }
  });
  return out;
}

function validateSettlementFences(value, collector) {
  const path = 'authoritative.settlementFences';
  if (!isObject(value)) {
    collector.add('INVALID_SETTLEMENT_FENCES', path);
    return;
  }
  for (const name of ['production', 'gold']) {
    const values = value[name];
    const sectionPath = `${path}.${name}`;
    if (!Array.isArray(values)) {
      collector.add('INVALID_SETTLEMENT_FENCE_LIST', sectionPath);
      continue;
    }
    const seen = new Set();
    values.forEach((entry, index) => {
      if (typeof entry !== 'string' || entry.trim().length === 0) collector.add('INVALID_SETTLEMENT_ID', `${sectionPath}.${index}`);
      if (seen.has(entry)) collector.add('DUPLICATE_SETTLEMENT_ID', `${sectionPath}.${index}`);
      seen.add(entry);
    });
  }
}

export class PostIM13SaveGameValidationContract {
  static get resultKind() { return RESULT_KIND; }
  static get schemaVersion() { return SCHEMA_VERSION; }

  static validate(snapshot) {
    const collector = createCollector();
    if (!isObject(snapshot)) {
      collector.add('INVALID_PAYLOAD', '$');
    } else {
      if (snapshot.kind !== 'savegame-snapshot') collector.add('INVALID_SAVEGAME_KIND', 'kind');
      if (snapshot.schemaVersion !== SCHEMA_VERSION) collector.add('UNSUPPORTED_SCHEMA_VERSION', 'schemaVersion');

      const base = clone(snapshot);
      base.schemaVersion = SaveGameValidationContract.schemaVersion;
      delete base.authoritative;
      collector.addAll(SaveGameValidationContract.validate(base).errors);

      const refs = existingRefs(snapshot);
      const resourceTypeIds = validateResourceDefinitions(snapshot, collector);
      const { housingBuildings, workforcePeople } = validateDefinitions(snapshot, collector, resourceTypeIds, refs);
      validateDomainResourceDefinitions(snapshot, resourceTypeIds, collector);
      const demands = validateDemands(snapshot, resourceTypeIds, refs, collector);
      const claims = validateClaims(snapshot, demands, refs, collector);
      validateDemandClaimInvariants(demands, claims, collector);

      const auth = snapshot.authoritative;
      validateContractArray(
        auth?.constructionProgress,
        'authoritative.constructionProgress',
        value => BuildingConstructionProgressTransitionContract.define(value),
        value => value.buildingId,
        refs,
        collector,
        (value, path) => {
          if (!refs.has(value.buildingId)) collector.add('DANGLING_CONSTRUCTION_BUILDING', `${path}.buildingId`);
        }
      );
      validateContractArray(
        auth?.buildingStocks,
        'authoritative.buildingStocks',
        value => BuildingStockContract.define(value),
        value => `${value.buildingId}|${value.resourceTypeId}`,
        refs,
        collector,
        (value, path) => {
          if (!refs.has(value.buildingId)) collector.add('DANGLING_BUILDING_STOCK_BUILDING', `${path}.buildingId`);
          if (!resourceTypeIds.has(value.resourceTypeId)) collector.add('DANGLING_RESOURCE_TYPE_REFERENCE', `${path}.resourceTypeId`);
        }
      );
      validateContractArray(
        auth?.buildingStockTransportReservations,
        'authoritative.buildingStockTransportReservations',
        value => BuildingStockTransportReservationContract.define(value),
        value => value.id,
        refs,
        collector,
        (value, path) => {
          if (!refs.has(value.sourceBuildingId)) collector.add('DANGLING_RESERVATION_SOURCE', `${path}.sourceBuildingId`);
          if (!refs.has(value.targetBuildingId)) collector.add('DANGLING_RESERVATION_TARGET', `${path}.targetBuildingId`);
          if (!resourceTypeIds.has(value.resourceTypeId)) collector.add('DANGLING_RESOURCE_TYPE_REFERENCE', `${path}.resourceTypeId`);
        }
      );
      validateContractArray(
        auth?.workforceAssignments,
        'authoritative.workforceAssignments',
        value => WorkforceAssignmentStateContract.define(value),
        value => value.personId,
        refs,
        collector,
        (value, path) => {
          if (!refs.has(value.personId)) collector.add('DANGLING_WORKFORCE_ASSIGNMENT_PERSON', `${path}.personId`);
          if (!workforcePeople.has(value.personId)) collector.add('MISSING_WORKFORCE_PROFILE', `${path}.personId`);
        }
      );
      validateContractArray(
        auth?.homeAssignments,
        'authoritative.homeAssignments',
        value => ResidentHomeAssignmentContract.define(value),
        value => value.personId,
        refs,
        collector,
        (value, path) => {
          if (!refs.has(value.personId)) collector.add('DANGLING_HOME_ASSIGNMENT_PERSON', `${path}.personId`);
          if (value.state === 'ASSIGNED') {
            if (!refs.has(value.homeBuildingId)) collector.add('DANGLING_HOME_BUILDING', `${path}.homeBuildingId`);
            if (!housingBuildings.has(value.homeBuildingId)) collector.add('HOME_WITHOUT_HOUSING_CAPABILITY', `${path}.homeBuildingId`);
          }
        }
      );
      validateSettlementFences(auth?.settlementFences, collector);
    }

    const errors = collector.result();
    return deepFreeze({
      kind: RESULT_KIND,
      schemaVersion: SCHEMA_VERSION,
      status: errors.length === 0 ? 'VALID' : 'INVALID',
      errors
    });
  }
}
