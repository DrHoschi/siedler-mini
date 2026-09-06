import assert from 'node:assert/strict';
import { CoreDomainStores } from '../domain/core-domain-stores.js';
import { BuildingIdentityOwnershipContract } from '../domain/building-identity-ownership-contract.js';
import { BuildingLifecycleStateContract } from '../domain/building-lifecycle-state-contract.js';
import { PersonResidentIdentityContract } from '../domain/person-resident-identity-contract.js';
import { HousingHomeCapacityIntegrationContract } from '../domain/housing-home-capacity-integration-contract.js';

function createBuilding(domains, definitionId = 'HOUSE') {
  const buildingId = domains.buildings.allocateId();
  return domains.buildings.create({
    identity: BuildingIdentityOwnershipContract.define({ buildingId, definitionId }),
    lifecycle: BuildingLifecycleStateContract.define({ buildingId }),
  }, { id: buildingId });
}

function createPerson(domains) {
  const personId = domains.units.allocateId();
  return domains.units.create({
    identity: PersonResidentIdentityContract.define({ personId }),
  }, { id: personId });
}

const domains = new CoreDomainStores();
const house = createBuilding(domains);
const secondHouse = createBuilding(domains, 'HOUSE_SMALL');
const personA = createPerson(domains);
const personB = createPerson(domains);
const personC = createPerson(domains);

const housing = HousingHomeCapacityIntegrationContract.defineHousing({
  buildingIdentity: house.identity,
  capacity: 2,
});
const repeatedHousing = HousingHomeCapacityIntegrationContract.defineHousing({
  buildingIdentity: house.identity,
  capacity: 2,
});

assert.deepEqual(housing, repeatedHousing, 'equal input must produce equal housing contract');
assert.equal(housing.kind, 'building-housing');
assert.equal(housing.buildingId, house.id);
assert.equal(housing.capacity, 2);
assert.equal(Object.isFrozen(housing), true, 'housing contract must be immutable');

const assignmentA = HousingHomeCapacityIntegrationContract.assignHome({
  personIdentity: personA.identity,
  housing,
  assignments: [],
});
assert.equal(assignmentA.personId, personA.id);
assert.equal(assignmentA.homeBuildingId, house.id);
assert.equal(assignmentA.state, 'ASSIGNED');
assert.equal(Object.isFrozen(assignmentA), true, 'home assignment must be immutable');

const assignmentB = HousingHomeCapacityIntegrationContract.assignHome({
  personIdentity: personB.identity,
  housing,
  assignments: [assignmentA],
});
const summary = HousingHomeCapacityIntegrationContract.summarizeHousing({
  housing,
  assignments: [assignmentA, assignmentB],
});
assert.deepEqual(
  { capacity: summary.capacity, occupancy: summary.occupancy, availableSlots: summary.availableSlots, withinCapacity: summary.withinCapacity },
  { capacity: 2, occupancy: 2, availableSlots: 0, withinCapacity: true },
);

assert.throws(() => HousingHomeCapacityIntegrationContract.assignHome({
  personIdentity: personC.identity,
  housing,
  assignments: [assignmentA, assignmentB],
}), /capacity exhausted/, 'full housing must reject another assignment');

const secondHousing = HousingHomeCapacityIntegrationContract.defineHousing({
  buildingIdentity: secondHouse.identity,
  capacity: 1,
});
assert.throws(() => HousingHomeCapacityIntegrationContract.assignHome({
  personIdentity: personA.identity,
  housing: secondHousing,
  assignments: [assignmentA],
}), /already has home/, 'one real person must not receive a second assigned home');

assert.throws(() => HousingHomeCapacityIntegrationContract.defineHousing({
  buildingIdentity: personA.identity,
  capacity: 1,
}), /building identity ownership contract required/);
assert.throws(() => HousingHomeCapacityIntegrationContract.defineHousing({
  buildingIdentity: house.identity,
  capacity: -1,
}), /invalid housing capacity/);
assert.throws(() => HousingHomeCapacityIntegrationContract.assignHome({
  personIdentity: house.identity,
  housing,
}), /existing person resident identity contract required/);

assert.equal(domains.units.size, 3, 'CR-30A must not create residents automatically');
assert.equal(domains.buildings.size, 2, 'CR-30A must not create buildings automatically');
assert.equal('home' in personA.identity, false, 'frozen CR-23A identity must remain untouched');
assert.equal('homeBuildingId' in personA.identity, false, 'home relation must remain outside frozen identity');
assert.equal('population' in housing, false, 'CR-30A must not add population truth');
assert.equal('gold' in housing, false, 'CR-30A must not add gold');
assert.equal('gold' in assignmentA, false, 'CR-30A home assignment must not add gold');

console.log('CR-30A PASS / 0 BLOCKER');
