import { PersonResidentIdentityContract } from './person-resident-identity-contract.js';
import { HousingHomeCapacityIntegrationContract } from './housing-home-capacity-integration-contract.js';
import { HousingCapacityOccupancy } from './housing-capacity-occupancy.js';
import { ResidentHomeAssignmentContract } from './resident-home-assignment-contract.js';

const GENERAL_RESIDENT = 'GENERAL_RESIDENT';
const HOUSING_FREE_SLOT = 'HOUSING_FREE_SLOT';

function requireDomains(domains) {
  if (!domains?.units || domains.units.kind !== 'unit' || domains.units.domain !== 'units') {
    throw new TypeError('unit domain store required');
  }
  if (!domains?.buildings || domains.buildings.kind !== 'building' || domains.buildings.domain !== 'buildings') {
    throw new TypeError('building domain store required');
  }
  return domains;
}

function requireHousings(housings) {
  if (!Array.isArray(housings)) throw new TypeError('housings must be an array');
  const normalized = housings.map(housing => {
    if (housing?.kind !== 'building-housing') throw new TypeError('building housing contract required');
    return Object.freeze({
      kind: 'building-housing',
      buildingId: housing.buildingId,
      capacity: housing.capacity,
    });
  }).sort((a, b) => a.buildingId.localeCompare(b.buildingId));

  const ids = normalized.map(housing => housing.buildingId);
  if (new Set(ids).size !== ids.length) throw new Error('duplicate housing building id');
  return Object.freeze(normalized);
}

function requireExistingAssignments(assignments) {
  if (!Array.isArray(assignments)) throw new TypeError('assignments must be an array');
  return assignments.slice();
}

function assignedPersonIds(assignments) {
  return new Set(assignments
    .filter(assignment => assignment?.kind === 'resident-home-assignment' && assignment?.state === ResidentHomeAssignmentContract.states.ASSIGNED)
    .map(assignment => assignment.personId));
}

function validateAssignmentTruth({ domains, housings, assignments }) {
  const housingById = new Map(housings.map(housing => [housing.buildingId, housing]));
  const persons = new Set();

  for (const assignment of assignments) {
    if (assignment?.kind !== 'resident-home-assignment' || assignment?.state !== ResidentHomeAssignmentContract.states.ASSIGNED) {
      throw new TypeError('CR-30B accepts assigned resident-home contracts only');
    }
    if (persons.has(assignment.personId)) throw new Error(`duplicate active home for person: ${assignment.personId}`);
    persons.add(assignment.personId);

    const person = domains.units.get(assignment.personId);
    if (!person?.identity || person.identity.kind !== 'person-resident-identity' || person.identity.existenceState !== 'EXISTS') {
      throw new Error(`home assignment references non-existing person: ${assignment.personId}`);
    }
    if (!housingById.has(assignment.homeBuildingId)) {
      throw new Error(`home assignment references non-housing building: ${assignment.homeBuildingId}`);
    }
  }

  for (const housing of housings) {
    if (!domains.buildings.has(housing.buildingId)) throw new Error(`housing references unknown building: ${housing.buildingId}`);
    HousingHomeCapacityIntegrationContract.summarizeHousing({ housing, assignments });
    const summary = HousingCapacityOccupancy.assertWithinCapacity({
      capacityContract: HousingCapacityOccupancy.defineCapacity(housing),
      assignments,
    });
    if (!summary.withinCapacity) throw new RangeError(`housing capacity exceeded: ${housing.buildingId}`);
  }
}

function firstHousingWithFreeSlot(housings, assignments) {
  return housings.find(housing => {
    const summary = HousingHomeCapacityIntegrationContract.summarizeHousing({ housing, assignments });
    return summary.availableSlots > 0;
  }) ?? null;
}

function derivePopulation(domains, housings, assignments) {
  const housingIds = new Set(housings.map(housing => housing.buildingId));
  const personIds = [];
  for (const assignment of assignments) {
    if (assignment?.state !== ResidentHomeAssignmentContract.states.ASSIGNED) continue;
    if (!housingIds.has(assignment.homeBuildingId)) continue;
    const person = domains.units.get(assignment.personId);
    if (!person?.identity || person.identity.existenceState !== 'EXISTS') continue;
    personIds.push(assignment.personId);
  }
  personIds.sort((a, b) => a.localeCompare(b));
  return Object.freeze({
    kind: 'derived-population',
    count: personIds.length,
    personIds: Object.freeze(personIds),
  });
}

function createGeneralResident(domains) {
  const personId = domains.units.allocateId();
  return domains.units.create({
    identity: PersonResidentIdentityContract.define({ personId }),
    residentClass: GENERAL_RESIDENT,
    residentOrigin: HOUSING_FREE_SLOT,
  }, { id: personId });
}

export class DeterministicHousingPopulationIntegration {
  static get residentClasses() {
    return Object.freeze({ GENERAL_RESIDENT });
  }

  static integrate({ domains, housings = [], assignments = [] } = {}) {
    const stores = requireDomains(domains);
    const orderedHousings = requireHousings(housings);
    const nextAssignments = requireExistingAssignments(assignments);
    validateAssignmentTruth({ domains: stores, housings: orderedHousings, assignments: nextAssignments });

    const assigned = assignedPersonIds(nextAssignments);
    const existingPersonIds = stores.units.ids().filter(personId => {
      const person = stores.units.get(personId);
      return person?.identity?.kind === 'person-resident-identity'
        && person.identity.existenceState === 'EXISTS'
        && !assigned.has(personId);
    });

    for (const personId of existingPersonIds) {
      const housing = firstHousingWithFreeSlot(orderedHousings, nextAssignments);
      if (!housing) break;
      const person = stores.units.get(personId);
      const assignment = HousingHomeCapacityIntegrationContract.assignHome({
        personIdentity: person.identity,
        housing,
        assignments: nextAssignments,
      });
      nextAssignments.push(assignment);
      assigned.add(personId);
    }

    const createdGeneralResidentIds = [];
    while (true) {
      const housing = firstHousingWithFreeSlot(orderedHousings, nextAssignments);
      if (!housing) break;
      const person = createGeneralResident(stores);
      const assignment = HousingHomeCapacityIntegrationContract.assignHome({
        personIdentity: person.identity,
        housing,
        assignments: nextAssignments,
      });
      nextAssignments.push(assignment);
      createdGeneralResidentIds.push(person.id);
    }

    validateAssignmentTruth({ domains: stores, housings: orderedHousings, assignments: nextAssignments });
    const population = derivePopulation(stores, orderedHousings, nextAssignments);

    return Object.freeze({
      kind: 'housing-population-integration-result',
      housings: orderedHousings,
      assignments: Object.freeze(nextAssignments.slice()),
      population,
      createdGeneralResidentIds: Object.freeze(createdGeneralResidentIds.slice()),
    });
  }
}
