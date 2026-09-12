import assert from 'node:assert/strict';
import { WorldStore } from '../world/world-store.js';
import { MapStructure } from '../world/map-structure.js';
import { CoreDomainStores } from '../domain/core-domain-stores.js';
import { GoldEconomyOwner } from '../domain/gold-economy-owner.js';
import { ResourceState } from '../resources/resource-state.js';
import { ResourceClaims } from '../resources/resource-claims.js';
import { ResourceDemands } from '../resources/resource-demands.js';
import { SaveGameSnapshotContract } from '../savegame/savegame-snapshot-contract.js';
import { BuildingConstructionProgressTransitionContract } from '../domain/building-construction-progress-transition-contract.js';
import { BuildingStockContract } from '../domain/building-stock-contract.js';
import { BuildingStockTransportReservationContract } from '../domain/building-stock-transport-reservation-contract.js';
import { WorkforceAssignmentStateContract } from '../domain/workforce-assignment-state-contract.js';
import { ResidentHomeAssignmentContract } from '../domain/resident-home-assignment-contract.js';
import { PostIM13AuthoritativeSnapshotIntegration } from '../savegame/post-im13-authoritative-snapshot-integration.js';
import { PostIM13SaveGameValidationContract } from '../savegame/post-im13-savegame-validation-contract.js';
import { PostIM13SaveGameRestoreIntegration } from '../savegame/post-im13-savegame-restore-integration.js';

function fixture() {
  const world = new WorldStore();
  const map = new MapStructure(world, { width: 3, height: 2, name: 'IM-20C Restore Test' });
  const pathTile = map.createTile({ technicalName: 'path.im20c', traversalType: 'PATH' });
  map.setTileAt(1, 0, pathTile.id);

  const domains = new CoreDomainStores();
  const sourceBuildingId = domains.buildings.allocateId();
  domains.buildings.create({ definitionId: 'STOREHOUSE', position: { x: 1, y: 1 } }, { id: sourceBuildingId });
  const targetBuildingId = domains.buildings.allocateId();
  domains.buildings.create({ definitionId: 'WORKSHOP', position: { x: 2, y: 1 } }, { id: targetBuildingId });
  const personId = domains.units.allocateId();
  domains.units.create({ position: { x: 0, y: 0 } }, { id: personId });

  const resourceState = new ResourceState({ world, resourceStore: domains.resources });
  const wood = resourceState.createDefinition({ technicalName: 'wood', label: 'Wood' }, { id: 'resource-type:00000001' });
  try {
    resourceState.createDefinition({ technicalName: 'INVALID NAME' });
  } catch {
    // Preserve a real allocator gap: next resource-type must be 3 after restore.
  }
  const resource = resourceState.createResource({
    definitionId: wood.id,
    amount: 5,
    location: null,
    ownerId: null
  }, { id: 'resource:00000001' });

  const resourceClaims = new ResourceClaims({ resourceState });
  const resourceDemands = new ResourceDemands({ resourceState, claims: resourceClaims });
  const demand = resourceDemands.create({
    consumerId: targetBuildingId,
    definitionId: wood.id,
    amount: 2,
    metadata: { purpose: 'construction' }
  }, { id: 'demand:00000001' });
  resourceDemands.reserve({
    demandId: demand.id,
    resourceId: resource.id,
    amount: 1,
    metadata: { source: 'im20c-test' }
  });

  const goldEconomy = new GoldEconomyOwner({ initialGold: 9 });
  const wearCellId = map.cellIdAt(1, 0);
  const pathUsageWear = {
    entries() {
      return Object.freeze([
        Object.freeze({ cellId: wearCellId, traversalType: 'PATH', usageCount: 2, wearUnits: 2 })
      ]);
    }
  };

  return {
    world,
    map,
    domains,
    goldEconomy,
    pathUsageWear,
    resourceState,
    resourceClaims,
    resourceDemands,
    housingCapabilities: Object.freeze([
      Object.freeze({ kind: 'building-housing', buildingId: sourceBuildingId, capacity: 2 })
    ]),
    workforceProfiles: Object.freeze([
      Object.freeze({
        kind: 'person-workforce-profile',
        personId,
        specialization: 'GENERAL_RESIDENT',
        capabilities: Object.freeze(['CAN_MOVE'])
      })
    ]),
    workforceRequirements: Object.freeze([
      Object.freeze({
        kind: 'operational-building-workforce-requirement',
        buildingId: targetBuildingId,
        count: 1,
        requiredSpecialization: 'GENERAL_RESIDENT',
        requiredCapabilities: Object.freeze(['CAN_MOVE'])
      })
    ]),
    productionRecipes: Object.freeze([
      Object.freeze({
        kind: 'production-building-stock',
        buildingId: targetBuildingId,
        inputs: Object.freeze([{ resourceTypeId: wood.id, quantity: 1 }]),
        outputs: Object.freeze([{ resourceTypeId: wood.id, quantity: 1 }])
      })
    ]),
    constructionProgress: Object.freeze([
      BuildingConstructionProgressTransitionContract.define({ buildingId: targetBuildingId, progress: 0.5 })
    ]),
    buildingStocks: Object.freeze([
      BuildingStockContract.define({ buildingId: sourceBuildingId, resourceTypeId: wood.id, quantity: 4 }),
      BuildingStockContract.define({ buildingId: targetBuildingId, resourceTypeId: wood.id, quantity: 1 })
    ]),
    buildingStockTransportReservations: Object.freeze([
      BuildingStockTransportReservationContract.define({
        id: 'transport-reservation:00000001',
        sourceBuildingId,
        targetBuildingId,
        resourceTypeId: wood.id,
        amount: 1,
        state: 'ACTIVE'
      })
    ]),
    workforceAssignments: Object.freeze([
      WorkforceAssignmentStateContract.define({
        personId,
        availability: 'ASSIGNED',
        assignmentId: 'assignment:00000001'
      })
    ]),
    homeAssignments: Object.freeze([
      ResidentHomeAssignmentContract.define({
        personId,
        state: 'ASSIGNED',
        homeBuildingId: sourceBuildingId
      })
    ]),
    productionSettlementIds: Object.freeze(['production-settlement:00000002', 'production-settlement:00000001']),
    goldSettlementIds: Object.freeze(['gold-settlement:00000001'])
  };
}

