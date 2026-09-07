import assert from 'node:assert/strict';
import { WorldStore } from '../world/world-store.js';
import { MapStructure } from '../world/map-structure.js';
import { CoreDomainStores } from '../domain/core-domain-stores.js';
import { BuildingIdentityOwnershipContract } from '../domain/building-identity-ownership-contract.js';
import { BuildingLifecycleStateContract } from '../domain/building-lifecycle-state-contract.js';
import { PersonResidentIdentityContract } from '../domain/person-resident-identity-contract.js';
import { GoldEconomyOwner } from '../domain/gold-economy-owner.js';
import { WorldBackedPathClassificationSource } from '../transport/world-backed-path-classification-source.js';
import { DeterministicPathUsageWearIntegration } from '../transport/deterministic-path-usage-wear-integration.js';
import { SaveGameSnapshotContract } from '../savegame/savegame-snapshot-contract.js';
import { SaveGameValidationContract } from '../savegame/savegame-validation-contract.js';
import { SaveGameRestoreContract } from '../savegame/savegame-restore-contract.js';
import { RestoredRuntimeActivationContract } from '../savegame/restored-runtime-activation-contract.js';

function createBuilding(domains, definitionId, position) {
  const buildingId = domains.buildings.allocateId();
  return domains.buildings.create({
    identity: BuildingIdentityOwnershipContract.define({ buildingId, definitionId }),
    lifecycle: BuildingLifecycleStateContract.define({ buildingId }),
    position,
  }, { id: buildingId });
}

function createPerson(domains, position) {
  const personId = domains.units.allocateId();
  return domains.units.create({
    identity: PersonResidentIdentityContract.define({ personId }),
    position,
  }, { id: personId });
}

const worldA = new WorldStore();
const mapA = new MapStructure(worldA, { width: 4, height: 3, name: 'IM-13D Activation Test' });
const pathTile = mapA.createTile({ technicalName: 'path.im13d', traversalType: 'PATH' });
const roadTile = mapA.createTile({ technicalName: 'road.im13d', traversalType: 'ROAD' });
mapA.setTileAt(1, 2, pathTile.id);
mapA.setTileAt(2, 2, roadTile.id);

const domainsA = new CoreDomainStores();
createBuilding(domainsA, 'HQ', { x: 1, y: 1 });
const personA = createPerson(domainsA, { x: 0.25, y: 0.25 });
const goldA = new GoldEconomyOwner({ initialGold: 7 });
const classificationA = new WorldBackedPathClassificationSource({ map: mapA, world: worldA });
const wearA = new DeterministicPathUsageWearIntegration({
  map: mapA,
  classification: classificationA,
  initialEntries: [
    { cellId: mapA.cellIdAt(1, 2), traversalType: 'PATH', usageCount: 3, wearUnits: 3 },
    { cellId: mapA.cellIdAt(2, 2), traversalType: 'ROAD', usageCount: 1, wearUnits: 1 },
  ],
});

const boundary = SaveGameSnapshotContract.completedStepBoundary(44);
const snapshotA = SaveGameSnapshotContract.capture({
  boundary,
  world: worldA,
  map: mapA,
  domains: domainsA,
  gold: goldA,
  wear: wearA,
});
const serializedA = SaveGameSnapshotContract.serialize(snapshotA);
const parsed = JSON.parse(serializedA);
assert.equal(SaveGameValidationContract.validate(parsed).status, 'VALID');
const capturedBuildingCount = Object.keys(snapshotA.domains.buildings.state.items).length;

const activeA = {
  world: worldA,
  map: mapA,
  domains: domainsA,
  goldEconomy: goldA,
  pathClassification: classificationA,
  pathUsageWear: wearA,
};
const owner = new RestoredRuntimeActivationContract({ activeAuthoritativeState: activeA });
const compositionA = owner.active();

// Change only the old live A after capture. B must come from the captured snapshot, not from this later A state.
createBuilding(domainsA, 'A_ONLY_AFTER_CAPTURE', { x: 3, y: 1 });
const aBuildingCountAfterCapture = domainsA.buildings.ids().length;
assert.equal(aBuildingCountAfterCapture, capturedBuildingCount + 1);

const restored = SaveGameRestoreContract.restore(parsed);
assert.equal(restored.status, 'RESTORED');
const activation = owner.activate(restored);
assert.equal(activation.status, 'ACTIVATED');
const compositionB = owner.active();
const stateB = restored.runtimeState;

