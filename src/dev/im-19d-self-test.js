import { BuildingConstructionProgressTransitionContract } from '../domain/building-construction-progress-transition-contract.js';
import { BuildingIdentityOwnershipContract } from '../domain/building-identity-ownership-contract.js';
import { BuildingLifecycleStateContract } from '../domain/building-lifecycle-state-contract.js';
import { ConstructionCompletionIntegration } from '../domain/construction-completion-integration.js';
import { HousingHomeCapacityIntegrationContract } from '../domain/housing-home-capacity-integration-contract.js';
import { OperationalBuildingAdmissionContract } from '../domain/operational-building-admission-contract.js';
import { PersonResidentIdentityContract } from '../domain/person-resident-identity-contract.js';
import { ResidentialBuildingAdmissionContract } from '../domain/residential-building-admission-contract.js';
import { ResidentialHousingCapacityOccupancyIntegration } from '../domain/residential-housing-capacity-occupancy-integration.js';
import { ResidentHousingAssignmentIntegration } from '../domain/resident-housing-assignment-integration.js';
import { AuthoritativePopulationProjection, projectAuthoritativePopulation } from '../ui/authoritative-population-projection.js';

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

function rejects(fn) {
  try { fn(); return false; } catch { return true; }
}

export function runIM19DSelfTest() {
  const persons = [
    person('unit:00000003'),
    person('unit:00000001'),
    person('unit:00000002'),
    person('unit:00000004')
  ];

  const assignmentIntegration = ResidentHousingAssignmentIntegration.integrate({
    housingIntegrations: [
      housingIntegrationFor('building:00000002', 1),
      housingIntegrationFor('building:00000001', 2)
    ],
    personIdentities: persons,
    assignments: []
  });

  const projection = projectAuthoritativePopulation({
    assignmentIntegration,
    personIdentities: persons
  });

  const emptyIntegration = ResidentHousingAssignmentIntegration.integrate({
    housingIntegrations: [],
    personIdentities: persons,
    assignments: []
  });
  const emptyProjection = projectAuthoritativePopulation({
    assignmentIntegration: emptyIntegration,
    personIdentities: persons
  });

  const mismatchedHousing = Object.freeze({
    ...assignmentIntegration,
    housingStates: Object.freeze(assignmentIntegration.housingStates.map((state, index) =>
      index === 0
        ? Object.freeze({ ...state, occupancy: 0, availableSlots: state.capacity })
        : state
    ))
  });

  const unknownResidentAssignment = Object.freeze({
    ...assignmentIntegration,
    assignments: Object.freeze([
      ...assignmentIntegration.assignments,
      Object.freeze({
        kind: 'resident-home-assignment',
        personId: 'unit:00000099',
        state: 'ASSIGNED',
        homeBuildingId: assignmentIntegration.housingStates[0].buildingId
      })
    ]),
    housingStates: Object.freeze(assignmentIntegration.housingStates.map((state, index) =>
      index === 0
        ? Object.freeze({
            ...state,
            occupancy: state.occupancy + 1,
            availableSlots: state.availableSlots - 1
          })
        : state
    ))
  });

  const checks = Object.freeze({
    frozenIM19CAssignmentTruthConsumed:
      assignmentIntegration.kind === 'resident-housing-assignment-integration'
      && assignmentIntegration.assignments.length === 3,
    countsOnlyAuthoritativelyHousedExistingResidents:
      projection.count === 3
      && projection.personIds.length === 3
      && !projection.personIds.includes('unit:00000004'),
    deterministicStablePersonOrdering:
      projection.personIds.join('|') === 'unit:00000001|unit:00000002|unit:00000003',
    residentHomeTraceIsProjectionOnly:
      projection.trace.length === 3
      && projection.trace.every((entry) =>
        entry.kind === 'population-count-trace'
        && entry.decision === 'COUNTED'
        && projection.personIds.includes(entry.personId)
      ),
    housingOccupancyMatchesProjectedPopulation:
      projection.occupiedHousingSlots === projection.count
      && projection.housingCount === 2,
    emptyAuthoritativeHousingProjectsZero:
      emptyProjection.count === 0
      && emptyProjection.personIds.length === 0
      && emptyProjection.trace.length === 0,
    inconsistentHousingOccupancyRejected:
      rejects(() => projectAuthoritativePopulation({
        assignmentIntegration: mismatchedHousing,
        personIdentities: persons
      })),
    assignmentForUnknownResidentRejected:
      rejects(() => projectAuthoritativePopulation({
        assignmentIntegration: unknownResidentAssignment,
        personIdentities: persons
      })),
    projectionIsImmutable:
      Object.isFrozen(projection)
      && Object.isFrozen(projection.personIds)
      && Object.isFrozen(projection.residents)
      && Object.isFrozen(projection.trace)
      && Object.isFrozen(projection.sources),
    zeroMutationAuthority:
      Object.values(AuthoritativePopulationProjection.capabilities).every((value) => value === false)
      && typeof AuthoritativePopulationProjection.assign === 'undefined'
      && typeof AuthoritativePopulationProjection.createPerson === 'undefined'
      && typeof AuthoritativePopulationProjection.setPopulation === 'undefined'
      && typeof AuthoritativePopulationProjection.settleGold === 'undefined'
  });

  return Object.freeze({
    kind: 'im-19d-self-test-result',
    pass: Object.values(checks).every(Boolean),
    checks,
    evidence: Object.freeze({
      count: projection.count,
      personIds: projection.personIds,
      occupiedHousingSlots: projection.occupiedHousingSlots,
      trace: projection.trace
    }),
    capabilities: Object.freeze({
      consumesFrozenIM19CAssignmentTruth: true,
      validatesExistingPersonIdentity: true,
      derivesPopulationReadOnly: true,
      traceFriendlyProjection: true,
      personCreationAuthority: false,
      homeAssignmentAuthority: false,
      workforceAuthority: false,
      goldAuthority: false,
      inspectorUiExpansion: false
    })
  });
}
