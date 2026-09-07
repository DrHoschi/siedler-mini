import assert from 'node:assert/strict';
import { WorldStore } from '../world/world-store.js';
import { MapStructure } from '../world/map-structure.js';
import { WorldBackedPathClassificationSource } from '../transport/world-backed-path-classification-source.js';
import { DeterministicPathUsageWearIntegration } from '../transport/deterministic-path-usage-wear-integration.js';
import { RoadPreferenceCostPolicy } from '../transport/road-preference-cost-policy.js';
import { WearAwareTraversalCostResolver, WEAR_COST_PER_UNIT } from '../transport/wear-aware-traversal-cost-resolver.js';
import { RoadPreferredRoutingIntegration } from '../transport/road-preferred-routing-integration.js';

const UNIT_ID = 'unit:00000001';

function completedStep(enteredCell) {
  const cell = Object.freeze({ ...enteredCell });
  return Object.freeze({
    kind: 'reservation-controlled-step-movement',
    status: 'COMPLETED',
    carrierId: UNIT_ID,
    enteredCell: cell,
    lifecycleState: Object.freeze({ status: 'CONSUMED' }),
    movement: Object.freeze({ state: 'IDLE', currentPosition: cell }),
    blocking: Object.freeze({ blocks: false }),
    readyForNextIntent: true,
  });
}

function makeFixture() {
  const world = new WorldStore();
  const map = new MapStructure(world, { width: 4, height: 3, name: 'CR-32C fixture' });
  const pathTile = map.createTile({ technicalName: 'path.cr32c', classification: 'terrain', passability: 'UNSPECIFIED', traversalType: 'PATH' });
  const roadTile = map.createTile({ technicalName: 'road.cr32c', classification: 'terrain', passability: 'UNSPECIFIED', traversalType: 'ROAD' });

  for (let x = 0; x < 4; x += 1) map.setTileAt(x, 0, pathTile.id);
  map.setTileAt(1, 1, roadTile.id);
  map.setTileAt(2, 1, roadTile.id);

  const classification = new WorldBackedPathClassificationSource({ map, world });
  const wear = new DeterministicPathUsageWearIntegration({ map, classification });
  const resolver = new WearAwareTraversalCostResolver({ profiles: RoadPreferenceCostPolicy.profiles, wearSource: wear });
  return { world, map, classification, wear, resolver };
}

{
  const { classification, resolver } = makeFixture();
  const typeAt = position => classification.typeAt(position);
  assert.equal(WEAR_COST_PER_UNIT, 0.01);
  assert.equal(resolver.resolveAt({ x: 3, y: 2 }, { typeAt }).traversalCost, 1);
  assert.equal(resolver.resolveAt({ x: 0, y: 0 }, { typeAt }).traversalCost, 0.75);
  assert.equal(resolver.resolveAt({ x: 1, y: 1 }, { typeAt }).traversalCost, 0.5);
  console.log('PASS wear-zero-preserves-frozen-road-preference-costs-exactly');
}

{
  const { classification, wear, resolver } = makeFixture();
  const typeAt = position => classification.typeAt(position);
  for (let i = 0; i < 10; i += 1) {
    wear.recordCompletedStep(completedStep({ x: 0, y: 0 }));
    wear.recordCompletedStep(completedStep({ x: 1, y: 1 }));
  }
  const pathCost = resolver.resolveAt({ x: 0, y: 0 }, { typeAt });
  const roadCost = resolver.resolveAt({ x: 1, y: 1 }, { typeAt });
  assert.equal(pathCost.wearUnits, 10);
  assert.equal(pathCost.traversalCost, 0.85);
  assert.equal(roadCost.wearUnits, 10);
  assert.equal(roadCost.traversalCost, 0.6);
  assert.equal(classification.typeAt({ x: 0, y: 0 }), 'PATH');
  assert.equal(classification.typeAt({ x: 1, y: 1 }), 'ROAD');
  console.log('PASS deterministic-linear-wear-cost-addition-preserves-classification');
}

{
  const { classification, wear, resolver } = makeFixture();
  const typeAt = position => classification.typeAt(position);
  const before = resolver.resolveAt({ x: 1, y: 1 }, { typeAt }).traversalCost;
  for (let i = 0; i < 25; i += 1) wear.recordCompletedStep(completedStep({ x: 1, y: 1 }));
  const after25 = resolver.resolveAt({ x: 1, y: 1 }, { typeAt }).traversalCost;
  for (let i = 0; i < 25; i += 1) wear.recordCompletedStep(completedStep({ x: 1, y: 1 }));
  const after50 = resolver.resolveAt({ x: 1, y: 1 }, { typeAt }).traversalCost;
  assert.equal(before, 0.5);
  assert.equal(after25, 0.75);
  assert.equal(after50, 1);
  assert.ok(before < after25 && after25 < after50);
  console.log('PASS wear-cost-is-deterministic-and-monotonic-without-cap-or-rounding-policy');
}

{
  const { map, classification, wear } = makeFixture();
  const startPosition = { x: 0, y: 1 };
  const targetPosition = { x: 3, y: 1 };

  const legacyRoute = RoadPreferredRoutingIntegration.find({ map, startPosition, targetPosition, classificationSource: classification });
  const zeroWearRoute = RoadPreferredRoutingIntegration.find({ map, startPosition, targetPosition, classificationSource: classification, wearSource: wear });
  assert.deepEqual(zeroWearRoute, legacyRoute);
  assert.deepEqual(zeroWearRoute.waypoints[0], { x: 1, y: 1 });

  for (let i = 0; i < 101; i += 1) {
    wear.recordCompletedStep(completedStep({ x: 1, y: 1 }));
    wear.recordCompletedStep(completedStep({ x: 2, y: 1 }));
  }

  const wornRouteA = RoadPreferredRoutingIntegration.find({ map, startPosition, targetPosition, classificationSource: classification, wearSource: wear });
  const wornRouteB = RoadPreferredRoutingIntegration.find({ map, startPosition, targetPosition, classificationSource: classification, wearSource: wear });
  assert.deepEqual(wornRouteA, wornRouteB);
  assert.notDeepEqual(wornRouteA.waypoints[0], { x: 1, y: 1 });
  assert.deepEqual(wornRouteA.waypoints[0], { x: 0, y: 0 });
  console.log('PASS existing-pathfinder-deterministically-chooses-cheaper-alternative-under-wear');
}

{
  const { classification, wear, resolver } = makeFixture();
  const typeAt = position => classification.typeAt(position);
  const neutralBefore = resolver.resolveAt({ x: 3, y: 2 }, { typeAt });
  const ignored = wear.recordCompletedStep(completedStep({ x: 3, y: 2 }));
  const neutralAfter = resolver.resolveAt({ x: 3, y: 2 }, { typeAt });
  assert.equal(ignored.status, 'IGNORED');
  assert.equal(ignored.reason, 'NEUTRAL_CELL');
  assert.equal(neutralBefore.traversalCost, 1);
  assert.equal(neutralAfter.traversalCost, 1);
  assert.equal(neutralAfter.wearUnits, 0);
  console.log('PASS neutral-remains-unaffected-by-wear-cost-integration');
}

console.log('CR-32C WEAR-AWARE TRAVERSAL COST INTEGRATION: PASS / 0 BLOCKER');
