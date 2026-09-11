import { BuildingConstructionProgressTransitionContract } from '../domain/building-construction-progress-transition-contract.js';
import { BuildingIdentityOwnershipContract } from '../domain/building-identity-ownership-contract.js';
import { BuildingLifecycleStateContract } from '../domain/building-lifecycle-state-contract.js';
import { ConstructionCompletionIntegration } from '../domain/construction-completion-integration.js';
import { HousingHomeCapacityIntegrationContract } from '../domain/housing-home-capacity-integration-contract.js';
import { OperationalBuildingAdmissionContract } from '../domain/operational-building-admission-contract.js';
import { ResidentialBuildingAdmissionContract } from '../domain/residential-building-admission-contract.js';

function completionFor(buildingId, complete = true) {
  const pending = BuildingConstructionProgressTransitionContract.define({ buildingId, progress: 0 });
  const inProgress = BuildingConstructionProgressTransitionContract.advance(pending, 0.5);
  if (!complete) {
    return ConstructionCompletionIntegration.complete({
      previousProgress: pending,
      transitions: [inProgress],
      progress: inProgress
    });
  }
  const completed = BuildingConstructionProgressTransitionContract.advance(inProgress, 1);
  return ConstructionCompletionIntegration.complete({
    previousProgress: pending,
    transitions: [inProgress, completed],
    progress: completed
  });
}

function operationalFor(buildingId, { complete = true, exists = true } = {}) {
  const lifecycleExists = BuildingLifecycleStateContract.define({ buildingId, state: 'EXISTS' });
  const lifecycle = exists
    ? lifecycleExists
    : BuildingLifecycleStateContract.transition(lifecycleExists, 'RETIRED');
  return OperationalBuildingAdmissionContract.evaluate({
    constructionCompletion: completionFor(buildingId, complete),
    lifecycle
  });
}

export function runIM19ASelfTest() {
  const buildingId = 'building:00000001';
  const otherBuildingId = 'building:00000002';
  const identity = BuildingIdentityOwnershipContract.define({ buildingId, definitionId: 'HOUSE_SMALL' });
  const otherIdentity = BuildingIdentityOwnershipContract.define({ buildingId: otherBuildingId, definitionId: 'HOUSE_OTHER' });
  const housing = HousingHomeCapacityIntegrationContract.defineHousing({ buildingIdentity: identity, capacity: 4 });
  const zeroCapacityHousing = HousingHomeCapacityIntegrationContract.defineHousing({ buildingIdentity: identity, capacity: 0 });
  const otherHousing = HousingHomeCapacityIntegrationContract.defineHousing({ buildingIdentity: otherIdentity, capacity: 2 });

  const operational = operationalFor(buildingId);
  const nonOperational = operationalFor(buildingId, { complete: false });

  const admitted = ResidentialBuildingAdmissionContract.evaluate({
    operationalAdmission: operational,
    buildingIdentity: identity,
    housingCapability: housing
  });
  const noHousing = ResidentialBuildingAdmissionContract.evaluate({
    operationalAdmission: operational,
    buildingIdentity: identity
  });
  const zeroCapacity = ResidentialBuildingAdmissionContract.evaluate({
    operationalAdmission: operational,
    buildingIdentity: identity,
    housingCapability: zeroCapacityHousing
  });
  const identityMismatch = ResidentialBuildingAdmissionContract.evaluate({
    operationalAdmission: operational,
    buildingIdentity: otherIdentity,
    housingCapability: housing
  });
  const housingMismatch = ResidentialBuildingAdmissionContract.evaluate({
    operationalAdmission: operational,
    buildingIdentity: identity,
    housingCapability: otherHousing
  });
  const notOperational = ResidentialBuildingAdmissionContract.evaluate({
    operationalAdmission: nonOperational,
    buildingIdentity: identity,
    housingCapability: housing
  });

  const checks = Object.freeze({
    frozenIM18AAdmissionRemainsAuthoritative:
      operational.kind === 'operational-building-admission'
      && operational.admitted === true
      && operational.operational === true,
    existingHousingOwnerRemainsAuthoritative:
      housing.kind === 'building-housing'
      && housing.buildingId === buildingId
      && housing.capacity === 4,
    residentialBuildingAdmitted:
      admitted.status === 'ADMITTED'
      && admitted.admitted === true
      && admitted.residential === true
      && admitted.reason === 'RESIDENTIAL_BUILDING_ADMITTED'
      && admitted.buildingId === buildingId
      && admitted.definitionId === 'HOUSE_SMALL'
      && admitted.housingCapability.capacity === 4,
    missingHousingRejected:
      noHousing.status === 'REJECTED'
      && noHousing.reason === 'NO_HOUSING_CAPABILITY',
    zeroCapacityRejected:
      zeroCapacity.status === 'REJECTED'
      && zeroCapacity.reason === 'NO_RESIDENTIAL_CAPACITY',
    buildingIdentityMismatchRejected:
      identityMismatch.status === 'REJECTED'
      && identityMismatch.reason === 'BUILDING_ID_MISMATCH',
    housingIdentityMismatchRejected:
      housingMismatch.status === 'REJECTED'
      && housingMismatch.reason === 'BUILDING_ID_MISMATCH',
    nonOperationalBuildingRejected:
      notOperational.status === 'REJECTED'
      && notOperational.reason === 'BUILDING_NOT_OPERATIONAL',
    immutableResults:
      [admitted, noHousing, zeroCapacity, identityMismatch, housingMismatch, notOperational].every(Object.isFrozen),
    noLaterIM19CapabilityIntroduced:
      [admitted, noHousing, zeroCapacity, identityMismatch, housingMismatch, notOperational].every(value =>
        !('assignments' in value)
        && !('occupancy' in value)
        && !('population' in value)
        && !('gold' in value)
        && !('income' in value)
        && !('settlement' in value)
      )
  });

  return Object.freeze({
    kind: 'im-19a-self-test-result',
    pass: Object.values(checks).every(Boolean),
    checks,
    evidence: Object.freeze({
      buildingId,
      admittedReason: admitted.reason,
      missingHousingReason: noHousing.reason,
      zeroCapacityReason: zeroCapacity.reason,
      identityMismatchReason: identityMismatch.reason,
      housingMismatchReason: housingMismatch.reason,
      nonOperationalReason: notOperational.reason
    }),
    capabilities: Object.freeze({
      consumesFrozenIM18AOperationalAdmission: true,
      consumesExistingBuildingIdentity: true,
      consumesExistingHousingCapability: true,
      residentialAdmissionOnly: true,
      housingOccupancyAuthority: false,
      residentAssignmentAuthority: false,
      populationAuthority: false,
      goldAuthority: false
    })
  });
}
