import assert from 'node:assert/strict';
import { WorldStore } from '../world/world-store.js';
import { MapStructure } from '../world/map-structure.js';
import { formatStableId } from '../world/stable-id.js';
import { CoreDomainStores } from '../domain/core-domain-stores.js';
import { GoldEconomyOwner } from '../domain/gold-economy-owner.js';
import { SaveGameSnapshotContract } from '../savegame/savegame-snapshot-contract.js';
import { SaveGameValidationContract } from '../savegame/savegame-validation-contract.js';
import { SaveGameRestoreContract } from '../savegame/savegame-restore-contract.js';

const world = new WorldStore();
const map = new MapStructure(world, { width: 3, height: 2, name: 'IM-13C Restore Test' });
const pathTile = map.createTile({ technicalName: 'path.im13c', traversalType: 'PATH' });
const roadTile = map.createTile({ technicalName: 'road.im13c', traversalType: 'ROAD' });
map.setTileAt(1, 0, pathTile.id);
map.setTileAt(2, 0, roadTile.id);

const domains = new CoreDomainStores();
const buildingId = domains.buildings.allocateId();
domains.buildings.create({ definitionId: 'HQ', position: { x: 1, y: 1 } }, { id: buildingId });
const unitId = domains.units.allocateId();
domains.units.create({ homeBuildingId: buildingId, position: { x: 0, y: 0 } }, { id: unitId });
const resourceId = domains.resources.allocateId();
domains.resources.create({ definitionId: 'WOOD', amount: 4 }, { id: resourceId });
const jobId = domains.jobs.allocateId();
domains.jobs.create({ carrierId: unitId, sourceBuildingId: buildingId, resourceId }, { id: jobId });

const gold = new GoldEconomyOwner({ initialGold: 11 });
const wearEntries = Object.freeze([
  Object.freeze({ cellId: map.cellIdAt(1, 0), traversalType: 'PATH', usageCount: 3, wearUnits: 3 }),
  Object.freeze({ cellId: map.cellIdAt(2, 0), traversalType: 'ROAD', usageCount: 2, wearUnits: 2 }),
]);
const wear = { entries: () => wearEntries };
const boundary = SaveGameSnapshotContract.completedStepBoundary(27);
const snapshotA = SaveGameSnapshotContract.capture({ boundary, world, map, domains, gold, wear });
const serializedA = SaveGameSnapshotContract.serialize(snapshotA);
const parsed = JSON.parse(serializedA);

assert.equal(SaveGameValidationContract.validate(parsed).status, 'VALID');
const restored = SaveGameRestoreContract.restore(parsed);
assert.equal(restored.status, 'RESTORED');
assert.equal(restored.validation.status, 'VALID');
assert.equal(restored.captureStepIndex, 27);

const stateB = restored.runtimeState;
assert.deepEqual(stateB.world.snapshot(), snapshotA.world.state);
assert.deepEqual(stateB.world.idSnapshot(), snapshotA.world.allocator);
assert.equal(stateB.map.mapId, snapshotA.map.mapId);
assert.equal(stateB.map.defaultTileId, snapshotA.map.defaultTileId);
assert.deepEqual([...stateB.map.cellIds()], snapshotA.map.cellIds);
assert.deepEqual(stateB.domains.buildings.snapshot(), snapshotA.domains.buildings.state);
assert.deepEqual(stateB.domains.units.snapshot(), snapshotA.domains.units.state);
assert.deepEqual(stateB.domains.resources.snapshot(), snapshotA.domains.resources.state);
assert.deepEqual(stateB.domains.jobs.snapshot(), snapshotA.domains.jobs.state);
assert.equal(stateB.goldEconomy.balance, snapshotA.economy.gold.balance);
assert.deepEqual(stateB.pathUsageWear.entries(), snapshotA.pathWear.entries);

const snapshotB = SaveGameSnapshotContract.capture({
  boundary: SaveGameSnapshotContract.completedStepBoundary(restored.captureStepIndex),
  world: stateB.world,
  map: stateB.map,
  domains: stateB.domains,
  gold: stateB.goldEconomy,
  wear: stateB.pathUsageWear,
});
const serializedB = SaveGameSnapshotContract.serialize(snapshotB);
assert.equal(serializedB, serializedA, 'canonical Capture A -> Restore B -> Capture B round-trip must be identical');

const expectedNextTileId = formatStableId('tile', snapshotA.world.allocator.tile);
assert.equal(stateB.world.allocateId('tile'), expectedNextTileId, 'world allocator must continue exactly at saved next sequence');
const expectedNextBuildingId = formatStableId('building', snapshotA.domains.buildings.allocator.building);
assert.equal(stateB.domains.buildings.allocateId(), expectedNextBuildingId, 'domain allocator must continue exactly at saved next sequence');

const currentBeforeReject = {
  world: world.snapshot(),
  domains: domains.snapshot(),
  gold: gold.snapshot(),
};
const invalid = structuredClone(parsed);
invalid.economy.gold.balance = -1;
const rejected = SaveGameRestoreContract.restore(invalid);
assert.equal(rejected.status, 'REJECTED');
assert.equal(rejected.validation.status, 'INVALID');
assert.deepEqual(world.snapshot(), currentBeforeReject.world, 'rejected restore must not mutate current world');
assert.deepEqual(domains.snapshot(), currentBeforeReject.domains, 'rejected restore must not mutate current domains');
assert.deepEqual(gold.snapshot(), currentBeforeReject.gold, 'rejected restore must not mutate current gold');
assert.equal('runtimeState' in rejected, false);

console.info('[IM-13C] Deterministic SaveGame Restore Contract PASS', {
  schemaVersion: snapshotA.schemaVersion,
  captureStepIndex: snapshotA.capture.stepIndex,
  validationBeforeRestore: 'VALID',
  roundTripCanonicalIdentity: serializedA === serializedB,
  stableIdsPreserved: true,
  allocatorContinuity: true,
  goldPreserved: stateB.goldEconomy.balance,
  wearEntriesPreserved: stateB.pathUsageWear.entries().length,
  invalidRestoreRejectedBeforeCommit: true,
  saveSlotsUiNotIntroduced: true,
  schemaMigrationNotIntroduced: true,
});
