import assert from 'node:assert/strict';
import { WorldStore } from '../world/world-store.js';
import { MapStructure } from '../world/map-structure.js';
import { CoreDomainStores } from '../domain/core-domain-stores.js';
import { BuildingIdentityOwnershipContract } from '../domain/building-identity-ownership-contract.js';
import { BuildingLifecycleStateContract } from '../domain/building-lifecycle-state-contract.js';
import { WorldBackedTraversabilitySource } from '../transport/world-backed-traversability-source.js';
import { ObstacleAwareRoutingIntegration } from '../transport/obstacle-aware-routing-integration.js';
import { TraversalClassificationSource } from '../transport/traversal-classification-source.js';

function createBuilding(domains, definitionId, position) {
  const buildingId = domains.buildings.allocateId();
  return domains.buildings.create({
    identity: BuildingIdentityOwnershipContract.define({ buildingId, definitionId }),
    lifecycle: BuildingLifecycleStateContract.define({ buildingId }),
    position,
  }, { id: buildingId });
}

const world = new WorldStore();
const map = new MapStructure(world, { width: 6, height: 5, cellSize: 1, origin: { x: 0, y: 0 } });
const domains = new CoreDomainStores();

const first = createBuilding(domains, 'HOUSE', { x: 2, y: 1 });
const second = createBuilding(domains, 'STOREHOUSE', { x: 3.75, y: 3.2 });
const source = new WorldBackedTraversabilitySource({ map, domains });

assert.equal(source.stateAt({ x: 0, y: 0 }), 'TRAVERSABLE');
assert.equal(source.isTraversable({ x: 0, y: 0 }), true);
assert.equal(source.stateAt({ x: 2, y: 1 }), 'BLOCKED');
assert.equal(source.isTraversable({ x: 2, y: 1 }), false);
assert.equal(source.stateAt({ x: 3, y: 3 }), 'BLOCKED', 'world position must deterministically map to containing grid cell');
assert.deepEqual(source.entries(), [
  { cellId: map.cellIdAt(2, 1), state: 'BLOCKED' },
  { cellId: map.cellIdAt(3, 3), state: 'BLOCKED' },
].sort((a, b) => a.cellId.localeCompare(b.cellId)));

const repeated = source.entries();
assert.deepEqual(repeated, source.entries(), 'identical world state must yield identical traversability');
assert.throws(() => source.stateAt({ x: -1, y: 0 }), /outside map/);
assert.throws(() => source.stateAt({ x: 1.5, y: 1 }), /safe integers/);

// Dynamic read-through of real world/domain state: retired static occupancy no longer blocks.
domains.buildings.update(first.id, draft => {
  draft.lifecycle = BuildingLifecycleStateContract.transition(draft.lifecycle, 'RETIRED');
});
assert.equal(source.stateAt({ x: 2, y: 1 }), 'TRAVERSABLE');
assert.equal(source.stateAt({ x: 3, y: 3 }), 'BLOCKED');

// Persons are not static world occupancy in CR-31A and must not become another traffic owner.
domains.units.create({ position: { x: 1, y: 1 } });
assert.equal(source.stateAt({ x: 1, y: 1 }), 'TRAVERSABLE');

// Existing obstacle-aware routing can consume the source unchanged via isTraversable().
const classificationSource = new TraversalClassificationSource({ map });
const route = ObstacleAwareRoutingIntegration.find({
  map,
  startPosition: { x: 0, y: 0 },
  targetPosition: { x: 5, y: 0 },
  classificationSource,
  blockedCellSource: source,
});
assert.equal(route.kind, 'route');
assert.equal(source.stateAt({ x: 3, y: 3 }), 'BLOCKED');
assert.equal(domains.buildings.size, 2);
assert.equal(domains.jobs.size, 0, 'CR-31A must not create logistics/traffic jobs');

console.log('CR-31A PASS / 0 BLOCKER');