function capture(f, stepIndex = 31) {
  return PostIM13AuthoritativeSnapshotIntegration.capture({
    boundary: SaveGameSnapshotContract.completedStepBoundary(stepIndex),
    world: f.world,
    map: f.map,
    domains: f.domains,
    gold: f.goldEconomy,
    wear: f.pathUsageWear,
    resourceState: f.resourceState,
    resourceDemands: f.resourceDemands,
    resourceClaims: f.resourceClaims,
    housingCapabilities: f.housingCapabilities,
    workforceProfiles: f.workforceProfiles,
    workforceRequirements: f.workforceRequirements,
    productionRecipes: f.productionRecipes,
    constructionProgress: f.constructionProgress,
    buildingStocks: f.buildingStocks,
    buildingStockTransportReservations: f.buildingStockTransportReservations,
    workforceAssignments: f.workforceAssignments,
    homeAssignments: f.homeAssignments,
    productionSettlementIds: [...f.productionSettlementIds],
    goldSettlementIds: [...f.goldSettlementIds]
  });
}

function recapture(state) {
  return PostIM13AuthoritativeSnapshotIntegration.capture({
    boundary: SaveGameSnapshotContract.completedStepBoundary(state.captureStepIndex),
    world: state.world,
    map: state.map,
    domains: state.domains,
    gold: state.goldEconomy,
    wear: state.pathUsageWear,
    resourceState: state.resourceState,
    resourceDemands: state.resourceDemands,
    resourceClaims: state.resourceClaims,
    housingCapabilities: state.housingCapabilities,
    workforceProfiles: state.workforceProfiles,
    workforceRequirements: state.workforceRequirements,
    productionRecipes: state.productionRecipes,
    constructionProgress: state.constructionProgress,
    buildingStocks: state.buildingStocks,
    buildingStockTransportReservations: state.buildingStockTransportReservations,
    workforceAssignments: state.workforceAssignments,
    homeAssignments: state.homeAssignments,
    productionSettlementIds: [...state.productionSettlementIds],
    goldSettlementIds: [...state.goldSettlementIds]
  });
}

function hasCode(result, code) {
  return result.errors.some(error => error.code === code);
}

