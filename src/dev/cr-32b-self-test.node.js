import assert from 'node:assert/strict';
import { WorldStore } from '../world/world-store.js';
import { MapStructure } from '../world/map-structure.js';
import { WorldBackedPathClassificationSource } from '../transport/world-backed-path-classification-source.js';
import { DeterministicPathUsageWearIntegration } from '../transport/deterministic-path-usage-wear-integration.js';
import { RoadPreferenceCostPolicy } from '../transport/road-preference-cost-policy.js';

function makeCompletedStep(carrierId, enteredCell) {
  return Object.freeze({
    kind: 'reservation-controlled-step-movement',
    status: 'COMPLETED',
    carrierId,
    enteredCell: Object.freeze({ ...enteredCell }),
  });
}

function makeFixture() {
  const world = new WorldStore();
  const map = new MapStructure(world, { width: 4, height: 2, name: 'CR-32B fixture' });
  const pathTile = map.createTile({ technicalName: 'path.cr32b', classification: 'terrain', passability: 'UNSPECIFIED', traversalType: 'PATH' });
  const roadTile = map.createTile({ technicalName: 'road.cr32b', classification: 'terrain', passability: 'UNSPECIFIED', traversalType: 'ROAD' });
  map.setTileAt(1, 0, pathTile.id);
  map.setTileAt(2, 0, roadTile.id);
  const classification = new WorldBackedPathClassificationSource({ map, world });
  const wear = new DeterministicPathUsageWearIntegration({ map, classification });
  return { world, map, classification, wear };
}

{
  const { wear } = makeFixture();
  const first = wear.recordCompletedStep(makeCompletedStep('carrier-1', { x: 1, y: 0 }));
  assert.equal(first.status, 'ACCUMULATED');
  assert.equal(first.traversalType, 'PATH');
  assert.equal(first.usageCount, 1);
  assert.equal(first.wearUnits, 1);
  assert.equal(wear.at({ x: 1, y: 0 }).wearUnits, 1);
  console.log('PASS completed-real-step-accumulates-path-usage-and-wear');
}

{
  const { wear } = makeFixture();
  wear.recordCompletedStep(makeCompletedStep('carrier-1', { x: 2, y: 0 }));
  const second = wear.recordCompletedStep(makeCompletedStep('carrier-2', { x: 2, y: 0 }));
  assert.equal(second.traversalType, 'ROAD');
  assert.equal(second.usageCount, 2);
  assert.equal(second.wearUnits, 2);
  console.log('PASS repeated-completed-steps-accumulate-road-wear');
}

{
  const a = makeFixture();
  const b = makeFixture();
  const sequence = [
    makeCompletedStep('carrier-1', { x: 1, y: 0 }),
    makeCompletedStep('carrier-2', { x: 2, y: 0 }),
    makeCompletedStep('carrier-3', { x: 1, y: 0 }),
  ];
  for (const step of sequence) {
    a.wear.recordCompletedStep(step);
    b.wear.recordCompletedStep(step);
  }
  assert.deepEqual(a.wear.entries().map(({ traversalType, usageCount, wearUnits }) => ({ traversalType, usageCount, wearUnits })), b.wear.entries().map(({ traversalType, usageCount, wearUnits }) => ({ traversalType, usageCount, wearUnits })));
  console.log('PASS equal-completed-step-sequence-produces-equal-wear-state');
}

{
  const { wear } = makeFixture();
  const ignored = wear.recordCompletedStep(makeCompletedStep('carrier-1', { x: 0, y: 0 }));
  assert.equal(ignored.status, 'IGNORED');
  assert.equal(ignored.reason, 'NEUTRAL_CELL');
  assert.equal(wear.entries().length, 0);
  console.log('PASS neutral-cell-does-not-accumulate-path-road-wear');
}

{
  const { wear } = makeFixture();
  assert.throws(() => wear.recordCompletedStep({ kind: 'reservation-controlled-step-movement', status: 'PLANNED', carrierId: 'carrier-1', enteredCell: { x: 1, y: 0 } }), /COMPLETED/);
  assert.throws(() => wear.recordCompletedStep({ kind: 'route', status: 'COMPLETED', carrierId: 'carrier-1', enteredCell: { x: 1, y: 0 } }), /CR-21C/);
  assert.equal(wear.entries().length, 0);
  console.log('PASS planning-routing-or-uncompleted-movement-cannot-create-wear');
}

{
  const { wear, classification } = makeFixture();
  const beforePathCost = RoadPreferenceCostPolicy.resolve('PATH').cost;
  const beforeRoadCost = RoadPreferenceCostPolicy.resolve('ROAD').cost;
  wear.recordCompletedStep(makeCompletedStep('carrier-1', { x: 1, y: 0 }));
  wear.recordCompletedStep(makeCompletedStep('carrier-2', { x: 2, y: 0 }));
  assert.equal(classification.classAt({ x: 1, y: 0 }), 'PATH');
  assert.equal(classification.classAt({ x: 2, y: 0 }), 'ROAD');
  assert.equal(RoadPreferenceCostPolicy.resolve('PATH').cost, beforePathCost);
  assert.equal(RoadPreferenceCostPolicy.resolve('ROAD').cost, beforeRoadCost);
  console.log('PASS wear-does-not-yet-change-classification-or-traversal-cost');
}

console.log('CR-32B DETERMINISTIC PATH USAGE / WEAR ACCUMULATION INTEGRATION: PASS / 0 BLOCKER');
