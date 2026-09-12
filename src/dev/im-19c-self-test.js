import { BuildingConstructionProgressTransitionContract } from '../domain/building-construction-progress-transition-contract.js';
import { BuildingIdentityOwnershipContract } from '../domain/building-identity-ownership-contract.js';
import { BuildingLifecycleStateContract } from '../domain/building-lifecycle-state-contract.js';
import { ConstructionCompletionIntegration } from '../domain/construction-completion-integration.js';
import { HousingHomeCapacityIntegrationContract } from '../domain/housing-home-capacity-integration-contract.js';
import { OperationalBuildingAdmissionContract } from '../domain/operational-building-admission-contract.js';
import { PersonResidentIdentityContract } from '../domain/person-resident-identity-contract.js';
import { ResidentHomeAssignmentContract } from '../domain/resident-home-assignment-contract.js';
import { ResidentialBuildingAdmissionContract } from '../domain/residential-building-admission-contract.js';
import { ResidentialHousingCapacityOccupancyIntegration } from '../domain/residential-housing-capacity-occupancy-integration.js';
import { ResidentHousingAssignmentIntegration } from '../domain/resident-housing-assignment-integration.js';

function completionFor(buildingId) {
  const pending = BuildingConstructionProgressTransitionContract.define({ buildingId, progress: 0 });
  const inProgress = BuildingConstructionProgressTransitionContract.advance(pending, 0.5);
  const completed = BuildingConstructionProgressTransitionContract.advance(inProgress, 1);
  return ConstructionCompletionIntegration.complete({
    previousProgress: pending,
    transitions: [inProgress, completed],
    progress: completed
  });
}

function housingIntegrationFor(buildingId, capacity, assignments = []) {
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
  const residentialAdmission = ResidentialBuildingAdmissionContract.evaluate({
    operationalAdmission,
    buildingIdentity: identity,
    housingCapability
  });
  return ResidentialHousingCapacityOccupancyIntegration.integrate({
    residentialAdmission,
    assignments
  });
}

function person(personId) {
  return PersonResidentIdentityContract.define({ personId });
}

function assigned(personId, homeBuildingId) {
  return ResidentHomeAssignmentContract.define({
    personId,
    state: ResidentHomeAssignmentContract.states.ASSIGNED,
    homeBuildingId
  });
}

