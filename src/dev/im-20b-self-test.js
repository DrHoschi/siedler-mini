import assert from 'node:assert/strict';
import { WorldStore } from '../world/world-store.js';
import { MapStructure } from '../world/map-structure.js';
import { CoreDomainStores } from '../domain/core-domain-stores.js';
import { GoldEconomyOwner } from '../domain/gold-economy-owner.js';
import { ResourceState } from '../resources/resource-state.js';
import { ResourceClaims } from '../resources/resource-claims.js';
import { ResourceDemands } from '../resources/resource-demands.js';
import { SaveGameSnapshotContract } from '../savegame/savegame-snapshot-contract.js';
import { SaveGameValidationContract } from '../savegame/savegame-validation-contract.js';
import { BuildingConstructionProgressTransitionContract } from '../domain/building-construction-progress-transition-contract.js';
import { BuildingStockContract } from '../domain/building-stock-contract.js';
import { BuildingStockTransportReservationContract } from '../domain/building-stock-transport-reservation-contract.js';
import { WorkforceAssignmentStateContract } from '../domain/workforce-assignment-state-contract.js';
import { ResidentHomeAssignmentContract } from '../domain/resident-home-assignment-contract.js';
import { PostIM13AuthoritativeSnapshotIntegration } from '../savegame/post-im13-authoritative-snapshot-integration.js';

function fixture() {
  const world = new WorldStore();
  const map = new MapStructure(world, { width: 3, height: 2, name: 'IM-20B Snapshot Test' });
  const pathTile = map.createTile({ technicalName: 'path.im20b', traversalType: 'PATH' });
  map.setTileAt(1, 0, pathTile.id);

  const domains = new CoreDomainStores();
  const sourceBuildingId = domains.buildings.allocateId();
  domains.buildings.create({ definitionId: 'STOREHOUSE', position: { x: 1, y: 1 } }, { id: sourceBuildingId });
  const targetBuildingId = domains.buildings.allocateId();
  domains.buildings.create({ definitionId: 'WORKSHOP', position: { x: 2, y: 1 } }, { id: targetBuildingId });
  const personId = domains.units.allocateId();
  domains.units.create({ position: { x: 0, y: 0 } }, { id: personId });

  const resources = new ResourceState({ world, resourceStore: domains.resources });
  const definition = resources.createDefinition({ technicalName: 'wood', label: 'Wood' }, { id: 'resource-type:00000001' });
  const resource = resources.createResource({
    definitionId: definition.id,
    amount: 5,
    location: { kind: 'owner', refId: sourceBuildingId },
    ownerId: sourceBuildingId
  }, { id: 'resource:00000001' });

  const claims = new ResourceClaims({ resourceState: resources });
  const demands = new ResourceDemands({ resourceState: resources, claims });
  const demand = demands.create({
    consumerId: targetBuildingId,
    definitionId: definition.id,
    amount: 2,
    metadata: { purpose: 'construction' }
  }, { id: 'demand:00000001' });
  demands.reserve({
    demandId: demand.id,
    resourceId: resource.id,
    amount: 1,
    metadata: { source: 'im20b-test' }
  });

  const gold = new GoldEconomyOwner({ initialGold: 9 });
  const wearCellId = map.cellIdAt(1, 0);
  const wear = {
    entries() {
      return Object.freeze([
        Object.freeze({ cellId: wearCellId, traversalType: 'PATH', usageCount: 2, wearUnits: 2 })
      ]);
    }
  };

  const constructionProgress = [
    BuildingConstructionProgressTransitionContract.define({ buildingId: targetBuildingId, progress: 0.5 })
  ];
  const buildingStocks = [
    BuildingStockContract.define({ buildingId: sourceBuildingId, resourceTypeId: definition.id, quantity: 4 }),
    BuildingStockContract.define({ buildingId: targetBuildingId, resourceTypeId: definition.id, quantity: 1 })
  ];
  const reservations = [
    BuildingStockTransportReservationContract.define({
      id: 'transport-reservation:00000001',
      sourceBuildingId,
      targetBuildingId,
      resourceTypeId: definition.id,
      amount: 1,
      state: 'ACTIVE'
    })
  ];
  const workforceAssignments = [
    WorkforceAssignmentStateContract.define({
      personId,
      availability: 'ASSIGNED',
      assignmentId: 'assignment:00000001'
    })
  ];
  const homeAssignments = [
    ResidentHomeAssignmentContract.define({
      personId,
      state: 'ASSIGNED',
      homeBuildingId: sourceBuildingId
    })
  ];

  return {
    world, map, domains, gold, wear, demands, claims,
    constructionProgress, buildingStocks, reservations,
    workforceAssignments, homeAssignments
  };
}

function capture(f) {
  return PostIM13AuthoritativeSnapshotIntegration.capture({
    boundary: SaveGameSnapshotContract.completedStepBoundary(21),
    world: f.world,
    map: f.map,
    domains: f.domains,
    gold: f.gold,
    wear: f.wear,
    resourceDemands: f.demands,
    resourceClaims: f.claims,
    constructionProgress: f.constructionProgress,
    buildingStocks: f.buildingStocks,
    buildingStockTransportReservations: f.reservations,
    workforceAssignments: f.workforceAssignments,
    homeAssignments: f.homeAssignments,
    productionSettlementIds: ['production-settlement:00000002', 'production-settlement:00000001'],
    goldSettlementIds: ['gold-settlement:00000001']
  });
}

