import assert from 'node:assert/strict';
import { WorldStore } from '../world/world-store.js';
import { MapStructure } from '../world/map-structure.js';
import { CoreDomainStores } from '../domain/core-domain-stores.js';
import { BuildingIdentityOwnershipContract } from '../domain/building-identity-ownership-contract.js';
import { BuildingLifecycleStateContract } from '../domain/building-lifecycle-state-contract.js';
import { PersonResidentIdentityContract } from '../domain/person-resident-identity-contract.js';
import { GoldEconomyOwner } from '../domain/gold-economy-owner.js';
import { ResourceState } from '../resources/resource-state.js';
import { ResourceClaims } from '../resources/resource-claims.js';
import { ResourceDemands } from '../resources/resource-demands.js';
import { SaveGameSnapshotContract } from '../savegame/savegame-snapshot-contract.js';
import { BuildingConstructionProgressTransitionContract } from '../domain/building-construction-progress-transition-contract.js';
import { BuildingStockContract } from '../domain/building-stock-contract.js';
import { BuildingStockTransportReservationContract } from '../domain/building-stock-transport-reservation-contract.js';
import { WorkforceAssignmentStateContract } from '../domain/workforce-assignment-state-contract.js';
import { PersonWorkforceProfileContract } from '../domain/person-workforce-profile-contract.js';
import { ProductionBuildingStockContract } from '../domain/production-building-stock-contract.js';
import { ResidentHomeAssignmentContract } from '../domain/resident-home-assignment-contract.js';
import { CarrierContract } from '../transport/carrier-contract.js';
import { TransportExecutionContract } from '../transport/transport-execution-contract.js';
import { PostIM13AuthoritativeSnapshotIntegration } from '../savegame/post-im13-authoritative-snapshot-integration.js';
import { PostIM13SaveGameRestoreIntegration } from '../savegame/post-im13-savegame-restore-integration.js';
import { PostIM13DerivedStateRebindingIntegration } from '../savegame/post-im13-derived-state-rebinding-integration.js';

function createBuilding(domains, definitionId, position) {
  const buildingId = domains.buildings.allocateId();
  return domains.buildings.create({
    identity: BuildingIdentityOwnershipContract.define({ buildingId, definitionId }),
    lifecycle: BuildingLifecycleStateContract.define({ buildingId, state: 'EXISTS' }),
    position
  }, { id: buildingId });
}

function createPerson(domains, position, { carrier = null } = {}) {
  const personId = domains.units.allocateId();
  return domains.units.create({
    identity: PersonResidentIdentityContract.define({ personId }),
    position,
    ...(carrier ? { carrier: CarrierContract.define({ ...carrier, unitId: personId }) } : {})
  }, { id: personId });
}