export function runIM20CSelfTest() {
  const initial = fixture();
  const snapshotA = capture(initial);
  const beforeValidation = JSON.stringify(snapshotA);
  const validation = PostIM13SaveGameValidationContract.validate(snapshotA);
  const afterValidation = JSON.stringify(snapshotA);
  const restored = PostIM13SaveGameRestoreIntegration.restore(snapshotA);

  assert.equal(validation.status, 'VALID', JSON.stringify(validation.errors, null, 2));
  assert.equal(restored.status, 'RESTORED');
  assert.equal(restored.validation.status, 'VALID');

  const state = restored.runtimeState;
  const snapshotB = recapture(state);
  const serializedA = PostIM13AuthoritativeSnapshotIntegration.serialize(snapshotA);
  const serializedB = PostIM13AuthoritativeSnapshotIntegration.serialize(snapshotB);

  const nextDefinition = state.resourceState.createDefinition({ technicalName: 'stone', label: 'Stone' });
  const nextDemand = state.resourceDemands.create({
    consumerId: state.workforceRequirements[0].buildingId,
    definitionId: 'resource-type:00000001',
    amount: 1
  });
  const nextClaim = state.resourceDemands.reserve({
    demandId: 'demand:00000001',
    resourceId: 'resource:00000001',
    amount: 1
  });

  const badDefinition = structuredClone(snapshotA);
  badDefinition.domains.resources.state.items['resource:00000001'].definitionId = 'resource-type:99999999';
  const badDefinitionValidation = PostIM13SaveGameValidationContract.validate(badDefinition);
  const badDefinitionRestore = PostIM13SaveGameRestoreIntegration.restore(badDefinition);

  const badAllocator = structuredClone(snapshotA);
  badAllocator.authoritative.definitions.resourceTypes.allocator['resource-type'] = 1;
  const badAllocatorValidation = PostIM13SaveGameValidationContract.validate(badAllocator);

  const badClaimDemand = structuredClone(snapshotA);
  badClaimDemand.authoritative.resourceClaims.state.items['claim:00000001'].consumerId = initial.buildingStockTransportReservations[0].sourceBuildingId;
  const badClaimDemandValidation = PostIM13SaveGameValidationContract.validate(badClaimDemand);

  const badHome = structuredClone(snapshotA);
  badHome.authoritative.homeAssignments[0].homeBuildingId = initial.workforceRequirements[0].buildingId;
  const badHomeValidation = PostIM13SaveGameValidationContract.validate(badHome);

  const capabilities = PostIM13SaveGameRestoreIntegration.capabilities();
  const checks = Object.freeze({
    v2ValidationPass:
      validation.kind === 'post-im13-savegame-validation-result'
      && validation.schemaVersion === 2
      && validation.status === 'VALID',
    validationSideEffectFree: beforeValidation === afterValidation,
    restoredBaseOwners:
      state.kind === 'restored-post-im13-authoritative-runtime-state'
      && state.captureStepIndex === 31
      && state.world.worldId === snapshotA.world.state.worldId
      && state.map.mapId === snapshotA.map.mapId
      && state.goldEconomy.balance === 9,
    restoredPostIM13Owners:
      state.resourceState.getDefinition('resource-type:00000001')?.technicalName === 'wood'
      && state.resourceClaims.get('claim:00000001')?.state === 'ACTIVE'
      && state.resourceDemands.get('demand:00000001')?.reservedAmount === 1
      && state.buildingStocks.length === 2
      && state.workforceAssignments.length === 1
      && state.homeAssignments.length === 1,
    canonicalRoundTripIdentity: serializedA === serializedB,
    resourceDefinitionAllocatorContinuity: nextDefinition.id === 'resource-type:00000003',
    demandAllocatorContinuity: nextDemand.id === 'demand:00000002',
    claimAllocatorContinuity: nextClaim.id === 'claim:00000002',
    exactlyOnceFencesRestored:
      state.productionSettlementIds.has('production-settlement:00000001')
      && state.productionSettlementIds.has('production-settlement:00000002')
      && state.goldSettlementIds.has('gold-settlement:00000001'),
    danglingResourceDefinitionRejected:
      badDefinitionValidation.status === 'INVALID'
      && hasCode(badDefinitionValidation, 'DANGLING_RESOURCE_TYPE_REFERENCE')
      && badDefinitionRestore.status === 'REJECTED'
      && !('runtimeState' in badDefinitionRestore),
    allocatorReuseRejected:
      badAllocatorValidation.status === 'INVALID'
      && hasCode(badAllocatorValidation, 'ALLOCATOR_REUSE_RISK'),
    claimDemandMismatchRejected:
      badClaimDemandValidation.status === 'INVALID'
      && hasCode(badClaimDemandValidation, 'CLAIM_DEMAND_CONSUMER_MISMATCH'),
    homeWithoutHousingCapabilityRejected:
      badHomeValidation.status === 'INVALID'
      && hasCode(badHomeValidation, 'HOME_WITHOUT_HOUSING_CAPABILITY'),
    noIM20DPlusCapability:
      capabilities.v2Validation === true
      && capabilities.v2Restore === true
      && capabilities.failClosedBeforeCommit === true
      && capabilities.derivedStateRebinding === false
      && capabilities.runtimeActivation === false
      && capabilities.browserStorage === false
      && capabilities.continueLifecycle === false
  });

  assert.equal(Object.values(checks).every(Boolean), true, JSON.stringify(checks, null, 2));

  return Object.freeze({
    kind: 'im-20c-self-test-result',
    pass: true,
    checks,
    evidence: Object.freeze({
      schemaVersion: validation.schemaVersion,
      captureStepIndex: state.captureStepIndex,
      canonicalRoundTripIdentity: serializedA === serializedB,
      restoredResourceDefinitions: state.resourceState.definitionIds().length,
      restoredDemands: state.resourceDemands.ids().length,
      restoredClaims: state.resourceClaims.ids().length,
      restoredBuildingStocks: state.buildingStocks.length,
      restoredWorkforceAssignments: state.workforceAssignments.length,
      restoredHomeAssignments: state.homeAssignments.length,
      productionFenceCount: state.productionSettlementIds.size,
      goldFenceCount: state.goldSettlementIds.size
    }),
    capabilities
  });
}
