import { parseStableId } from '../world/stable-id.js';
import { HousingCapacityOccupancy } from './housing-capacity-occupancy.js';
import { ResidentHomeAssignmentContract } from './resident-home-assignment-contract.js';

function deepFreeze(value) {
  if (value == null || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function requireBuildingIdentity(value) {
  if (value?.kind !== 'building-identity-ownership') {
    throw new TypeError('building identity ownership contract required');
  }
  const parsed = parseStableId(value.buildingId);
  if (!parsed || parsed.kind !== 'building') throw new TypeError(`invalid building id: ${value?.buildingId}`);
  if (value.ownerRef?.kind !== 'building' || value.ownerRef?.id !== parsed.id) {
    throw new TypeError('building owner reference mismatch');
  }
  return value;
}

function requirePersonIdentity(value) {
  if (value?.kind !== 'person-resident-identity' || value?.existenceState !== 'EXISTS') {
    throw new TypeError('existing person resident identity contract required');
  }
  const parsed = parseStableId(value.personId);
  if (!parsed || parsed.kind !== 'unit') throw new TypeError(`invalid person id: ${value?.personId}`);
  return value;
}

function requireHousing(value) {
  if (value?.kind !== 'building-housing') throw new TypeError('building housing contract required');
  const parsed = parseStableId(value.buildingId);
  if (!parsed || parsed.kind !== 'building') throw new TypeError(`invalid building id: ${value?.buildingId}`);
  const capacityContract = HousingCapacityOccupancy.defineCapacity({
    buildingId: parsed.id,
    capacity: value.capacity,
  });
  return deepFreeze({
    kind: 'building-housing',
    buildingId: capacityContract.buildingId,
    capacity: capacityContract.capacity,
  });
}

function requireAssignments(assignments) {
  if (!Array.isArray(assignments)) throw new TypeError('assignments must be an array');
  return assignments;
}

function assignedHomeForPerson(assignments, personId) {
  return assignments.find(assignment =>
    assignment?.kind === 'resident-home-assignment'
      && assignment?.state === ResidentHomeAssignmentContract.states.ASSIGNED
      && assignment?.personId === personId
  ) ?? null;
}

export class HousingHomeCapacityIntegrationContract {
  static defineHousing({ buildingIdentity, capacity } = {}) {
    const identity = requireBuildingIdentity(buildingIdentity);
    const capacityContract = HousingCapacityOccupancy.defineCapacity({
      buildingId: identity.buildingId,
      capacity,
    });

    return deepFreeze({
      kind: 'building-housing',
      buildingId: identity.buildingId,
      capacity: capacityContract.capacity,
    });
  }

  static assignHome({ personIdentity, housing, assignments = [] } = {}) {
    const person = requirePersonIdentity(personIdentity);
    const normalizedHousing = requireHousing(housing);
    const existingAssignments = requireAssignments(assignments);

    const existingHome = assignedHomeForPerson(existingAssignments, person.personId);
    if (existingHome) {
      throw new Error(`person already has home: ${person.personId} -> ${existingHome.homeBuildingId}`);
    }

    const capacityContract = HousingCapacityOccupancy.defineCapacity({
      buildingId: normalizedHousing.buildingId,
      capacity: normalizedHousing.capacity,
    });
    if (!HousingCapacityOccupancy.canAssign({ capacityContract, assignments: existingAssignments })) {
      throw new RangeError(`housing capacity exhausted for ${normalizedHousing.buildingId}`);
    }

    const assignment = ResidentHomeAssignmentContract.define({
      personId: person.personId,
      state: ResidentHomeAssignmentContract.states.ASSIGNED,
      homeBuildingId: normalizedHousing.buildingId,
    });

    HousingCapacityOccupancy.assertWithinCapacity({
      capacityContract,
      assignments: [...existingAssignments, assignment],
    });

    return assignment;
  }

  static summarizeHousing({ housing, assignments = [] } = {}) {
    const normalizedHousing = requireHousing(housing);
    return HousingCapacityOccupancy.summarize({
      capacityContract: HousingCapacityOccupancy.defineCapacity(normalizedHousing),
      assignments: requireAssignments(assignments),
    });
  }
}
