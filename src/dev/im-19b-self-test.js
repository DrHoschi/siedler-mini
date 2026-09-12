import { BuildingConstructionProgressTransitionContract } from '../domain/building-construction-progress-transition-contract.js';
import { BuildingIdentityOwnershipContract } from '../domain/building-identity-ownership-contract.js';
import { BuildingLifecycleStateContract } from '../domain/building-lifecycle-state-contract.js';
import { ConstructionCompletionIntegration } from '../domain/construction-completion-integration.js';
import { HousingHomeCapacityIntegrationContract } from '../domain/housing-home-capacity-integration-contract.js';
import { OperationalBuildingAdmissionContract } from '../domain/operational-building-admission-contract.js';
import { ResidentHomeAssignmentContract } from '../domain/resident-home-assignment-contract.js';
import { ResidentialBuildingAdmissionContract } from '../domain/residential-building-admission-contract.js';
import { ResidentialHousingCapacityOccupancyIntegration } from '../domain/residential-housing-capacity-occupancy-integration.js';

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

function residentialAdmissionFor(buildingId, capacity) {
  const identity = BuildingIdentityOwnershipContract.define({
    buildingId,
    definitionId: 'HOUSE_SMALL'
  });
  const lifecycle = BuildingLifecycleStateContract.define({ buildingId, state: 'EXISTS' });
  const operationalAdmission = OperationalBuildingAdmissionContract.evaluate({
    constructionCompletion: completionFor(buildingId),
    lifecycle
  });
  const housingCapability = HousingHomeCapacityIntegrationContract.defineHousing({
    buildingIdentity: identity,
    capacity
  });

  return ResidentialBuildingAdmissionContract.evaluate({
    operationalAdmission,
    buildingIdentity: identity,
    housingCapability
  });
}

function assigned(personId, homeBuildingId) {
  return ResidentHomeAssignmentContract.define({
    personId,
    state: ResidentHomeAssignmentContract.states.ASSIGNED,
    homeBuildingId
  });
}

export function runIM19BSelfTest() {
  const buildingId = 'building:00000001';
  const otherBuildingId = 'building:00000002';
  const residentialAdmission = residentialAdmissionFor(buildingId, 2);

  const firstAssignment = assigned('unit:00000001', buildingId);
  const secondAssignment = assigned('unit:00000002', buildingId);
  const otherBuildingAssignment = assigned('unit:00000003', otherBuildingId);
  const unassigned = ResidentHomeAssignmentContract.define({
    personId: 'unit:00000004',
    state: ResidentHomeAssignmentContract.states.UNASSIGNED
  });

  const available = ResidentialHousingCapacityOccupancyIntegration.integrate({
    residentialAdmission,
    assignments: [firstAssignment, otherBuildingAssignment, unassigned]
  });

  const full = ResidentialHousingCapacityOccupancyIntegration.integrate({
    residentialAdmission,
    assignments: [firstAssignment, secondAssignment, otherBuildingAssignment]
  });

  let overCapacityRejected = false;
  try {
    ResidentialHousingCapacityOccupancyIntegration.integrate({
      residentialAdmission,
      assignments: [
        firstAssignment,
        secondAssignment,
        assigned('unit:00000005', buildingId)
      ]
    });
  } catch (error) {
    overCapacityRejected = error instanceof RangeError;
  }

  let nonResidentialRejected = false;
  try {
    const rejectedAdmission = residentialAdmissionFor(otherBuildingId, 0);
    ResidentialHousingCapacityOccupancyIntegration.integrate({
      residentialAdmission: rejectedAdmission,
      assignments: []
    });
  } catch (error) {
    nonResidentialRejected = error instanceof TypeError;
  }

  const originalAssignments = [firstAssignment, otherBuildingAssignment, unassigned];
  const originalLength = originalAssignments.length;
  ResidentialHousingCapacityOccupancyIntegration.integrate({
    residentialAdmission,
    assignments: originalAssignments
  });

  const checks = Object.freeze({
    frozenIM19AAdmissionRemainsAuthoritative:
      residentialAdmission.kind === 'residential-building-admission'
      && residentialAdmission.admitted === true
      && residentialAdmission.residential === true,
    existingHousingCapacityOwnerRemainsAuthoritative:
      available.capacityContract.kind === 'housing-capacity'
      && available.occupancySummary.kind === 'housing-occupancy-summary'
      && available.capacity === 2,
    existingOccupancyCountedForResidentialBuildingOnly:
      available.occupancy === 1
      && available.availableSlots === 1
      && available.status === 'AVAILABLE'
      && available.canAcceptResident === true,
    fullCapacityDerivedWithoutMutation:
      full.occupancy === 2
      && full.availableSlots === 0
      && full.status === 'FULL'
      && full.canAcceptResident === false
      && full.withinCapacity === true,
    assignmentsForOtherBuildingsAndUnassignedDoNotConsumeCapacity:
      available.occupancy === 1,
    overCapacityRejectedByExistingAuthority:
      overCapacityRejected === true,
    nonResidentialAdmissionRejected:
      nonResidentialRejected === true,
    inputAssignmentsNotMutated:
      originalAssignments.length === originalLength
      && originalAssignments[0] === firstAssignment
      && originalAssignments[1] === otherBuildingAssignment
      && originalAssignments[2] === unassigned,
    immutableIntegrationResults:
      Object.isFrozen(available)
      && Object.isFrozen(full)
      && Object.isFrozen(available.capacityContract)
      && Object.isFrozen(available.occupancySummary),
    noLaterIM19CapabilityIntroduced:
      [available, full].every(value =>
        !('personId' in value)
        && !('assignment' in value)
        && !('population' in value)
        && !('gold' in value)
        && !('income' in value)
        && !('settlement' in value)
      )
  });

  return Object.freeze({
    kind: 'im-19b-self-test-result',
    pass: Object.values(checks).every(Boolean),
    checks,
    evidence: Object.freeze({
      buildingId,
      availableStatus: available.status,
      availableOccupancy: available.occupancy,
      availableSlots: available.availableSlots,
      fullStatus: full.status,
      fullOccupancy: full.occupancy,
      overCapacityRejected,
      nonResidentialRejected
    }),
    capabilities: Object.freeze({
      consumesFrozenIM19AResidentialAdmission: true,
      consumesExistingHousingCapacityOccupancyAuthority: true,
      readsExistingHomeAssignmentsOnly: true,
      derivesCapacityOccupancyOnly: true,
      residentAssignmentAuthority: false,
      populationAuthority: false,
      goldAuthority: false
    })
  });
}