export function runIM19CSelfTest() {
  const building1 = 'building:00000001';
  const building2 = 'building:00000002';

  const person1 = person('unit:00000001');
  const person2 = person('unit:00000002');
  const person3 = person('unit:00000003');
  const existingForPerson3 = assigned(person3.personId, building1);

  const housing1 = housingIntegrationFor(building1, 2, [existingForPerson3]);
  const housing2 = housingIntegrationFor(building2, 1, [existingForPerson3]);

  const housingInput = [housing2, housing1];
  const personInput = [person2, person3, person1];
  const assignmentInput = [existingForPerson3];

  const result = ResidentHousingAssignmentIntegration.integrate({
    housingIntegrations: housingInput,
    personIdentities: personInput,
    assignments: assignmentInput
  });

  const noCapacity = ResidentHousingAssignmentIntegration.integrate({
    housingIntegrations: [
      housingIntegrationFor(building1, 1, [existingForPerson3])
    ],
    personIdentities: [person1, person2],
    assignments: [existingForPerson3]
  });

  let duplicateHousingRejected = false;
  try {
    ResidentHousingAssignmentIntegration.integrate({
      housingIntegrations: [housing1, housing1],
      personIdentities: [person1],
      assignments: []
    });
  } catch (error) {
    duplicateHousingRejected = error instanceof Error;
  }

  let duplicatePersonRejected = false;
  try {
    ResidentHousingAssignmentIntegration.integrate({
      housingIntegrations: [housing1],
      personIdentities: [person1, person1],
      assignments: []
    });
  } catch (error) {
    duplicatePersonRejected = error instanceof Error;
  }

  let duplicateActiveHomeRejected = false;
  try {
    ResidentHousingAssignmentIntegration.integrate({
      housingIntegrations: [housing1],
      personIdentities: [person1],
      assignments: [
        assigned(person1.personId, building1),
        assigned(person1.personId, building2)
      ]
    });
  } catch (error) {
    duplicateActiveHomeRejected = error instanceof Error;
  }

  let unassignedStateRejected = false;
  try {
    ResidentHousingAssignmentIntegration.integrate({
      housingIntegrations: [housing1],
      personIdentities: [person1],
      assignments: [
        ResidentHomeAssignmentContract.define({
          personId: person1.personId,
          state: ResidentHomeAssignmentContract.states.UNASSIGNED
        })
      ]
    });
  } catch (error) {
    unassignedStateRejected = error instanceof TypeError;
  }

  const checks = Object.freeze({
    frozenIM19BHousingAuthorityConsumed:
      housing1.kind === 'residential-housing-capacity-occupancy-integration'
      && housing2.kind === 'residential-housing-capacity-occupancy-integration',
    stablePersonIdentityConsumed:
      [person1, person2, person3].every((value) =>
        value.kind === 'person-resident-identity'
        && value.existenceState === 'EXISTS'
      ),
    deterministicStableIdAssignment:
      result.createdAssignments.length === 2
      && result.createdAssignments[0].personId === person1.personId
      && result.createdAssignments[0].homeBuildingId === building1
      && result.createdAssignments[1].personId === person2.personId
      && result.createdAssignments[1].homeBuildingId === building2,
    existingHomePreservedWithoutReassignment:
      result.assignments.some((value) =>
        value.personId === person3.personId
        && value.homeBuildingId === building1
      )
      && result.createdAssignments.every((value) => value.personId !== person3.personId),
    capacityRespectedAfterAssignment:
      result.housingStates.length === 2
      && result.housingStates.every((value) =>
        value.status === 'FULL'
        && value.availableSlots === 0
        && value.withinCapacity === true
      ),
    noCapacityCreatesNoAssignment:
      noCapacity.createdAssignments.length === 0
      && noCapacity.assignments.length === 1,
    duplicateHousingRejected,
    duplicatePersonRejected,
    duplicateActiveHomeRejected,
    unassignedStateRejected,
    inputArraysNotMutated:
      housingInput[0] === housing2
      && housingInput[1] === housing1
      && personInput[0] === person2
      && personInput[1] === person3
      && personInput[2] === person1
      && assignmentInput.length === 1
      && assignmentInput[0] === existingForPerson3,
    immutableResult:
      Object.isFrozen(result)
      && Object.isFrozen(result.assignments)
      && Object.isFrozen(result.createdAssignments)
      && Object.isFrozen(result.housingStates),
    noPopulationGoldOrWorkforceIntroduced:
      !('population' in result)
      && !('gold' in result)
      && !('workforce' in result)
      && result.createdAssignments.every((value) =>
        !('population' in value)
        && !('gold' in value)
        && !('workforce' in value)
      )
  });

  return Object.freeze({
    kind: 'im-19c-self-test-result',
    pass: Object.values(checks).every(Boolean),
    checks,
    evidence: Object.freeze({
      createdAssignmentCount: result.createdAssignments.length,
      firstAssignedPersonId: result.createdAssignments[0]?.personId ?? null,
      firstAssignedBuildingId: result.createdAssignments[0]?.homeBuildingId ?? null,
      secondAssignedPersonId: result.createdAssignments[1]?.personId ?? null,
      secondAssignedBuildingId: result.createdAssignments[1]?.homeBuildingId ?? null,
      finalHousingStates: Object.freeze(result.housingStates.map((value) => Object.freeze({
        buildingId: value.buildingId,
        status: value.status,
        occupancy: value.occupancy,
        capacity: value.capacity
      })))
    }),
    capabilities: Object.freeze({
      consumesFrozenIM19BHousingIntegration: true,
      consumesExistingStablePersonIdentity: true,
      usesExistingResidentHomeAssignmentAuthority: true,
      deterministicAssignmentByStableIds: true,
      createsResidentPersons: false,
      populationAuthority: false,
      goldAuthority: false,
      workforceMutationAuthority: false
    })
  });
}
