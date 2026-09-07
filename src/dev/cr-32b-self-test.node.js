import assert from 'node:assert/strict';
import { WorldStore } from '../world/world-store.js';
import { MapStructure } from '../world/map-structure.js';
import { WorldBackedPathClassificationSource } from '../transport/world-backed-path-classification-source.js';
import { DeterministicPathUsageWearIntegration } from '../transport/deterministic-path-usage-wear-integration.js';
import { RoadPreferenceCostPolicy } from '../transport/road-preference-cost-policy.js';
import { NextCellReservationIntentContract } from '../transport/next-cell-reservation-intent-contract.js';
import { DeterministicReservationExecutionCycle } from '../transport/deterministic-reservation-execution-cycle.js';
import { CarrierMovementContract } from '../transport/carrier-movement-contract.js';
import { BlockedCellSource } from '../transport/blocked-cell-source.js';
import { ReservationLifecycleTrafficIntegration } from '../transport/reservation-lifecycle-traffic-integration.js';
import { ReservationControlledStepMovementIntegration } from '../transport/reservation-controlled-step-movement-integration.js';

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

function executeRealStep({ map, carrierId, currentCell, nextCell, targetCell, stepNumber }) {
  const route = Object.freeze({
    startPosition: Object.freeze({ ...currentCell }),
    targetPosition: Object.freeze({ ...targetCell }),
    waypoints: Object.freeze([Object.freeze({ ...nextCell })]),
    state: 'ACTIVE',
  });
  const intent = NextCellReservationIntentContract.define({ carrierId, route, currentPosition: currentCell, nextCell });
  const cycle = DeterministicReservationExecutionCycle.run({ intents: [intent], validFromStep: stepNumber, validUntilStep: stepNumber + 1 });
  const blocked = new BlockedCellSource({ map });
  const trafficIntegration = new ReservationLifecycleTrafficIntegration({ blockedCellSource: blocked });
  const movement = CarrierMovementContract.define({ unitId: carrierId, currentPosition: currentCell, state: 'IDLE', targetPosition: null });
  return ReservationControlledStepMovementIntegration.execute({ cycle, route, movement, trafficIntegration });
}

function pathStep(map, carrierId = 'carrier-1', stepNumber = 1) {
  return executeRealStep({ map, carrierId, currentCell: { x: 0, y: 0 }, nextCell: { x: 1, y: 0 }, targetCell: { x: 2, y: 0 }, stepNumber });
}

function roadStep(map, carrierId = 'carrier-1', stepNumber = 1) {
  return executeRealStep({ map, carrierId, currentCell: { x: 1, y: 0 }, nextCell: { x: 2, y: 0 }, targetCell: { x: 3, y: 0 }, stepNumber });
}

function neutralStep(map, carrierId = 'carrier-1', stepNumber = 1) {
  return executeRealStep({ map, carrierId, currentCell: { x: 1, y: 1 }, nextCell: { x: 0, y: 1 }, targetCell: { x: 0, y: 0 }, stepNumber });
}

{
  const { map, wear } = makeFixture();
  const step = pathStep(map);
  assert.equal(step.status, 'COMPLETED');
  const first = wear.recordCompletedStep(step);
  assert.equal(first.status, 'ACCUMULATED');
  assert.equal(first.traversalType, 'PATH');
  assert.equal(first.usageCount, 1);
  assert.equal(first.wearUnits, 1);
  assert.equal(wear.at({ x: 1, y: 0 }).wearUnits, 1);
  console.log('PASS real-cr21c-completed-step-accumulates-path-usage-and-wear');
}

{
  const { map, wear } = makeFixture();
  wear.recordCompletedStep(roadStep(map, 'carrier-1', 10));
  const second = wear.recordCompletedStep(roadStep(map, 'carrier-2', 20));
  assert.equal(second.traversalType, 'ROAD');
  assert.equal(second.usageCount, 2);
  assert.equal(second.wearUnits, 2);
  console.log('PASS repeated-real-completed-steps-accumulate-road-wear');
}

{
  const a = makeFixture();
  const b = makeFixture();
  const aSequence = [pathStep(a.map, 'carrier-1', 1), roadStep(a.map, 'carrier-2', 2), pathStep(a.map, 'carrier-3', 3)];
  const bSequence = [pathStep(b.map, 'carrier-1', 1), roadStep(b.map, 'carrier-2', 2), pathStep(b.map, 'carrier-3', 3)];
  for (const step of aSequence) a.wear.recordCompletedStep(step);
  for (const step of bSequence) b.wear.recordCompletedStep(step);
  assert.deepEqual(a.wear.entries().map(({ traversalType, usageCount, wearUnits }) => ({ traversalType, usageCount, wearUnits })), b.wear.entries().map(({ traversalType, usageCount, wearUnits }) => ({ traversalType, usageCount, wearUnits })));
  console.log('PASS equal-real-step-sequence-produces-equal-wear-state');
}

{
  const { map, wear } = makeFixture();
  const ignored = wear.recordCompletedStep(neutralStep(map));
  assert.equal(ignored.status, 'IGNORED');
  assert.equal(ignored.reason, 'NEUTRAL_CELL');
  assert.equal(wear.entries().length, 0);
  console.log('PASS neutral-cell-does-not-accumulate-path-road-wear');
}

{
  const { wear } = makeFixture();
  assert.throws(() => wear.recordCompletedStep({ kind: 'reservation-controlled-step-movement', status: 'PLANNED', carrierId: 'carrier-1', enteredCell: { x: 1, y: 0 } }), /COMPLETED/);
  assert.throws(() => wear.recordCompletedStep({ kind: 'route', status: 'COMPLETED', carrierId: 'carrier-1', enteredCell: { x: 1, y: 0 } }), /CR-21C/);
  assert.throws(() => wear.recordCompletedStep({ kind: 'reservation-controlled-step-movement', status: 'COMPLETED', carrierId: 'carrier-1', enteredCell: { x: 1, y: 0 }, lifecycleState: { status: 'GRANTED' } }), /consume/);
  assert.equal(wear.entries().length, 0);
  console.log('PASS route-reservation-or-planned-movement-alone-cannot-create-wear');
}

{
  const { map, wear, classification } = makeFixture();
  const beforePathCost = RoadPreferenceCostPolicy.resolve('PATH').traversalCost;
  const beforeRoadCost = RoadPreferenceCostPolicy.resolve('ROAD').traversalCost;
  wear.recordCompletedStep(pathStep(map, 'carrier-1', 30));
  wear.recordCompletedStep(roadStep(map, 'carrier-2', 31));
  assert.equal(classification.classAt({ x: 1, y: 0 }), 'PATH');
  assert.equal(classification.classAt({ x: 2, y: 0 }), 'ROAD');
  assert.equal(RoadPreferenceCostPolicy.resolve('PATH').traversalCost, beforePathCost);
  assert.equal(RoadPreferenceCostPolicy.resolve('ROAD').traversalCost, beforeRoadCost);
  console.log('PASS wear-does-not-yet-change-classification-or-traversal-cost');
}

console.log('CR-32B DETERMINISTIC PATH USAGE / WEAR ACCUMULATION INTEGRATION: PASS / 0 BLOCKER');
