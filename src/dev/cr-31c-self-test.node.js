import assert from 'node:assert/strict';
import { WorldStore } from '../world/world-store.js';
import { MapStructure } from '../world/map-structure.js';
import { CoreDomainStores } from '../domain/core-domain-stores.js';
import { BuildingIdentityOwnershipContract } from '../domain/building-identity-ownership-contract.js';
import { BuildingLifecycleStateContract } from '../domain/building-lifecycle-state-contract.js';
import { PersonResidentIdentityContract } from '../domain/person-resident-identity-contract.js';
import { CarrierContract } from '../transport/carrier-contract.js';
import { CarrierMovementContract } from '../transport/carrier-movement-contract.js';
import { WorldBackedTraversabilitySource } from '../transport/world-backed-traversability-source.js';
import { RuntimeEntityNavigationValidationIntegration } from '../transport/runtime-entity-navigation-validation-integration.js';

const world = new WorldStore();
const map = new MapStructure(world, { width: 6, height: 5, cellSize: 1 });
const domains = new CoreDomainStores();

function createBuilding(position) {
  const buildingId = domains.buildings.allocateId();
  return domains.buildings.create({
    identity: BuildingIdentityOwnershipContract.define({ buildingId, definitionId: 'TEST_BUILDING' }),
    lifecycle: BuildingLifecycleStateContract.define({ buildingId }),
    position,
  }, { id: buildingId });
}

function createPerson(position) {
  const personId = domains.units.allocateId();
  return domains.units.create({
    identity: PersonResidentIdentityContract.define({ personId }),
    position,
  }, { id: personId });
}

function createCarrier(position) {
  const unitId = domains.units.allocateId();
  return domains.units.create({
    position,
    carrier: CarrierContract.define({
      unitId,
      capacity: 2,
      location: { kind: 'cell', refId: map.cellIdAt(Math.floor(position.x), Math.floor(position.y)) },
    }),
  }, { id: unitId });
}

createBuilding({ x: 2, y: 2 });
const traversability = new WorldBackedTraversabilitySource({ map, domains });
const person = createPerson({ x: 0.25, y: 0.25 });
const blockedPerson = createPerson({ x: 2.25, y: 2.25 });
const carrier = createCarrier({ x: 1.25, y: 1.25 });

const personPosition = RuntimeEntityNavigationValidationIntegration.validatePerson({
  domains,
  map,
  traversability,
  personId: person.id,
});
assert.equal(personPosition.valid, true);
assert.equal(personPosition.reason, 'POSITION_VALID');
assert.equal(personPosition.targetPosition, null);

const personTarget = RuntimeEntityNavigationValidationIntegration.validatePerson({
  domains,
  map,
  traversability,
  personId: person.id,
  targetPosition: { x: 5.25, y: 4.25 },
});
assert.equal(personTarget.valid, true);
assert.equal(personTarget.reason, 'TARGET_REACHABLE');

const repeatedPersonTarget = RuntimeEntityNavigationValidationIntegration.validatePerson({
  domains,
  map,
  traversability,
  personId: person.id,
  targetPosition: { x: 5.25, y: 4.25 },
});
assert.deepEqual(repeatedPersonTarget, personTarget, 'identical runtime state must produce identical validation');

const blockedPosition = RuntimeEntityNavigationValidationIntegration.validatePerson({
  domains,
  map,
  traversability,
  personId: blockedPerson.id,
});
assert.equal(blockedPosition.valid, false);
assert.equal(blockedPosition.reason, 'START_BLOCKED');

const blockedTarget = RuntimeEntityNavigationValidationIntegration.validatePerson({
  domains,
  map,
  traversability,
  personId: person.id,
  targetPosition: { x: 2.25, y: 2.25 },
});
assert.equal(blockedTarget.valid, false);
assert.equal(blockedTarget.reason, 'TARGET_BLOCKED');

const moving = CarrierMovementContract.define({
  unitId: carrier.id,
  currentPosition: carrier.position,
  state: 'MOVING',
  targetPosition: { x: 5.25, y: 0.25 },
});
const carrierValidation = RuntimeEntityNavigationValidationIntegration.validateCarrierMovement({
  domains,
  map,
  traversability,
  movement: moving,
});
assert.equal(carrierValidation.valid, true);
assert.equal(carrierValidation.reason, 'TARGET_REACHABLE');

const mismatchedMovement = CarrierMovementContract.define({
  unitId: carrier.id,
  currentPosition: { x: 1.5, y: 1.25 },
  state: 'MOVING',
  targetPosition: { x: 5.25, y: 0.25 },
});
const mismatch = RuntimeEntityNavigationValidationIntegration.validateCarrierMovement({
  domains,
  map,
  traversability,
  movement: mismatchedMovement,
});
assert.equal(mismatch.valid, false);
assert.equal(mismatch.reason, 'ENTITY_POSITION_MISMATCH');

assert.throws(() => RuntimeEntityNavigationValidationIntegration.validatePerson({
  domains,
  map,
  traversability,
  personId: 'unit-999999',
}), /unknown runtime unit/);

assert.equal(domains.jobs.size, 0, 'navigation validation must not create TransportJobs');
assert.equal(domains.units.get(person.id).position.x, 0.25, 'person position must remain unchanged');
assert.equal(domains.units.get(carrier.id).position.x, 1.25, 'carrier position must remain unchanged');

console.log('CR-31C RUNTIME ENTITY NAVIGATION VALIDATION INTEGRATION: PASS / 0 BLOCKER');
