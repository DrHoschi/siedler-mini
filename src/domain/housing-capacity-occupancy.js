import { parseStableId } from '../world/stable-id.js';

function requireBuildingId(value) {
  const parsed = parseStableId(value);
  if (!parsed || parsed.kind !== 'building') throw new TypeError(`invalid building id: ${value}`);
  return parsed.id;
}

function requireCapacity(value) {
  if (!Number.isInteger(value) || value < 0) throw new TypeError(`invalid housing capacity: ${value}`);
  return value;
}

function requireAssignments(assignments) {
  if (!Array.isArray(assignments)) throw new TypeError('assignments must be an array');
  return assignments;
}

function isAssignedToBuilding(assignment, buildingId) {
  return assignment?.kind === 'resident-home-assignment'
    && assignment?.state === 'ASSIGNED'
    && assignment?.homeBuildingId === buildingId;
}

export class HousingCapacityOccupancy {
  static defineCapacity({ buildingId, capacity } = {}) {
    return Object.freeze({
      kind: 'housing-capacity',
      buildingId: requireBuildingId(buildingId),
      capacity: requireCapacity(capacity)
    });
  }

  static summarize({ capacityContract, assignments = [] } = {}) {
    if (capacityContract?.kind !== 'housing-capacity') throw new TypeError('valid housing capacity contract required');
    const buildingId = requireBuildingId(capacityContract.buildingId);
    const capacity = requireCapacity(capacityContract.capacity);
    const occupancy = requireAssignments(assignments).filter(assignment => isAssignedToBuilding(assignment, buildingId)).length;
    const availableSlots = capacity - occupancy;

    return Object.freeze({
      kind: 'housing-occupancy-summary',
      buildingId,
      capacity,
      occupancy,
      availableSlots,
      withinCapacity: occupancy <= capacity
    });
  }

  static canAssign({ capacityContract, assignments = [] } = {}) {
    const summary = HousingCapacityOccupancy.summarize({ capacityContract, assignments });
    return summary.occupancy < summary.capacity;
  }

  static assertWithinCapacity({ capacityContract, assignments = [] } = {}) {
    const summary = HousingCapacityOccupancy.summarize({ capacityContract, assignments });
    if (!summary.withinCapacity) {
      throw new RangeError(`housing capacity exceeded for ${summary.buildingId}: ${summary.occupancy}/${summary.capacity}`);
    }
    return summary;
  }
}
