import assert from 'node:assert/strict';
import { CoreDomainStores } from '../domain/core-domain-stores.js';
import { BuildingIdentityOwnershipContract } from '../domain/building-identity-ownership-contract.js';
import { BuildingLifecycleStateContract } from '../domain/building-lifecycle-state-contract.js';
import { PersonResidentIdentityContract } from '../domain/person-resident-identity-contract.js';
import { HousingHomeCapacityIntegrationContract } from '../domain/housing-home-capacity-integration-contract.js';
import { DeterministicHousingPopulationIntegration } from '../domain/deterministic-housing-population-integration.js';

function createBuilding(domains, definitionId) {
  const buildingId = domains.buildings.allocateId();
  return domains.buildings.create({
    identity: BuildingIdentityOwnershipContract.define({ buildingId, definitionId }),
    lifecycle: BuildingLifecycleStateContract.define({ buildingId }),
  }, { id: buildingId });
}

function createPerson(domains, marker = null) {
  const personId = domains.units.allocateId();
  return domains.units.create({
    identity: PersonResidentIdentityContract.define({ personId }),
    ...(marker ? { marker } : {}),
  }, { id: personId });
}

function setup() {
  const domains = new CoreDomainStores();
  const houseA = createBuilding(domains, 'HOUSE_A');
  const houseB = createBuilding(domains, 'HOUSE_B');
  const personA = createPerson(domains, 'existing-a');
  const personB = createPerson(domains, 'existing-b');
  const personC = createPerson(domains, 'existing-c');
  const housingA = HousingHomeCapacityIntegrationContract.defineHousing({ buildingIdentity: houseA.identity, capacity: 2 });
  const housingB = HousingHomeCapacityIntegrationContract.defineHousing({ buildingIdentity: houseB.identity, capacity: 2 });
  return { domains, houseA, houseB, personA, personB, personC, housingA, housingB };
}

const first = setup();
const firstResult = DeterministicHousingPopulationIntegration.integrate({
  domains: first.domains,
  housings: [first.housingB, first.housingA],
  assignments: [],
});

assert.equal(firstResult.kind, 'housing-population-integration-result');
assert.deepEqual(firstResult.housings.map(h => h.buildingId), [first.houseA.id, first.houseB.id], 'housing order must be stable by building id');
assert.equal(firstResult.assignments.length, 4, 'all four housing slots must end with real residents');
assert.equal(firstResult.population.count, 4, 'population must be derived from valid real resident assignments');
assert.equal(firstResult.population.personIds.length, 4);
assert.equal(firstResult.createdGeneralResidentIds.length, 1, 'exactly one genuinely free slot may create one general resident');
assert.equal(first.domains.units.size, 4, 'generated resident must be a real unit record');

const assignmentByPerson = new Map(firstResult.assignments.map(a => [a.personId, a.homeBuildingId]));
assert.equal(assignmentByPerson.get(first.personA.id), first.houseA.id, 'lowest existing person id must deterministically fill lowest housing id first');
assert.equal(assignmentByPerson.get(first.personB.id), first.houseA.id);
assert.equal(assignmentByPerson.get(first.personC.id), first.houseB.id);

const generatedId = firstResult.createdGeneralResidentIds[0];
const generated = first.domains.units.get(generatedId);
assert.equal(generated.identity.kind, 'person-resident-identity');
assert.equal(generated.identity.existenceState, 'EXISTS');
assert.equal(generated.residentClass, 'GENERAL_RESIDENT');
assert.equal(generated.residentOrigin, 'HOUSING_FREE_SLOT');
assert.equal('specialization' in generated, false, 'CR-30B must not create a random specialist');
assert.equal('gold' in generated, false, 'CR-30B must not add Gold');

const rerun = DeterministicHousingPopulationIntegration.integrate({
  domains: first.domains,
  housings: [first.housingA, first.housingB],
  assignments: firstResult.assignments,
});
assert.equal(rerun.createdGeneralResidentIds.length, 0, 'full valid housing must not create more residents on rerun');
assert.equal(rerun.population.count, 4);
assert.equal(first.domains.units.size, 4, 'rerun must not duplicate population');

const second = setup();
const secondResult = DeterministicHousingPopulationIntegration.integrate({
  domains: second.domains,
  housings: [second.housingA, second.housingB],
  assignments: [],
});
assert.deepEqual(
  firstResult.assignments.map(a => ({ personId: a.personId, homeBuildingId: a.homeBuildingId })),
  secondResult.assignments.map(a => ({ personId: a.personId, homeBuildingId: a.homeBuildingId })),
  'same stable inputs must produce the same assignment topology',
);
assert.deepEqual(firstResult.population, secondResult.population, 'same stable inputs must produce same derived population');

const constrained = new CoreDomainStores();
const smallHouse = createBuilding(constrained, 'HOUSE_ONE');
const p1 = createPerson(constrained);
const p2 = createPerson(constrained);
const smallHousing = HousingHomeCapacityIntegrationContract.defineHousing({ buildingIdentity: smallHouse.identity, capacity: 1 });
const constrainedResult = DeterministicHousingPopulationIntegration.integrate({ domains: constrained, housings: [smallHousing] });
assert.equal(constrainedResult.population.count, 1, 'population must count housed valid residents only');
assert.equal(constrainedResult.createdGeneralResidentIds.length, 0, 'no free slot means no generated resident');
assert.equal(constrained.units.size, 2, 'unhoused existing people remain real people and are not deleted');
assert.equal(constrainedResult.population.personIds.includes(p1.id), true);
assert.equal(constrainedResult.population.personIds.includes(p2.id), false);

const preserved = setup();
const preAssignment = HousingHomeCapacityIntegrationContract.assignHome({
  personIdentity: preserved.personC.identity,
  housing: preserved.housingB,
  assignments: [],
});
const preservedResult = DeterministicHousingPopulationIntegration.integrate({
  domains: preserved.domains,
  housings: [preserved.housingB, preserved.housingA],
  assignments: [preAssignment],
});
assert.equal(preservedResult.assignments[0].personId, preserved.personC.id, 'valid existing home assignment must be preserved');
assert.equal(preservedResult.assignments[0].homeBuildingId, preserved.houseB.id);
assert.equal(preservedResult.population.count, 4);
assert.equal(preservedResult.createdGeneralResidentIds.length, 1);

assert.equal('population' in first.domains.snapshot(), false, 'CR-30B must not introduce a second population store');
assert.equal('gold' in firstResult, false, 'CR-30B result must not add Gold');
assert.equal('gold' in first.domains.snapshot(), false, 'CR-30B must not create Gold ownership');

console.log('CR-30B PASS / 0 BLOCKER');