assert.notEqual(compositionB, compositionA);
assert.equal(compositionB.authoritative.world, stateB.world);
assert.equal(compositionB.authoritative.map, stateB.map);
assert.equal(compositionB.authoritative.domains, stateB.domains);
assert.equal(compositionB.authoritative.goldEconomy, stateB.goldEconomy);
assert.equal(compositionB.authoritative.pathClassification, stateB.pathClassification);
assert.equal(compositionB.authoritative.pathUsageWear, stateB.pathUsageWear);

const bProjection = compositionB.derived.render.projectVisibleState();
assert.equal(bProjection.buildings.length, capturedBuildingCount, 'render projection must read restored B domains, not mutated A');
assert.equal(compositionB.derived.traversability.entries().length, 1, 'traversability must be rebuilt from restored B building truth');
const navigationB = compositionB.derived.navigation.validatePerson({
  personId: personA.id,
  targetPosition: { x: 3.25, y: 2.25 },
});
assert.equal(navigationB.kind, 'runtime-entity-navigation-validation');
assert.equal(navigationB.unitId, personA.id);
const reachabilityB = compositionB.derived.reachability.evaluate({
  startPosition: { x: 0.25, y: 0.25 },
  targetPosition: { x: 3.25, y: 2.25 },
});
assert.equal(reachabilityB.kind, 'world-reachability-result');
assert.equal(compositionB.derived.populationPolicy.persisted, false);
assert.equal(compositionB.derived.populationPolicy.mutationDuringActivation, false);

const snapshotB = SaveGameSnapshotContract.capture({
  boundary: SaveGameSnapshotContract.completedStepBoundary(restored.captureStepIndex),
  world: compositionB.authoritative.world,
  map: compositionB.authoritative.map,
  domains: compositionB.authoritative.domains,
  gold: compositionB.authoritative.goldEconomy,
  wear: compositionB.authoritative.pathUsageWear,
});
const serializedB = SaveGameSnapshotContract.serialize(snapshotB);
assert.equal(serializedB, serializedA, 'Capture A -> Restore B -> Activate B -> Capture B must remain canonically identical');
assert.equal(compositionB.authoritative.goldEconomy.balance, 7, 'activation must not settle/recalculate Gold');
assert.deepEqual(compositionB.authoritative.pathUsageWear.entries(), snapshotA.pathWear.entries, 'activation must not recalculate Wear');

let published = false;
const failingOwner = new RestoredRuntimeActivationContract({
  activeAuthoritativeState: activeA,
  publish: () => {
    published = true;
    throw new Error('intentional IM-13D publish failure');
  },
});
const failingPrevious = failingOwner.active();
const failedActivation = failingOwner.activate(restored);
assert.equal(published, true);
assert.equal(failedActivation.status, 'REJECTED');
assert.equal(failedActivation.reason, 'ATOMIC_PUBLISH_FAILED');
assert.equal(failingOwner.active(), failingPrevious, 'failed activation must keep complete prior A composition active');

const rawSnapshotRejected = owner.activate(parsed);
assert.equal(rawSnapshotRejected.status, 'REJECTED');
assert.equal(rawSnapshotRejected.reason, 'IM-13C_RESTORED_RESULT_REQUIRED');
assert.equal(owner.active(), compositionB, 'non-RESTORED activation input must not replace active B');

console.info('[IM-13D] Deterministic Restored Runtime Activation & Derived Rebinding Contract PASS', {
  validationBeforeRestore: 'VALID',
  restoreStatus: restored.status,
  activationStatus: activation.status,
  activeOwnersAreRestoredB: true,
  traversabilityReboundToB: true,
  navigationReboundToB: navigationB.valid,
  reachabilityReboundToB: reachabilityB.reachable,
  renderProjectionReadsB: bProjection.buildings.length,
  populationRemainsDerivedAndNonPersisted: true,
  goldUnchangedByActivation: compositionB.authoritative.goldEconomy.balance,
  wearUnchangedByActivation: compositionB.authoritative.pathUsageWear.entries().length,
  canonicalRoundTripIdentity: serializedA === serializedB,
  failedActivationKeepsA: failingOwner.active() === failingPrevious,
  rawSnapshotActivationRejected: true,
  saveSlotsStorageUiNotIntroduced: true,
  schemaMigrationNotIntroduced: true,
});