export function runIM20BSelfTest() {
  const f = fixture();
  const snapshotA = capture(f);
  const snapshotB = capture(f);
  const demand = snapshotA.authoritative.resourceDemands.state.items['demand:00000001'];
  const claim = snapshotA.authoritative.resourceClaims.state.items['claim:00000001'];
  const capabilities = PostIM13AuthoritativeSnapshotIntegration.capabilities();

  const checks = Object.freeze({
    v2CaptureBuiltOverFrozenV1Base:
      snapshotA.kind === 'savegame-snapshot'
      && snapshotA.schemaVersion === 2
      && snapshotA.capture.stepIndex === 21
      && snapshotA.world.state.worldId === f.world.worldId
      && snapshotA.map.mapId === f.map.mapId
      && snapshotA.economy.gold.balance === 9
      && snapshotA.pathWear.entries[0].wearUnits === 2,
    frozenIM13ContractRemainsV1:
      SaveGameSnapshotContract.schemaVersion === 1
      && SaveGameValidationContract.schemaVersion === 1,
    resourceDemandTruthCapturedWithoutDerivedProgressDuplication:
      demand.id === 'demand:00000001'
      && demand.targetAmount === 2
      && demand.state === 'PARTIAL'
      && !('reservedAmount' in demand)
      && !('fulfilledAmount' in demand)
      && !('remainingAmount' in demand)
      && !('status' in demand)
      && snapshotA.authoritative.resourceDemands.allocator.demand === 2,
    resourceClaimTruthCaptured:
      claim.id === 'claim:00000001'
      && claim.state === 'ACTIVE'
      && claim.amount === 1
      && snapshotA.authoritative.resourceClaims.allocator.claim === 2,
    constructionProgressCaptured:
      snapshotA.authoritative.constructionProgress.length === 1
      && snapshotA.authoritative.constructionProgress[0].progress === 0.5,
    buildingStockCapturedDeterministically:
      snapshotA.authoritative.buildingStocks.length === 2
      && snapshotA.authoritative.buildingStocks[0].buildingId.localeCompare(snapshotA.authoritative.buildingStocks[1].buildingId) <= 0,
    buildingStockReservationCaptured:
      snapshotA.authoritative.buildingStockTransportReservations.length === 1
      && snapshotA.authoritative.buildingStockTransportReservations[0].state === 'ACTIVE',
    workforceAndHomeAssignmentsCaptured:
      snapshotA.authoritative.workforceAssignments[0].availability === 'ASSIGNED'
      && snapshotA.authoritative.homeAssignments[0].state === 'ASSIGNED',
    exactlyOnceFencesCapturedAndCanonicalized:
      snapshotA.authoritative.settlementFences.production.join('|')
        === 'production-settlement:00000001|production-settlement:00000002'
      && snapshotA.authoritative.settlementFences.gold.join('|') === 'gold-settlement:00000001',
    derivedSecondTruthNotPersisted:
      !('population' in snapshotA)
      && !('housing' in snapshotA)
      && !('playerProjection' in snapshotA)
      && !('camera' in snapshotA)
      && !('inspector' in snapshotA.authoritative),
    deterministicSerialization:
      PostIM13AuthoritativeSnapshotIntegration.serialize(snapshotA)
        === PostIM13AuthoritativeSnapshotIntegration.serialize(snapshotB),
    immutableSnapshot:
      Object.isFrozen(snapshotA)
      && Object.isFrozen(snapshotA.authoritative)
      && Object.isFrozen(snapshotA.authoritative.settlementFences),
    noIM20CPlusCapability:
      capabilities.v2Capture === true
      && capabilities.v2Validation === false
      && capabilities.v2Restore === false
      && capabilities.browserStorage === false
      && capabilities.continueLifecycle === false
  });

  assert.equal(Object.values(checks).every(Boolean), true, JSON.stringify(checks, null, 2));
  assert.throws(
    () => SaveGameSnapshotContract.serialize(snapshotA),
    /schemaVersion 1 SaveGame snapshot required/
  );
  assert.throws(
    () => PostIM13AuthoritativeSnapshotIntegration.capture({
      boundary: SaveGameSnapshotContract.completedStepBoundary(21),
      world: f.world,
      map: f.map,
      domains: f.domains,
      gold: f.gold,
      wear: f.wear,
      resourceDemands: f.demands,
      resourceClaims: f.claims,
      constructionProgress: f.constructionProgress,
      buildingStocks: f.buildingStocks,
      workforceAssignments: f.workforceAssignments,
      homeAssignments: f.homeAssignments,
      productionSettlementIds: ['duplicate', 'duplicate']
    }),
    /duplicate ids/
  );

  return Object.freeze({
    kind: 'im-20b-self-test-result',
    pass: true,
    checks,
    evidence: Object.freeze({
      schemaVersion: snapshotA.schemaVersion,
      demandCount: Object.keys(snapshotA.authoritative.resourceDemands.state.items).length,
      claimCount: Object.keys(snapshotA.authoritative.resourceClaims.state.items).length,
      constructionProgressCount: snapshotA.authoritative.constructionProgress.length,
      buildingStockCount: snapshotA.authoritative.buildingStocks.length,
      reservationCount: snapshotA.authoritative.buildingStockTransportReservations.length,
      workforceAssignmentCount: snapshotA.authoritative.workforceAssignments.length,
      homeAssignmentCount: snapshotA.authoritative.homeAssignments.length,
      productionFenceCount: snapshotA.authoritative.settlementFences.production.length,
      goldFenceCount: snapshotA.authoritative.settlementFences.gold.length
    }),
    capabilities
  });
}
