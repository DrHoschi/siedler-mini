import { BuildingConstructionProgressTransitionContract } from '../domain/building-construction-progress-transition-contract.js';
import { BuildingIdentityOwnershipContract } from '../domain/building-identity-ownership-contract.js';
import { BuildingLifecycleStateContract } from '../domain/building-lifecycle-state-contract.js';
import { ConstructionCompletionIntegration } from '../domain/construction-completion-integration.js';
import { GoldEconomyOwner } from '../domain/gold-economy-owner.js';
import { GoldEconomyAdmissionFlowIntegration } from '../domain/gold-economy-admission-flow-integration.js';
import { HousingHomeCapacityIntegrationContract } from '../domain/housing-home-capacity-integration-contract.js';
import { OperationalBuildingAdmissionContract } from '../domain/operational-building-admission-contract.js';
import { PersonResidentIdentityContract } from '../domain/person-resident-identity-contract.js';
import { ResidentialBuildingAdmissionContract } from '../domain/residential-building-admission-contract.js';
import { ResidentialHousingCapacityOccupancyIntegration } from '../domain/residential-housing-capacity-occupancy-integration.js';
import { ResidentHousingAssignmentIntegration } from '../domain/resident-housing-assignment-integration.js';
import { projectAuthoritativePopulation } from '../ui/authoritative-population-projection.js';

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

function housingIntegrationFor(buildingId, capacity) {
  const identity = BuildingIdentityOwnershipContract.define({ buildingId, definitionId: 'HOUSE_SMALL' });
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
    assignments: []
  });
}

function person(personId) {
  return PersonResidentIdentityContract.define({ personId });
}

function authoritativePopulation() {
  const persons = [person('unit:00000003'), person('unit:00000001'), person('unit:00000002')];
  const assignmentIntegration = ResidentHousingAssignmentIntegration.integrate({
    housingIntegrations: [
      housingIntegrationFor('building:00000002', 1),
      housingIntegrationFor('building:00000001', 2)
    ],
    personIdentities: persons,
    assignments: []
  });
  return projectAuthoritativePopulation({
    assignmentIntegration,
    personIdentities: persons
  });
}

function rejects(fn) {
  try { fn(); return false; } catch { return true; }
}

export function runIM19ESelfTest() {
  const populationProjection = authoritativePopulation();
  const owner = new GoldEconomyOwner({ initialGold: 5 });
  const stateBefore = owner.snapshot();

  const flow = GoldEconomyAdmissionFlowIntegration.admit({
    goldOwner: owner,
    populationProjection,
    goldPerResident: 2
  });

  const zeroFlow = GoldEconomyAdmissionFlowIntegration.admit({
    goldOwner: owner,
    populationProjection,
    goldPerResident: 0
  });

  const forgedPopulation = Object.freeze({
    ...populationProjection,
    occupiedHousingSlots: populationProjection.count - 1
  });

  const checks = Object.freeze({
    frozenIM19DPopulationConsumed:
      populationProjection.kind === 'authoritative-population-projection'
      && populationProjection.count === 3,
    existingGoldOwnerRemainsAuthority:
      owner.kind === 'gold-economy-owner'
      && stateBefore.kind === 'gold-economy-state'
      && stateBefore.physical === false,
    populationIncomeFlowAdmitted:
      flow.kind === 'gold-economy-admission-flow'
      && flow.status === 'ADMITTED'
      && flow.flowType === 'POPULATION_INCOME'
      && flow.populationCount === 3
      && flow.amount === 6
      && flow.goldPerResident === 2
      && flow.physical === false,
    existingGoldDerivationReused:
      flow.derivedIncome.kind === 'derived-gold-income'
      && flow.derivedIncome.amount === 6
      && flow.derivedIncome.populationCount === 3,
    admissionDoesNotMutateGoldBalance:
      owner.balance === 5
      && owner.snapshot().balance === 5
      && flow.stateBefore.balance === 5,
    zeroRateIsValidWithoutMutation:
      zeroFlow.amount === 0
      && owner.balance === 5,
    unsupportedFlowRejected:
      rejects(() => GoldEconomyAdmissionFlowIntegration.admit({
        goldOwner: owner,
        populationProjection,
        flowType: 'TRADE',
        goldPerResident: 1
      })),
    inconsistentPopulationRejected:
      rejects(() => GoldEconomyAdmissionFlowIntegration.admit({
        goldOwner: owner,
        populationProjection: forgedPopulation,
        goldPerResident: 1
      })),
    negativeRateRejected:
      rejects(() => GoldEconomyAdmissionFlowIntegration.admit({
        goldOwner: owner,
        populationProjection,
        goldPerResident: -1
      })),
    immutableAdmission:
      Object.isFrozen(flow)
      && Object.isFrozen(flow.residentPersonIds)
      && Object.isFrozen(flow.stateBefore)
      && Object.isFrozen(flow.derivedIncome),
    noIM19FSettlementAuthority:
      typeof GoldEconomyAdmissionFlowIntegration.applyIncome === 'undefined'
      && typeof GoldEconomyAdmissionFlowIntegration.settle === 'undefined'
      && !('stateAfter' in flow)
      && !('settlementId' in flow),
    goldRemainsNonPhysical:
      flow.physical === false
      && flow.stateBefore.physical === false
  });

  return Object.freeze({
    kind: 'im-19e-self-test-result',
    pass: Object.values(checks).every(Boolean),
    checks,
    evidence: Object.freeze({
      balanceBefore: stateBefore.balance,
      admittedAmount: flow.amount,
      balanceAfterAdmission: owner.balance,
      populationCount: flow.populationCount,
      flowType: flow.flowType
    }),
    capabilities: Object.freeze({
      consumesFrozenIM19DPopulationProjection: true,
      reusesExistingGoldEconomyOwner: true,
      admitsPopulationIncomeFlow: true,
      derivesIncomeWithoutMutation: true,
      goldSettlementAuthority: false,
      tradeAuthority: false,
      taxAuthority: false,
      wageAuthority: false,
      physicalResourceAuthority: false
    })
  });
}
