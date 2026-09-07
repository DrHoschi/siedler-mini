import assert from 'node:assert/strict';
import { WorldStore } from '../world/world-store.js';
import { MapStructure } from '../world/map-structure.js';
import { CoreDomainStores } from '../domain/core-domain-stores.js';
import { GoldEconomyOwner } from '../domain/gold-economy-owner.js';
import { SaveGameSnapshotContract } from '../savegame/savegame-snapshot-contract.js';

const world = new WorldStore();
const map = new MapStructure(world, { width: 3, height: 2, name: 'IM-13A Snapshot Test' });
const pathTile = map.createTile({ technicalName: 'path.im13a', traversalType: 'PATH' });
map.setTileAt(1, 0, pathTile.id);

const domains = new CoreDomainStores();
const buildingId = domains.buildings.allocateId();
domains.buildings.create({ definitionId: 'HQ', position: { x: 1, y: 1 } }, { id: buildingId });
const unitId = domains.units.allocateId();
domains.units.create({ position: { x: 0, y: 0 } }, { id: unitId });

const gold = new GoldEconomyOwner({ initialGold: 7 });
const wearCellId = map.cellIdAt(1, 0);
const wear = {
  entries() {
    return Object.freeze([
      Object.freeze({ cellId: wearCellId, traversalType: 'PATH', usageCount: 3, wearUnits: 3 }),
    ]);
  },
};

const boundary = SaveGameSnapshotContract.completedStepBoundary(12);
const snapshotA = SaveGameSnapshotContract.capture({ boundary, world, map, domains, gold, wear });
const snapshotB = SaveGameSnapshotContract.capture({ boundary, world, map, domains, gold, wear });

assert.equal(snapshotA.kind, 'savegame-snapshot');
assert.equal(snapshotA.schemaVersion, 1);
assert.equal(snapshotA.capture.stepIndex, 12);
assert.equal(snapshotA.world.state.worldId, world.worldId);
assert.equal(snapshotA.map.mapId, map.mapId);
assert.deepEqual(snapshotA.map.cellIds, [...map.cellIds()].sort());
assert.equal(snapshotA.domains.buildings.state.items[buildingId].id, buildingId);
assert.equal(snapshotA.domains.units.state.items[unitId].id, unitId);
assert.equal(snapshotA.economy.gold.balance, 7);
assert.equal(snapshotA.pathWear.entries[0].cellId, wearCellId);
assert.equal(snapshotA.pathWear.entries[0].wearUnits, 3);
assert.deepEqual(snapshotA.world.allocator, world.idSnapshot());
assert.deepEqual(snapshotA.domains.units.allocator, domains.units.idSnapshot());
assert.equal('population' in snapshotA, false);
assert.equal('camera' in snapshotA, false);
assert.equal('route' in snapshotA, false);
assert.equal('restore' in snapshotA, false);
assert.equal(SaveGameSnapshotContract.serialize(snapshotA), SaveGameSnapshotContract.serialize(snapshotB));
assert.throws(() => SaveGameSnapshotContract.capture({
  boundary: { kind: 'completed-simulation-step-boundary', status: 'IN_PROGRESS', stepIndex: 12 },
  world, map, domains, gold, wear,
}), /completed simulation-step boundary required/);

console.info('[IM-13A] SaveGame Snapshot Contract PASS', {
  schemaVersion: snapshotA.schemaVersion,
  stepIndex: snapshotA.capture.stepIndex,
  worldId: snapshotA.world.state.worldId,
  mapId: snapshotA.map.mapId,
  domains: Object.keys(snapshotA.domains),
  gold: snapshotA.economy.gold.balance,
  wearEntries: snapshotA.pathWear.entries.length,
  deterministicSerialization: true,
  restoreNotIntroduced: true,
  storageUiNotIntroduced: true,
});
