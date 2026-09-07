import assert from 'node:assert/strict';
import { WorldStore } from '../world/world-store.js';
import { MapStructure } from '../world/map-structure.js';
import { WorldBackedPathClassificationSource } from '../transport/world-backed-path-classification-source.js';
import { RoadPreferredRoutingIntegration } from '../transport/road-preferred-routing-integration.js';

const world = new WorldStore();
const map = new MapStructure(world, { width: 5, height: 3, cellSize: 1 });

const pathTile = map.createTile({
  technicalName: 'path.test',
  classification: 'terrain',
  passability: 'UNSPECIFIED',
  traversalType: 'PATH',
});
const roadTile = map.createTile({
  technicalName: 'road.test',
  classification: 'terrain',
  passability: 'UNSPECIFIED',
  traversalType: 'ROAD',
});

const pathCellId = map.cellIdAt(1, 1);
const roadCellId = map.cellIdAt(2, 1);
map.setTileAt(1, 1, pathTile.id);
map.setTileAt(2, 1, roadTile.id);

const source = new WorldBackedPathClassificationSource({ map, world });

assert.equal(source.typeAt({ x: 0, y: 0 }), 'NEUTRAL');
assert.equal(source.typeAt({ x: 1, y: 1 }), 'PATH');
assert.equal(source.typeAt({ x: 2, y: 1 }), 'ROAD');
assert.equal(source.classAt({ x: 2, y: 1 }), 'ROAD', 'classAt compatibility alias must preserve classification semantics');
assert.deepEqual(source.entries(), [
  { cellId: pathCellId, traversalType: 'PATH' },
  { cellId: roadCellId, traversalType: 'ROAD' },
].sort((a, b) => a.cellId.localeCompare(b.cellId)));

assert.throws(() => source.typeAt({ x: -1, y: 0 }), /outside map/);
assert.throws(() => source.typeAt({ x: 1.5, y: 1 }), /safe integers/);

// Dynamic world read-through: the same stable MapStructure cell changes classification only when its real tile changes.
assert.equal(map.cellIdAt(1, 1), pathCellId);
map.setTileAt(1, 1, roadTile.id);
assert.equal(map.cellIdAt(1, 1), pathCellId, 'stable cell identity must be preserved');
assert.equal(source.typeAt({ x: 1, y: 1 }), 'ROAD');
map.setTileAt(1, 1, map.defaultTileId);
assert.equal(source.typeAt({ x: 1, y: 1 }), 'NEUTRAL');

// Existing routing integration consumes the world-backed source through the unchanged typeAt(...) boundary.
const route = RoadPreferredRoutingIntegration.find({
  map,
  startPosition: { x: 0, y: 1 },
  targetPosition: { x: 4, y: 1 },
  classificationSource: source,
});
assert.equal(route.kind, 'route');

// CR-32A must not introduce wear state or modify traversal costs/pathfinder ownership.
assert.equal('wear' in roadTile, false);
assert.equal(source.typeAt({ x: 2, y: 1 }), 'ROAD');

console.log('CR-32A PASS / 0 BLOCKER');
