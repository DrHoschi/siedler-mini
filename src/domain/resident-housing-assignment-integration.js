import { HousingHomeCapacityIntegrationContract } from './housing-home-capacity-integration-contract.js';
import { PersonResidentIdentityContract } from './person-resident-identity-contract.js';
import { ResidentHomeAssignmentContract } from './resident-home-assignment-contract.js';
import { ResidentialHousingCapacityOccupancyIntegration } from './residential-housing-capacity-occupancy-integration.js';

function normalizeHousingIntegrations(values) {
  if (!Array.isArray(values)) {
    throw new TypeError('residential housing integrations must be an array');
  }

  const normalized = values.map((value) => {
    if (!value || value.kind !== 'residential-housing-capacity-occupancy-integration') {
      throw new TypeError('frozen IM-19B residential housing capacity/occupancy integration required');
    }
    return Object.freeze({
      buildingId: value.buildingId,
      residentialAdmission: value.residentialAdmission
    });
  }).sort((a, b) => a.buildingId.localeCompare(b.buildingId));

  const ids = normalized.map((value) => value.buildingId);
  if (new Set(ids).size !== ids.length) {
    throw new Error('duplicate residential housing building id');
  }

  return Object.freeze(normalized);
}

function normalizePersonIdentities(values) {
  if (!Array.isArray(values)) {
    throw new TypeError('existing resident person identities must be an array');
  }

  const normalized = values
    .map((value) => PersonResidentIdentityContract.define(value))
    .sort((a, b) => a.personId.localeCompare(b.personId));

  const ids = normalized.map((value) => value.personId);
  if (new Set(ids).size !== ids.length) {
    throw new Error('duplicate resident person identity');
  }

  return Object.freeze(normalized);
}

function normalizeExistingAssignments(values) {
  if (!Array.isArray(values)) {
    throw new TypeError('existing resident home assignments must be an array');
  }

  const normalized = values.map((value) => {
    const assignment = ResidentHomeAssignmentContract.define(value);
    if (assignment.state !== ResidentHomeAssignmentContract.states.ASSIGNED) {
      throw new TypeError('IM-19C accepts active ASSIGNED resident home contracts only');
    }
    return assignment;
  });

  const personIds = normalized.map((value) => value.personId);
  if (new Set(personIds).size !== personIds.length) {
    throw new Error('duplicate active home assignment for resident');
  }

  return Object.freeze(normalized);
}

function stateForHousing(housing, assignments) {
  return ResidentialHousingCapacityOccupancyIntegration.integrate({
    residentialAdmission: housing.residentialAdmission,
    assignments
  });
}

function firstAvailableHousing(housings, assignments) {
  for (const housing of housings) {
    const state = stateForHousing(housing, assignments);
    if (state.canAcceptResident) return housing;
  }
  return null;
}

export class ResidentHousingAssignmentIntegration {
  static integrate({
    housingIntegrations = [],
    personIdentities = [],
    assignments = []
  } = {}) {
    const housings = normalizeHousingIntegrations(housingIntegrations);
    const persons = normalizePersonIdentities(personIdentities);
    const existingAssignments = normalizeExistingAssignments(assignments);
    const nextAssignments = existingAssignments.slice();
    const assignedPersonIds = new Set(existingAssignments.map((value) => value.personId));
    const createdAssignments = [];

    for (const person of persons) {
      if (assignedPersonIds.has(person.personId)) continue;

      const housing = firstAvailableHousing(housings, nextAssignments);
      if (!housing) break;

      const assignment = HousingHomeCapacityIntegrationContract.assignHome({
        personIdentity: person,
        housing: housing.residentialAdmission.housingCapability,
        assignments: nextAssignments
      });

      nextAssignments.push(assignment);
      createdAssignments.push(assignment);
      assignedPersonIds.add(person.personId);
    }

    const housingStates = Object.freeze(housings.map((housing) =>
      stateForHousing(housing, nextAssignments)
    ));

    return Object.freeze({
      kind: 'resident-housing-assignment-integration',
      assignments: Object.freeze(nextAssignments.slice()),
      createdAssignments: Object.freeze(createdAssignments.slice()),
      housingStates
    });
  }
}
