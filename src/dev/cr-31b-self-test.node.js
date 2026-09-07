import assert from 'node:assert/strict';
import { WorldStore } from '../world/world-store.js';
import { MapStructure } from '../world/map-structure.js';
import { CoreDomainStores } from '../domain/core-domain-stores.js';
import { BuildingIdentityOwnershipContract } from '../domain/building-identity-ownership-contract.js';
import { BuildingLifecycleStateContract } from '../domain/building-lifecycle-state-contract.js';
import { WorldBackedTraversabilitySource } from '../transport/world-backed-traversability-source.js';
import { DeterministicWorldReachabilityIntegration } from '../transport/deterministic-world-reachability-integration.js';

function createBuilding(domains, definitionId, position) {
  const buildingId = domains.buildings.allocateId();
  return domains.buildings.create({
    identity: BuildingIdentityOwnershipContract.define({ buildingId, definitionId }),
    lifecycle: BuildingLifecycleStateContract.define({ buildingId }),
    position,
  }, { id: buildingId });
}

function setup(width = 5, height = 5) {
  const world = new WorldStore();
  const map = new MapStructure(world, { width, height, cellSize: 1, origin: { x: 10, y: 20 } });
  const domains = new CoreDomainStores();
  const traversability = new WorldBackedTraversabilitySource({ map, domains });
  return { map, domains, traversability };
}

{
  const { map, domains, traversability } = setup();
  createBuilding(domains, 'HOUSE', { x: 12.2, y: 22.2 });
  const reachable = DeterministicWorldReachabilityIntegration.evaluate({
    map,
    traversability,
    startPosition: { x: 10.2, y: 20.2 },
    targetPosition: { x: 14.7, y: 24.7 },
  });
  assert.equal(reachable.kind, 'world-reachability');
  assert.equal(reachable.reachable, true);
  assert.equal(reachable.reason, 'REACHABLE');
  assert.deepEqual(reachable.startCell, { x: 0, y: 0 });
  assert.deepEqual(reachable.targetCell, { x: 4, y: 4 });
  assert.equal(domains.jobs.size, 0, 'reachability must not create transport/traffic work');

  assert.deepEqual(
    DeterministicWorldReachabilityIntegration.evaluate({ map, traversability, startPosition: { x: 10.2, y: 20.2 }, targetPosition: { x: 14.7, y: 24.7 } }),
    reachable,
    'identical world state must yield identical reachability'
  );

  const sameCell = DeterministicWorldReachabilityIntegration.evaluate({
    map,
    traversability,
    startPosition: { x: 10.1, y: 20.1 },
    targetPosition: { x: 10.9, y: 20.9 },
  });
  assert.equal(sameCell.reachable, true);
  assert.equal(sameCell.reason, 'REACHABLE');

  const blockedTarget = DeterministicWorldReachabilityIntegration.evaluate({
    map,
    traversability,
    startPosition: { x: 10.2, y: 20.2 },
    targetPosition: { x: 12.5, y: 22.5 },
  });
  assert.equal(blockedTarget.reachable, false);
  assert.equal(blockedTarget.reason, 'TARGET_BLOCKED');

  const blockedStart = DeterministicWorldReachabilityIntegration.evaluate({
    map,
    traversability,
    startPosition: { x: 12.5, y: 22.5 },
    targetPosition: { x: 10.2, y: 20.2 },
  });
  assert.equal(blockedStart.reachable, false);
  assert.equal(blockedStart.reason, 'START_BLOCKED');

  assert.throws(() => DeterministicWorldReachabilityIntegration.evaluate({
    map, traversability, startPosition: { x: 9.9, y: 20 }, targetPosition: { x: 10.2, y: 20.2 },
  }), /startPosition outside map/);
}

{
  const { map, domains, traversability } = setup(5, 4);
  for (let y = 0; y < 4; y += 1) createBuilding(domains, `WALL_${y}`, { x: 12.2, y: 20.2 + y });
  const disconnected = DeterministicWorldReachabilityIntegration.evaluate({
    map,
    traversability,
    startPosition: { x: 10.2, y: 21.2 },
    targetPosition: { x: 14.2, y: 21.2 },
  });
  assert.equal(disconnected.reachable, false);
  assert.equal(disconnected.reason, 'NO_TRAVERSABLE_CONNECTION');
}

console.log('CR-31B PASS / 0 BLOCKER');
