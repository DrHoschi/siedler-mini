import { BuildingIdentityOwnershipContract } from './building-identity-ownership-contract.js';
import { HousingHomeCapacityIntegrationContract } from './housing-home-capacity-integration-contract.js';
import { OperationalBuildingAdmissionContract } from './operational-building-admission-contract.js';

const STATUS = Object.freeze({
  ADMITTED: 'ADMITTED',
  REJECTED: 'REJECTED'
});

const REASONS = Object.freeze({
  RESIDENTIAL_BUILDING_ADMITTED: 'RESIDENTIAL_BUILDING_ADMITTED',
  BUILDING_NOT_OPERATIONAL: 'BUILDING_NOT_OPERATIONAL',
  NO_HOUSING_CAPABILITY: 'NO_HOUSING_CAPABILITY',
  BUILDING_ID_MISMATCH: 'BUILDING_ID_MISMATCH',
  NO_RESIDENTIAL_CAPACITY: 'NO_RESIDENTIAL_CAPACITY'
});

function requireOperationalAdmission(value) {
  if (!value || value.kind !== 'operational-building-admission') {
    throw new TypeError('frozen IM-18A operational building admission required');
  }
  return OperationalBuildingAdmissionContract.evaluate({
    constructionCompletion: value.constructionCompletion,
    lifecycle: value.lifecycle
  });
}

function requireBuildingIdentity(value) {
  if (!value || value.kind !== 'building-identity-ownership') {
    throw new TypeError('building identity ownership contract required');
  }
  return BuildingIdentityOwnershipContract.define(value);
}

function normalizeHousingCapability(value) {
  if (value == null) return null;
  if (value.kind !== 'building-housing') {
    throw new TypeError('existing building housing capability required');
  }
  const summary = HousingHomeCapacityIntegrationContract.summarizeHousing({
    housing: value,
    assignments: []
  });
  return Object.freeze({
    kind: 'building-housing',
    buildingId: summary.buildingId,
    capacity: summary.capacity
  });
}

function result({ admitted, reason, admission, identity, housing }) {
  return Object.freeze({
    kind: 'residential-building-admission',
    status: admitted ? STATUS.ADMITTED : STATUS.REJECTED,
    admitted,
    residential: admitted,
    reason,
    buildingId: admission?.buildingId ?? identity?.buildingId ?? housing?.buildingId ?? null,
    definitionId: identity?.definitionId ?? null,
    operationalAdmission: admission ?? null,
    buildingIdentity: identity ?? null,
    housingCapability: housing ?? null
  });
}

export class ResidentialBuildingAdmissionContract {
  static get status() {
    return STATUS;
  }

  static get reasons() {
    return REASONS;
  }

  static evaluate({ operationalAdmission, buildingIdentity, housingCapability = null } = {}) {
    const admission = requireOperationalAdmission(operationalAdmission);
    const identity = requireBuildingIdentity(buildingIdentity);
    const housing = normalizeHousingCapability(housingCapability);

    if (!admission.admitted || !admission.operational) {
      return result({
        admitted: false,
        reason: REASONS.BUILDING_NOT_OPERATIONAL,
        admission,
        identity,
        housing
      });
    }

    if (admission.buildingId !== identity.buildingId) {
      return result({
        admitted: false,
        reason: REASONS.BUILDING_ID_MISMATCH,
        admission,
        identity,
        housing
      });
    }

    if (!housing) {
      return result({
        admitted: false,
        reason: REASONS.NO_HOUSING_CAPABILITY,
        admission,
        identity,
        housing: null
      });
    }

    if (housing.buildingId !== admission.buildingId) {
      return result({
        admitted: false,
        reason: REASONS.BUILDING_ID_MISMATCH,
        admission,
        identity,
        housing
      });
    }

    if (housing.capacity < 1) {
      return result({
        admitted: false,
        reason: REASONS.NO_RESIDENTIAL_CAPACITY,
        admission,
        identity,
        housing
      });
    }

    return result({
      admitted: true,
      reason: REASONS.RESIDENTIAL_BUILDING_ADMITTED,
      admission,
      identity,
      housing
    });
  }
}