function fixture() {
  const world = new WorldStore();
  const map = new MapStructure(world, { width: 5, height: 4, name: 'IM-20D Derived Rebinding Test' });
  const pathTile = map.createTile({ technicalName: 'path.im20d', traversalType: 'PATH' });
  const roadTile = map.createTile({ technicalName: 'road.im20d', traversalType: 'ROAD' });
  map.setTileAt(1, 0, pathTile.id);
  map.setTileAt(2, 0, roadTile.id);

  const domains = new CoreDomainStores();
  const home = createBuilding(domains, 'HQ', { x: 2, y: 1 });
  const workshop = createBuilding(domains, 'WOODCUTTER', { x: 3, y: 2 });
  const worker = createPerson(domains, { x: 0.25, y: 0.25 }, {
    carrier: {
      capacity: 2,
      state: 'OCCUPIED',
      location: { kind: 'cell', refId: map.cellIdAt(0, 0) }
    }
  });
  const resident = createPerson(domains, { x: 4.25, y: 3.25 });

  const resourceState = new ResourceState({ world, resourceStore: domains.resources });
  const wood = resourceState.createDefinition(
    { technicalName: 'wood', label: 'Wood' },
    { id: 'resource-type:00000001' }
  );
  const planks = resourceState.createDefinition(
    { technicalName: 'planks', label: 'Planks' },
    { id: 'resource-type:00000002' }
  );
  const resource = resourceState.createResource({
    definitionId: wood.id,
    amount: 4,
    location: { kind: 'cell', refId: map.cellIdAt(0, 0) },
    ownerId: null
  }, { id: 'resource:00000001' });

  const resourceClaims = new ResourceClaims({ resourceState });
  const resourceDemands = new ResourceDemands({ resourceState, claims: resourceClaims });
  const demand = resourceDemands.create({
    consumerId: workshop.id,
    definitionId: wood.id,
    amount: 2,
    metadata: { purpose: 'stock-supply' }
  }, { id: 'demand:00000001' });
  const claim = resourceDemands.reserve({
    demandId: demand.id,
    resourceId: resource.id,
    amount: 1,
    metadata: { source: 'im20d-test' }
  });
  const jobId = domains.jobs.allocateId();
  domains.jobs.create({
    claimId: claim.id,
    demandId: demand.id,
    resourceId: resource.id,
    definitionId: wood.id,
    sourceLocation: resource.location,
    targetId: workshop.id,
    amount: 1,
    status: 'PENDING'
  }, { id: jobId });

  const goldEconomy = new GoldEconomyOwner({ initialGold: 9 });
  const pathUsageWear = {
    entries() {
      return Object.freeze([
        Object.freeze({
          cellId: map.cellIdAt(1, 0),
          traversalType: 'PATH',
          usageCount: 2,
          wearUnits: 2
        })
      ]);
    }
  };

  return Object.freeze({
    world,
    map,
    domains,
    goldEconomy,
    pathUsageWear,
    resourceState,
    resourceClaims,
    resourceDemands,
    home,
    workshop,
    worker,
    resident,
    wood,
    planks,
    jobId,
    housingCapabilities: Object.freeze([
      Object.freeze({ kind: 'building-housing', buildingId: home.id, capacity: 2 })
    ]),
    workforceProfiles: Object.freeze([
      PersonWorkforceProfileContract.define({
        personId: worker.id,
        specialization: 'LUMBERJACK',
        capabilities: ['CAN_MOVE', 'CAN_SIMPLE_TRANSPORT', 'CAN_LUMBERJACK']
      }),
      PersonWorkforceProfileContract.define({
        personId: resident.id,
        specialization: 'GENERAL_RESIDENT',
        capabilities: ['CAN_MOVE']
      })
    ]),
    workforceRequirements: Object.freeze([
      Object.freeze({
        kind: 'operational-building-workforce-requirement-definition',
        buildingId: workshop.id,
        count: 1,
        requiredSpecialization: 'LUMBERJACK',
        requiredCapabilities: Object.freeze(['CAN_LUMBERJACK', 'CAN_MOVE'])
      })
    ]),
    productionRecipes: Object.freeze([
      ProductionBuildingStockContract.define({
        buildingId: workshop.id,
        inputs: [{ resourceTypeId: wood.id, quantity: 1 }],
        outputs: [{ resourceTypeId: planks.id, quantity: 1 }]
      })
    ]),
    constructionProgress: Object.freeze([
      BuildingConstructionProgressTransitionContract.define({ buildingId: home.id, progress: 1 }),
      BuildingConstructionProgressTransitionContract.define({ buildingId: workshop.id, progress: 1 })
    ]),
    buildingStocks: Object.freeze([
      BuildingStockContract.define({ buildingId: home.id, resourceTypeId: wood.id, quantity: 3 }),
      BuildingStockContract.define({ buildingId: workshop.id, resourceTypeId: wood.id, quantity: 2 }),
      BuildingStockContract.define({ buildingId: workshop.id, resourceTypeId: planks.id, quantity: 0 })
    ]),
    buildingStockTransportReservations: Object.freeze([
      BuildingStockTransportReservationContract.define({
        id: 'transport-reservation:00000001',
        sourceBuildingId: home.id,
        targetBuildingId: workshop.id,
        resourceTypeId: wood.id,
        amount: 1,
        state: 'ACTIVE'
      })
    ]),
    workforceAssignments: Object.freeze([
      WorkforceAssignmentStateContract.define({
        personId: worker.id,
        availability: 'ASSIGNED',
        assignmentId: 'assignment:00000001'
      }),
      WorkforceAssignmentStateContract.define({ personId: resident.id, availability: 'FREE' })
    ]),
    workforceBindings: Object.freeze([
      Object.freeze({
        kind: 'workforce-building-binding',
        assignmentId: 'assignment:00000001',
        buildingId: workshop.id
      })
    ]),
    carrierBindings: Object.freeze([
      Object.freeze({ kind: 'carrier-job-binding', jobId, unitId: worker.id })
    ]),
    transportExecutions: Object.freeze([
      TransportExecutionContract.define({ jobId, unitId: worker.id, state: 'TO_DROPOFF' })
    ]),
    homeAssignments: Object.freeze([
      ResidentHomeAssignmentContract.define({
        personId: worker.id,
        state: 'ASSIGNED',
        homeBuildingId: home.id
      }),
      ResidentHomeAssignmentContract.define({
        personId: resident.id,
        state: 'ASSIGNED',
        homeBuildingId: home.id
      })
    ]),
    productionSettlementIds: Object.freeze(['production-settlement:00000001']),
    goldSettlementIds: Object.freeze(['gold-settlement:00000001'])
  });
}

