import { BuildingConstructionProgressTransitionContract } from '../domain/building-construction-progress-transition-contract.js';
import { BuildingIdentityOwnershipContract } from '../domain/building-identity-ownership-contract.js';
import { BuildingLifecycleStateContract } from '../domain/building-lifecycle-state-contract.js';
import { ConstructionCompletionIntegration } from '../domain/construction-completion-integration.js';
import { GoldEconomyOwner } from '../domain/gold-economy-owner.js';
import { GoldEconomyAdmissionFlowIntegration } from '../domain/gold-economy-admission-flow-integration.js';
import { OperationalEconomyGoldSettlement } from '../domain/operational-economy-gold-settlement.js';
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

function populationProjection() {
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

export function runIM19FSelfTest() {
  const projection = populationProjection();
  const owner = new GoldEconomyOwner({ initialGold: 5 });
  const flow = GoldEconomyAdmissionFlowIntegration.admit({
    goldOwner: owner,
    populationProjection: projection,
    goldPerResident: 2
  });

  const first = OperationalEconomyGoldSettlement.settleOnce({
    goldOwner: owner,
    admittedFlow: flow,
    settlementId: 'gold-settlement:00000001'
  });

  const afterFirst = owner.snapshot();

  const checks = Object.freeze({
    frozenIM19EAdmissionConsumed:
      flow.kind === 'gold-economy-admission-flow'
      && flow.status === 'ADMITTED'
      && flow.flowType === 'POPULATION_INCOME'
      && flow.amount === 6,
    existingGoldOwnerMutatedOnce:
      afterFirst.balance === 11
      && first.settlement.stateBefore.balance === 5
      && first.settlement.stateAfter.balance === 11,
    settlementContractIsAuthoritative:
      first.settlement.kind === 'operational-economy-gold-settlement'
      && first.settlement.settlementId === 'gold-settlement:00000001'
      && first.settlement.amount === 6
      && first.settlement.flowType === 'POPULATION_INCOME',
    exactlyOnceSettlementIdTracked:
      first.settledIds.length === 1
      && first.settledIds[0] === 'gold-settlement:00000001',
    duplicateSettlementRejectedBeforeSecondMutation:
      rejects(() => OperationalEconomyGoldSettlement.settleOnce({
        goldOwner: owner,
        admittedFlow: flow,
        settlementId: 'gold-settlement:00000001',
        settledIds: first.settledIds
      }))
      && owner.balance === 11,
    staleAdmissionRejected:
      rejects(() => OperationalEconomyGoldSettlement.settle({
        goldOwner: owner,
        admittedFlow: flow,
        settlementId: 'gold-settlement:00000002'
      }))
      && owner.balance === 11,
    zeroAmountSettlementValid:
      (() => {
        const zeroOwner = new GoldEconomyOwner({ initialGold: 4 });
        const zeroFlow = GoldEconomyAdmissionFlowIntegration.admit({
          goldOwner: zeroOwner,
          populationProjection: projection,
          goldPerResident: 0
        });
        const zero = OperationalEconomyGoldSettlement.settleOnce({
          goldOwner: zeroOwner,
          admittedFlow: zeroFlow,
          settlementId: 'gold-settlement:00000003'
        });
        return zero.settlement.amount === 0
          && zero.settlement.stateBefore.balance === 4
          && zero.settlement.stateAfter.balance === 4
          && zeroOwner.balance === 4;
      })(),
    goldRemainsNonPhysical:
      first.settlement.stateBefore.physical === false
      && first.settlement.stateAfter.physical === false,
    immutableSettlement:
      Object.isFrozen(first)
      && Object.isFrozen(first.settlement)
      && Object.isFrozen(first.settledIds)
      && Object.isFrozen(first.settlement.stateAfter),
    noExpandedEconomyAuthority:
      !('tax' in first.settlement)
      && !('trade' in first.settlement)
      && !('wage' in first.settlement)
      && !('resource' in first.settlement)
      && !('buildingStock' in first.settlement)
  });

  return Object.freeze({
    kind: 'im-19f-self-test-result',
    pass: Object.values(checks).every(Boolean),
    checks,
    evidence: Object.freeze({
      settlementId: first.settlement.settlementId,
      balanceBefore: first.settlement.stateBefore.balance,
      amount: first.settlement.amount,
      balanceAfter: first.settlement.stateAfter.balance,
      settledIds: first.settledIds
    }),
    capabilities: Object.freeze({
      consumesFrozenIM19EAdmission: true,
      reusesExistingGoldEconomyOwnerMutation: true,
      exactlyOnceSettlement: true,
      taxAuthority: false,
      tradeAuthority: false,
      wageAuthority: false,
      physicalResourceAuthority: false,
      inspectorGraphUi: false
    })
  });
}
