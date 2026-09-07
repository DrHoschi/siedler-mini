import assert from 'node:assert/strict';
import { WorldStore } from '../world/world-store.js';
import { MapStructure } from '../world/map-structure.js';
import { CoreDomainStores } from '../domain/core-domain-stores.js';
import { GoldEconomyOwner } from '../domain/gold-economy-owner.js';
import { SaveGameSnapshotContract } from '../savegame/savegame-snapshot-contract.js';
import { SaveGameValidationContract } from '../savegame/savegame-validation-contract.js';

function clone(value) {
  return structuredClone(value);
}

function hasCode(result, code) {
  return result.errors.some(error => error.code === code);
}

const world = new WorldStore();
const map = new MapStructure(world, { width: 3, height: 2, name: 'IM-13B Validation Test' });
const pathTile = map.createTile({ technicalName: 'path.im13b', traversalType: 'PATH' });
map.setTileAt(1, 0, pathTile.id);

const domains = new CoreDomainStores();
const buildingId = domains.buildings.allocateId();
domains.buildings.create({ definitionId: 'HQ', position: { x: 1, y: 1 } }, { id: buildingId });
const unitId = domains.units.allocateId();
domains.units.create({
  position: { x: 0, y: 0 },
  carrier: { location: { kind: 'cell', refId: map.cellIdAt(0, 0) } },
}, { id: unitId });

const gold = new GoldEconomyOwner({ initialGold: 7 });
const wearCellId = map.cellIdAt(1, 0);
const wear = {
  entries() {
    return Object.freeze([
      Object.freeze({ cellId: wearCellId, traversalType: 'PATH', usageCount: 3, wearUnits: 3 }),
    ]);
  },
};

const snapshot = SaveGameSnapshotContract.capture({
  boundary: SaveGameSnapshotContract.completedStepBoundary(12),
  world,
  map,
  domains,
  gold,
  wear,
});
const serialized = SaveGameSnapshotContract.serialize(snapshot);
const parsed = JSON.parse(serialized);
const beforeValidation = JSON.stringify(parsed);
const valid = SaveGameValidationContract.validate(parsed);
const afterValidation = JSON.stringify(parsed);

assert.equal(valid.kind, 'savegame-validation-result');
assert.equal(valid.schemaVersion, 1);
assert.equal(valid.status, 'VALID');
assert.deepEqual(valid.errors, []);
assert.equal(beforeValidation, afterValidation, 'validation must be side-effect-free');
assert.equal(Object.isFrozen(valid), true);
assert.equal(Object.isFrozen(valid.errors), true);

const badSchema = clone(parsed);
badSchema.schemaVersion = 2;
const badSchemaResult = SaveGameValidationContract.validate(badSchema);
assert.equal(badSchemaResult.status, 'INVALID');
assert.equal(hasCode(badSchemaResult, 'UNSUPPORTED_SCHEMA_VERSION'), true);

const duplicateId = clone(parsed);
duplicateId.domains.buildings.state.items[unitId] = clone(duplicateId.domains.units.state.items[unitId]);
const duplicateIdResult = SaveGameValidationContract.validate(duplicateId);
assert.equal(duplicateIdResult.status, 'INVALID');
assert.equal(hasCode(duplicateIdResult, 'DUPLICATE_STABLE_ID'), true);

const danglingTile = clone(parsed);
const firstCellId = danglingTile.map.cellIds[0];
danglingTile.world.state.entities[firstCellId].tileId = 'tile:99999999';
const danglingTileResult = SaveGameValidationContract.validate(danglingTile);
assert.equal(danglingTileResult.status, 'INVALID');
assert.equal(hasCode(danglingTileResult, 'DANGLING_TILE_REFERENCE'), true);

const danglingDomainRef = clone(parsed);
danglingDomainRef.domains.units.state.items[unitId].carrier.location.refId = 'cell:99999999';
const danglingDomainResult = SaveGameValidationContract.validate(danglingDomainRef);
assert.equal(danglingDomainResult.status, 'INVALID');
assert.equal(hasCode(danglingDomainResult, 'DANGLING_DOMAIN_REFERENCE'), true);

const invalidAllocator = clone(parsed);
invalidAllocator.world.allocator.cell = 1;
const invalidAllocatorResult = SaveGameValidationContract.validate(invalidAllocator);
assert.equal(invalidAllocatorResult.status, 'INVALID');
assert.equal(hasCode(invalidAllocatorResult, 'ALLOCATOR_REUSE_RISK'), true);

const negativeGold = clone(parsed);
negativeGold.economy.gold.balance = -1;
const negativeGoldResult = SaveGameValidationContract.validate(negativeGold);
assert.equal(negativeGoldResult.status, 'INVALID');
assert.equal(hasCode(negativeGoldResult, 'INVALID_GOLD_BALANCE'), true);

const invalidWear = clone(parsed);
invalidWear.pathWear.entries[0].wearUnits = 4;
const invalidWearResult = SaveGameValidationContract.validate(invalidWear);
assert.equal(invalidWearResult.status, 'INVALID');
assert.equal(hasCode(invalidWearResult, 'WEAR_USAGE_MISMATCH'), true);

const danglingWear = clone(parsed);
danglingWear.pathWear.entries[0].cellId = 'cell:99999999';
const danglingWearResult = SaveGameValidationContract.validate(danglingWear);
assert.equal(danglingWearResult.status, 'INVALID');
assert.equal(hasCode(danglingWearResult, 'DANGLING_WEAR_CELL_REFERENCE'), true);

assert.deepEqual(
  SaveGameValidationContract.validate(clone(badSchema)),
  badSchemaResult,
  'same invalid payload must produce same deterministic validation result',
);

console.info('[IM-13B] Deterministic SaveGame Validation Contract PASS', {
  validRoundTrip: valid.status,
  deterministicFailure: badSchemaResult.status,
  schemaRejection: hasCode(badSchemaResult, 'UNSUPPORTED_SCHEMA_VERSION'),
  duplicateStableIdRejection: hasCode(duplicateIdResult, 'DUPLICATE_STABLE_ID'),
  danglingTileRejection: hasCode(danglingTileResult, 'DANGLING_TILE_REFERENCE'),
  danglingDomainReferenceRejection: hasCode(danglingDomainResult, 'DANGLING_DOMAIN_REFERENCE'),
  allocatorReuseRiskRejection: hasCode(invalidAllocatorResult, 'ALLOCATOR_REUSE_RISK'),
  negativeGoldRejection: hasCode(negativeGoldResult, 'INVALID_GOLD_BALANCE'),
  wearMismatchRejection: hasCode(invalidWearResult, 'WEAR_USAGE_MISMATCH'),
  danglingWearRejection: hasCode(danglingWearResult, 'DANGLING_WEAR_CELL_REFERENCE'),
  sideEffectFree: beforeValidation === afterValidation,
  restoreNotIntroduced: true,
});