function capture(f, stepIndex = 41) {
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
    workforceBindings: f.workforceBindings,
    carrierBindings: f.carrierBindings,
    transportExecutions: f.transportExecutions,
    homeAssignments: f.homeAssignments,
    productionSettlementIds: f.productionSettlementIds,
    goldSettlementIds: f.goldSettlementIds
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
    workforceBindings: state.workforceBindings,
    carrierBindings: state.carrierBindings,
    transportExecutions: state.transportExecutions,
    homeAssignments: state.homeAssignments,
    productionSettlementIds: [...state.productionSettlementIds],
    goldSettlementIds: [...state.goldSettlementIds]
  });
}

export function runIM20DSelfTest() {
  const source = fixture();
  const snapshot = capture(source);
  const serializedBefore = PostIM13AuthoritativeSnapshotIntegration.serialize(snapshot);

  source.domains.buildings.create({
    identity: BuildingIdentityOwnershipContract.define({
      buildingId: 'building:00000003',
      definitionId: 'SOURCE_A_ONLY_AFTER_CAPTURE'
    }),
    lifecycle: BuildingLifecycleStateContract.define({ buildingId: 'building:00000003' }),
    position: { x: 4, y: 1 }
  }, { id: 'building:00000003' });

  const restored = PostIM13SaveGameRestoreIntegration.restore(snapshot);
  assert.equal(restored.status, 'RESTORED', JSON.stringify(restored.validation.errors, null, 2));
  const rebound = PostIM13DerivedStateRebindingIntegration.rebind(restored);
  assert.equal(rebound.status, 'REBOUND', JSON.stringify(rebound.error, null, 2));

  const state = rebound.runtimeState;
  const derived = rebound.derivedState;
  const housing = derived.presentation.playerPopulationHousingGold.housing;
  const workshopWorkforce = derived.operational.workforce.find(value => value.buildingId === source.workshop.id);
  const workshopProduction = derived.operational.production.find(value => value.buildingId === source.workshop.id);
  const workshopPlayer = derived.operational.playerOperational.find(value => value.buildingId === source.workshop.id);
  const transport = derived.transport.active[0];
  const carrierSnapshot = derived.transport.carrierAssignments.snapshot();
  const route = derived.navigation.routing.find({
    startPosition: { x: 0, y: 0 },
    targetPosition: { x: 4, y: 0 }
  });
  const reachability = derived.navigation.reachability.evaluate({
    startPosition: { x: 0.25, y: 0.25 },
    targetPosition: { x: 4.25, y: 0.25 }
  });
  const recaptured = recapture(state);
  const serializedAfter = PostIM13AuthoritativeSnapshotIntegration.serialize(recaptured);

  const inconsistentSnapshot = structuredClone(snapshot);
  const workshopProgress = inconsistentSnapshot.authoritative.constructionProgress
    .find(value => value.buildingId === source.workshop.id);
  workshopProgress.progress = 0.5;
  workshopProgress.state = 'IN_PROGRESS';
  const inconsistentRestore = PostIM13SaveGameRestoreIntegration.restore(inconsistentSnapshot);
  assert.equal(inconsistentRestore.status, 'RESTORED');
  const inconsistentRebind = PostIM13DerivedStateRebindingIntegration.rebind(inconsistentRestore);

  const capabilities = PostIM13DerivedStateRebindingIntegration.capabilities();
  const checks = Object.freeze({
    consumesExactIM20CRestoredBoundary:
      rebound.kind === 'post-im13-derived-state-rebinding-result'
      && rebound.captureStepIndex === 41
      && state.kind === 'restored-post-im13-authoritative-runtime-state'
      && derived.kind === 'post-im13-rebound-derived-runtime-state',
    restoredBOwnersRemainSource:
      state.world !== source.world
      && state.map !== source.map
      && state.domains !== source.domains
      && derived.sourceRuntimeState === state
      && derived.presentation.visibleWorld.buildings.length === 2,
    housingOccupancyRebuiltWithoutHomeAssignmentReplay:
      housing.capacity === 2
      && housing.occupancy === 2
      && housing.availableSlots === 0
      && housing.status === 'FULL'
      && derived.housing.assignmentIntegration.createdAssignments.length === 0
      && derived.housing.assignmentIntegration.assignments.length === 2,
    populationRebuiltFromRestoredResidentsAndHomes:
      derived.population.count === 2
      && derived.population.personIds.join('|') === `${source.worker.id}|${source.resident.id}`
      && derived.population.occupiedHousingSlots === 2,
    workforceAssignmentReboundWithoutReassignment:
      workshopWorkforce.active === true
      && workshopWorkforce.workforceAssignment.status === 'ASSIGNED'
      && workshopWorkforce.workforceAssignment.assignmentId === 'assignment:00000001'
      && workshopWorkforce.workforceAssignment.assignments[0].personId === source.worker.id
      && workshopWorkforce.workforceAssignment.assignments[0].previousState === null
      && workshopWorkforce.workforceAssignment.assignments[0].assignedState.availability === 'ASSIGNED',
    productionReadinessRebuiltWithoutSettlement:
      workshopProduction.status === 'READY'
      && workshopProduction.execution.status === 'READY'
      && workshopPlayer.status === 'READY_TO_PRODUCE'
      && derived.operational.productionSettlementReplay === false,
    currentGoldAndFenceViewProjectedWithoutReplay:
      derived.gold.currentState.balance === 9
      && derived.gold.settlementIds.join('|') === 'gold-settlement:00000001'
      && derived.gold.historicalLastSettlementNotDerived === true
      && derived.presentation.playerPopulationHousingGold.gold.balance === 9
      && derived.presentation.playerPopulationHousingGold.gold.settlementId === null
      && derived.presentation.playerPopulationHousingGold.gold.settlementReplay === false,
    carrierJobAndExecutionContinuityRebound:
      carrierSnapshot.assignments.length === 1
      && carrierSnapshot.assignments[0].jobId === source.jobId
      && carrierSnapshot.assignments[0].unitId === source.worker.id
      && carrierSnapshot.carriers[0].state === 'OCCUPIED'
      && transport.jobId === source.jobId
      && transport.unitId === source.worker.id
      && transport.execution.state === 'TO_DROPOFF'
      && transport.recoveryAction === 'CONTINUE_TO_DROPOFF'
      && transport.recoveryTarget.refId === source.workshop.id
      && derived.transport.executionForJob(source.jobId) === transport.execution,
    navigationAndRenderingBoundToRestoredB:
      derived.navigation.pathClassification !== state.pathClassification
      && derived.navigation.pathClassificationEntries.length === 2
      && derived.navigation.routing.cacheEntries.length === 0
      && route.kind === 'route'
      && reachability.reachable === true
      && derived.presentation.render.projectVisibleState().buildings.length === 2,
    schedulerPlanPreparedButNotInstalled:
      derived.scheduler.registrations.length === 1
      && derived.scheduler.registrations[0].jobId === source.jobId
      && derived.scheduler.registrations[0].phase === 'movement'
      && derived.scheduler.registrations[0].installed === false
      && derived.scheduler.installed === false
      && derived.scheduler.requiresSuccessfulRuntimeActivation === true,
    inspectorAndPlayerReadModelsRebuilt:
      derived.presentation.inspector.status === 'REBIND_READY'
      && derived.presentation.inspector.population === 2
      && derived.presentation.inspector.housingOccupancy === 2
      && derived.presentation.inspector.gold === 9
      && derived.presentation.inspector.carrierBindingCount === 1
      && derived.presentation.camera.state === null
      && derived.presentation.selection.state === null,
    authoritativeSnapshotUnaffectedByRebinding: serializedAfter === serializedBefore,
    inconsistentDerivedGraphRejectedFailClosed:
      inconsistentRebind.status === 'REJECTED'
      && inconsistentRebind.reason === 'DERIVED_REBIND_FAILED'
      && inconsistentRebind.error.code === 'WORKFORCE_BOUND_TO_NON_OPERATIONAL_BUILDING'
      && inconsistentRebind.derivedState === null,
    rawSnapshotAndRawStateRejected:
      PostIM13DerivedStateRebindingIntegration.rebind(snapshot).reason === 'IM20C_RESTORED_RESULT_REQUIRED'
      && PostIM13DerivedStateRebindingIntegration.rebind(state).reason === 'IM20C_RESTORED_RESULT_REQUIRED',
    noIM20EPlusCapability:
      capabilities.derivedStateRebinding === true
      && capabilities.authoritativeMutation === false
      && capabilities.runtimeActivation === false
      && capabilities.schedulerInstallation === false
      && capabilities.browserStorage === false
      && capabilities.continueLifecycle === false
      && capabilities.exactlyOnceRecoveryReconciliation === false
  });

  assert.equal(Object.values(checks).every(Boolean), true, JSON.stringify(checks, null, 2));

  return Object.freeze({
    kind: 'im-20d-self-test-result',
    pass: true,
    checks,
    evidence: Object.freeze({
      captureStepIndex: rebound.captureStepIndex,
      population: derived.population.count,
      housingOccupancy: housing.occupancy,
      housingCapacity: housing.capacity,
      gold: derived.gold.currentState.balance,
      operationalBuildingCount: derived.operationalAdmissions.filter(value => value.admission.admitted).length,
      productionStatus: workshopProduction.status,
      workforceAssignmentId: workshopWorkforce.workforceAssignment.assignmentId,
      carrierJobId: transport.jobId,
      carrierUnitId: transport.unitId,
      transportExecutionState: transport.execution.state,
      schedulerPlanCount: derived.scheduler.registrations.length,
      canonicalAuthoritativeRoundTripUnchanged: serializedAfter === serializedBefore
    }),
    capabilities
  });
}
