import assert from 'node:assert/strict';
import { CoreDomainStores } from '../domain/core-domain-stores.js';
import { BuildingIdentityOwnershipContract } from '../domain/building-identity-ownership-contract.js';
import { BuildingLifecycleStateContract } from '../domain/building-lifecycle-state-contract.js';
import { PersonResidentIdentityContract } from '../domain/person-resident-identity-contract.js';
import { HousingHomeCapacityIntegrationContract } from '../domain/housing-home-capacity-integration-contract.js';
import { DeterministicHousingPopulationIntegration } from '../domain/deterministic-housing-population-integration.js';
import { GoldEconomyOwner } from '../domain/gold-economy-owner.js';

function createBuilding(domains, definitionId = 'HOUSE') {
  const buildingId = domains.buildings.allocateId();
  return domains.buildings.create({
    identity: BuildingIdentityOwnershipContract.define({ buildingId, definitionId }),
    lifecycle: BuildingLifecycleStateContract.define({ buildingId }),
  }, { id: buildingId });
}

function createPerson(domains) {
  const personId = domains.units.allocateId();
  return domains.units.create({ identity: PersonResidentIdentityContract.define({ personId }) }, { id: personId });
}

const domains = new CoreDomainStores();
const house = createBuilding(domains);
createPerson(domains);
createPerson(domains);
createPerson(domains);

const housing = HousingHomeCapacityIntegrationContract.defineHousing({
  buildingIdentity: house.identity,
  capacity: 3,
});
const integration = DeterministicHousingPopulationIntegration.integrate({
  domains,
  housings: [housing],
  assignments: [],
});

assert.equal(integration.population.kind, 'derived-population');
assert.equal(integration.population.count, 3);

const resourcesBefore = domains.resources.snapshot();
const jobsBefore = domains.jobs.snapshot();
const owner = new GoldEconomyOwner({ initialGold: 5 });
assert.equal(owner.kind, 'gold-economy-owner');
assert.deepEqual(owner.snapshot(), {
  kind: 'gold-economy-state',
  balance: 5,
  physical: false,
});

const income = owner.deriveIncome({ population: integration.population, goldPerResident: 2 });
assert.deepEqual(income, {
  kind: 'derived-gold-income',
  populationCount: 3,
  residentPersonIds: integration.population.personIds,
  goldPerResident: 2,
  amount: 6,
});
assert.equal(Object.isFrozen(income), true);
assert.equal(owner.balance, 5, 'derivation alone must not mutate balance');

const settlement = owner.settle({ population: integration.population, goldPerResident: 2 });
assert.equal(settlement.income.amount, 6);
assert.equal(settlement.state.balance, 11);
assert.equal(settlement.state.physical, false);
assert.equal(owner.balance, 11);

assert.deepEqual(domains.resources.snapshot(), resourcesBefore, 'Gold must not enter physical Resource store');
assert.deepEqual(domains.jobs.snapshot(), jobsBefore, 'Gold must not create Logistics/Transport jobs');
assert.equal('gold' in integration.population, false, 'Population contract must remain free of Gold state');
assert.equal('balance' in integration.population, false, 'Population must not become an economy owner');

assert.throws(() => owner.deriveIncome({ population: { kind: 'population', count: 3 }, goldPerResident: 1 }), /derived population contract required/);
assert.throws(() => owner.deriveIncome({ population: integration.population, goldPerResident: -1 }), /goldPerResident/);

const emptyIncome = owner.deriveIncome({
  population: Object.freeze({ kind: 'derived-population', count: 0, personIds: Object.freeze([]) }),
  goldPerResident: 100,
});
assert.equal(emptyIncome.amount, 0);

console.log('CR-30C PASS / 0 BLOCKER');
