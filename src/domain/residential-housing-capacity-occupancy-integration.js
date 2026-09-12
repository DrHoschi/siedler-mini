import { HousingCapacityOccupancy } from './housing-capacity-occupancy.js';
import { ResidentHomeAssignmentContract } from './resident-home-assignment-contract.js';
import { ResidentialBuildingAdmissionContract } from './residential-building-admission-contract.js';

const STATES = Object.freeze({
  AVAILABLE: 'AVAILABLE',
  FULL: 'FULL'
});

function requireResidentialAdmission(value) {
  if (!value || value.kind !== 'residential-building-admission') {
    throw new TypeError('frozen IM-19A residential building admission required');
  }

  const admission = ResidentialBuildingAdmissionContract.evaluate({
    operationalAdmission: value.operationalAdmission,
    buildingIdentity: value.buildingIdentity,
    housingCapability: value.housingCapability
  });

  if (!admission.admitted || !admission.residential) {
    throw new TypeError('IM-19B requires an admitted residential building');
  }

  return admission;
}

function normalizeAssignments(values) {
  if (!Array.isArray(values)) {
    throw new TypeError('existing resident home assignments must be an array');
  }

  return Object.freeze(values.map((value) => {
    if (!value || value.kind !== 'resident-home-assignment') {
      throw new TypeError('existing resident home assignment contract required');
    }
    return ResidentHomeAssignmentContract.define(value);
  }));
}

export class ResidentialHousingCapacityOccupancyIntegration {
  static get states() {
    return STATES;
  }

  static integrate({ residentialAdmission, assignments = [] } = {}) {
    const admission = requireResidentialAdmission(residentialAdmission);
    const existingAssignments = normalizeAssignments(assignments);

    const capacityContract = HousingCapacityOccupancy.defineCapacity({
      buildingId: admission.buildingId,
      capacity: admission.housingCapability.capacity
    });

    const summary = HousingCapacityOccupancy.assertWithinCapacity({
      capacityContract,
      assignments: existingAssignments
    });

    const status = summary.availableSlots > 0 ? STATES.AVAILABLE : STATES.FULL;

    return Object.freeze({
      kind: 'residential-housing-capacity-occupancy-integration',
      buildingId: admission.buildingId,
      status,
      capacity: summary.capacity,
      occupancy: summary.occupancy,
      availableSlots: summary.availableSlots,
      withinCapacity: summary.withinCapacity,
      canAcceptResident: summary.availableSlots > 0,
      residentialAdmission: admission,
      capacityContract,
      occupancySummary: summary
    });
  }
}
