import { PersonResidentIdentityContract } from '../domain/person-resident-identity-contract.js';
import { ResidentHomeAssignmentContract } from '../domain/resident-home-assignment-contract.js';

function normalizePersons(values) {
  if (!Array.isArray(values)) throw new TypeError('existing resident person identities must be an array');
  const persons = values
    .map((value) => PersonResidentIdentityContract.define(value))
    .sort((a, b) => a.personId.localeCompare(b.personId));

  const ids = persons.map((value) => value.personId);
  if (new Set(ids).size !== ids.length) throw new Error('duplicate resident person identity');
  return Object.freeze(persons);
}

function requireAssignmentIntegration(value) {
  if (!value || value.kind !== 'resident-housing-assignment-integration') {
    throw new TypeError('frozen IM-19C resident housing assignment integration required');
  }
  if (!Array.isArray(value.assignments) || !Array.isArray(value.housingStates)) {
    throw new TypeError('complete frozen IM-19C assignment integration required');
  }
  return value;
}

function normalizeHousingStates(values) {
  const states = values.map((value) => {
    if (!value || value.kind !== 'residential-housing-capacity-occupancy-integration') {
      throw new TypeError('frozen IM-19B housing capacity/occupancy state required');
    }
    if (!Number.isSafeInteger(value.capacity) || value.capacity < 0
      || !Number.isSafeInteger(value.occupancy) || value.occupancy < 0
      || !Number.isSafeInteger(value.availableSlots) || value.availableSlots < 0
      || value.occupancy + value.availableSlots !== value.capacity
      || value.withinCapacity !== true) {
      throw new Error('invalid authoritative housing occupancy state');
    }
    return value;
  }).sort((a, b) => a.buildingId.localeCompare(b.buildingId));

  const ids = states.map((value) => value.buildingId);
  if (new Set(ids).size !== ids.length) throw new Error('duplicate authoritative housing state');
  return Object.freeze(states);
}

function normalizeAssignments(values) {
  const assignments = values.map((value) => {
    const assignment = ResidentHomeAssignmentContract.define(value);
    if (assignment.state !== ResidentHomeAssignmentContract.states.ASSIGNED) {
      throw new TypeError('authoritative population projection accepts ASSIGNED homes only');
    }
    return assignment;
  }).sort((a, b) => a.personId.localeCompare(b.personId));

  const personIds = assignments.map((value) => value.personId);
  if (new Set(personIds).size !== personIds.length) {
    throw new Error('duplicate active home assignment for resident');
  }
  return Object.freeze(assignments);
}

function validateHousingOccupancy({ housingStates, assignments }) {
  const housingById = new Map(housingStates.map((state) => [state.buildingId, state]));
  const countedByHousing = new Map(housingStates.map((state) => [state.buildingId, 0]));

  for (const assignment of assignments) {
    if (!housingById.has(assignment.homeBuildingId)) {
      throw new Error(`home assignment references non-authoritative housing: ${assignment.homeBuildingId}`);
    }
    countedByHousing.set(
      assignment.homeBuildingId,
      countedByHousing.get(assignment.homeBuildingId) + 1
    );
  }

  for (const state of housingStates) {
    if (countedByHousing.get(state.buildingId) !== state.occupancy) {
      throw new Error(`housing occupancy mismatch for ${state.buildingId}`);
    }
  }
}

export function projectAuthoritativePopulation({
  assignmentIntegration,
  personIdentities = []
} = {}) {
  const source = requireAssignmentIntegration(assignmentIntegration);
  const persons = normalizePersons(personIdentities);
  const housingStates = normalizeHousingStates(source.housingStates);
  const assignments = normalizeAssignments(source.assignments);
  const personById = new Map(persons.map((person) => [person.personId, person]));

  validateHousingOccupancy({ housingStates, assignments });

  const residents = assignments.map((assignment) => {
    const person = personById.get(assignment.personId);
    if (!person || person.existenceState !== PersonResidentIdentityContract.existenceStates.EXISTS) {
      throw new Error(`home assignment references non-existing resident: ${assignment.personId}`);
    }
    return Object.freeze({
      personId: assignment.personId,
      homeBuildingId: assignment.homeBuildingId
    });
  });

  const personIds = Object.freeze(residents.map((resident) => resident.personId));
  const trace = Object.freeze(residents.map((resident) => Object.freeze({
    kind: 'population-count-trace',
    personId: resident.personId,
    homeBuildingId: resident.homeBuildingId,
    decision: 'COUNTED'
  })));

  return Object.freeze({
    kind: 'authoritative-population-projection',
    count: residents.length,
    personIds,
    residents: Object.freeze(residents),
    housingCount: housingStates.length,
    occupiedHousingSlots: housingStates.reduce((sum, state) => sum + state.occupancy, 0),
    trace,
    sources: Object.freeze({
      assignmentIntegration: source,
      personIdentities: persons,
      housingStates,
      assignments
    })
  });
}

export function renderAuthoritativePopulationProjection(projection, {
  hudSurface = typeof document !== 'undefined' ? document.querySelector('#hud-population') : null,
  inspectorSurface = typeof document !== 'undefined' ? document.querySelector('#inspector-population') : null
} = {}) {
  if (!projection || projection.kind !== 'authoritative-population-projection') {
    throw new TypeError('authoritative population projection required');
  }

  if (hudSurface) hudSurface.textContent = `Bevölkerung: ${projection.count}`;
  if (inspectorSurface) inspectorSurface.textContent = String(projection.count);
  return projection;
}

export const AuthoritativePopulationProjection = Object.freeze({
  project: projectAuthoritativePopulation,
  render: renderAuthoritativePopulationProjection,
  capabilities: Object.freeze({
    personCreationAuthority: false,
    personMutationAuthority: false,
    housingAuthority: false,
    homeAssignmentAuthority: false,
    populationMutationAuthority: false,
    workforceAuthority: false,
    goldAuthority: false,
    inspectorUiAuthority: false
  })
});

if (typeof window !== 'undefined') {
  window.IM19DAuthoritativePopulationProjection = AuthoritativePopulationProjection;
}
