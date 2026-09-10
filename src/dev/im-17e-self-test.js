import { createBaselineMiniworldScenario } from '../diagnostics/baseline-miniworld-scenario.js';
import { AuthoritativePlacementCommitBuildingRegistrationContract } from '../domain/authoritative-placement-commit-building-registration-contract.js';
import { PlayerConstructionRuntimeAdmissionContract } from '../domain/player-construction-runtime-admission-contract.js';
import { PlayerPlacementConstructionInitializationIntegration } from '../domain/player-placement-construction-initialization-integration.js';
import { EconomicConstructionRequirementContract } from '../domain/economic-construction-requirement-contract.js';
import { ConstructionDemandExistingLogisticsIntegration } from '../domain/construction-demand-existing-logistics-integration.js';
import { DeliveredMaterialConstructionProgressSettlement } from '../domain/delivered-material-construction-progress-settlement.js';
import { DeliveredTransportBuildingStockSettlement } from '../domain/delivered-transport-building-stock-settlement.js';
import { BuildingConstructionProgressTransitionContract } from '../domain/building-construction-progress-transition-contract.js';
import { BuildingStockContract } from '../domain/building-stock-contract.js';
import { PersonWorkforceProfileContract } from '../domain/person-workforce-profile-contract.js';
import { WorkforceAssignmentStateContract } from '../domain/workforce-assignment-state-contract.js';
import { WorkforceAwareTransportDispatchIntegration } from '../domain/workforce-aware-transport-dispatch-integration.js';
import { ResourceState } from '../resources/resource-state.js';
import { ResourceClaims } from '../resources/resource-claims.js';
import { ResourceDemands } from '../resources/resource-demands.js';
import { ResourceMatching } from '../resources/resource-matching.js';
import { ResourceAssignment } from '../resources/resource-assignment.js';
import { TransportJobService } from '../transport/transport-job-service.js';
import { RuntimeConfig } from '../runtime/config.js';
import { Runtime } from '../runtime/runtime.js';

function setup({ resourceAmount = 3, targetAmount = 3, stockQuantity = resourceAmount } = {}) {
  const composition = createBaselineMiniworldScenario();
  const { world, map, domains } = composition.authoritative;
  const committer = new AuthoritativePlacementCommitBuildingRegistrationContract({ map, domains });
  const committed = committer.commit({ definitionId: 'HQ', cellId: map.cellIdAt(0, 0) });

  const runtime = new Runtime(RuntimeConfig);
  runtime.boot();
  runtime.start();
  const admitted = PlayerConstructionRuntimeAdmissionContract.evaluate({ runtimeState: runtime.state, commitResult: committed });
  const initialized = PlayerPlacementConstructionInitializationIntegration.initialize(admitted);
  runtime.stop();

  const sourceBuildingId = domains.buildings.ids().find(id => id !== committed.buildingId);
  if (!world.has(sourceBuildingId)) world.put({ id: sourceBuildingId, kind: 'building-resource-owner-ref' });

  const resourceState = new ResourceState({ world, resourceStore: domains.resources });
  const definition = resourceState.createDefinition({ technicalName: 'construction.wood', label: 'Construction Wood' });
  const resource = resourceState.createResource({
    definitionId: definition.id,
    amount: resourceAmount,
    location: { kind: 'owner', refId: sourceBuildingId },
    ownerId: sourceBuildingId
  });
  const claims = new ResourceClaims({ resourceState });
  const demands = new ResourceDemands({ resourceState, claims });
  const requirements = new EconomicConstructionRequirementContract({ demands });
  const requirement = requirements.create({ buildingId: initialized.buildingId, definitionId: definition.id, targetAmount });
  const matching = new ResourceMatching({ resourceState, claims, demands });
  const assignment = new ResourceAssignment({ resourceState, claims, demands });
  const transportJobs = new TransportJobService({ jobStore: domains.jobs, claims, demands, resourceState });
  const logisticsIntegration = new ConstructionDemandExistingLogisticsIntegration({ resourceState, claims, demands, matching, assignment, transportJobs });
  const sourceStock = BuildingStockContract.define({ buildingId: sourceBuildingId, resourceTypeId: definition.id, quantity: stockQuantity });
  const logistics = logisticsIntegration.connect({
    requirement,
    sourceStocks: [sourceStock],
    reservationIds: ['transport-reservation:00000001']
  });
  const job = logistics.transportJobs.jobs[0];
  const reservation = logistics.reservations[0];

  const personId = 'unit:00000001';
  const dispatch = WorkforceAwareTransportDispatchIntegration.dispatch({
    reservation,
    candidates: [{
      profile: PersonWorkforceProfileContract.define({
        personId,
        specialization: 'CARRIER',
        capabilities: ['CAN_MOVE', 'CAN_SIMPLE_TRANSPORT']
      }),
      state: WorkforceAssignmentStateContract.define({ personId })
    }],
    projectionRefs: {
      jobId: job.id,
      claimId: job.claimId,
      demandId: job.demandId,
      resourceId: job.resourceId,
      assignmentId: 'assignment:00000001'
    },
    eligibility: { preconditionsPassed: true, requiresReachability: false }
  });

  const targetStock = BuildingStockContract.define({
    buildingId: requirement.buildingId,
    resourceTypeId: requirement.definitionId,
    quantity: 0
  });
  const delivery = Object.freeze({
    kind: 'delivered-cargo',
    jobId: dispatch.job.id,
    unitId: dispatch.workforce.personId,
    resourceId: dispatch.job.resourceId,
    amount: reservation.amount,
    targetId: reservation.targetBuildingId
  });
  const authoritativeSettlement = DeliveredTransportBuildingStockSettlement.settle({
    dispatch,
    delivery,
    reservation,
    workforceState: dispatch.workforce.assignedState,
    sourceStock,
    targetStock
  });
  const progressSettlement = new DeliveredMaterialConstructionProgressSettlement({ demands, claims });
  const currentProgress = BuildingConstructionProgressTransitionContract.define({ buildingId: requirement.buildingId, progress: 0 });

  return {
    initialized,
    resourceState,
    resource,
    claims,
    demands,
    requirement,
    logistics,
    sourceStock,
    authoritativeSettlement,
    progressSettlement,
    currentProgress
  };
}

export function runIM17ESelfTest() {
  const full = setup();
  const result = full.progressSettlement.settle({
    requirement: full.requirement,
    logistics: full.logistics,
    settlement: full.authoritativeSettlement,
    currentProgress: full.currentProgress
  });

  const partial = setup({ resourceAmount: 1, targetAmount: 3, stockQuantity: 1 });
  const partialResult = partial.progressSettlement.settle({
    requirement: partial.requirement,
    logistics: partial.logistics,
    settlement: partial.authoritativeSettlement,
    currentProgress: partial.currentProgress
  });

  const rejected = setup();
  const wrongSettlement = Object.freeze({ ...rejected.authoritativeSettlement, jobId: 'transport-job:00000999' });
  let wrongSettlementRejected = false;
  try {
    rejected.progressSettlement.settle({
      requirement: rejected.requirement,
      logistics: rejected.logistics,
      settlement: wrongSettlement,
      currentProgress: rejected.currentProgress
    });
  } catch {
    wrongSettlementRejected = true;
  }

  let duplicateRejected = false;
  try {
    full.progressSettlement.settle({
      requirement: full.requirement,
      logistics: full.logistics,
      settlement: full.authoritativeSettlement,
      currentProgress: result.progress
    });
  } catch {
    duplicateRejected = true;
  }

  const fullClaim = full.claims.get(result.claimId);
  const fullDemand = full.demands.get(full.requirement.demandId);
  const partialDemand = partial.demands.get(partial.requirement.demandId);
  const rejectedClaimId = rejected.logistics.transportJobs.jobs[0].claimId;
  const rejectedClaim = rejected.claims.get(rejectedClaimId);

  const checks = Object.freeze({
    frozenIM17DLogisticsAndAuthoritativeSettlementConsumed:
      result.sourceSettlement.kind === 'delivered-transport-building-stock-settlement'
      && result.sourceSettlement.jobId === full.logistics.transportJobs.jobs[0].id
      && result.sourceSettlement.reservation.state === 'RELEASED',
    deliveredClaimConsumedThroughExistingDemandAuthority:
      fullClaim?.state === 'CONSUMED'
      && fullDemand.status === 'FULFILLED'
      && fullDemand.reservedAmount === 0
      && fullDemand.fulfilledAmount === 3
      && fullDemand.remainingAmount === 0,
    fullDeliveredMaterialMapsDeterministicallyToExistingProgress:
      result.progress.kind === 'building-construction-progress-transition'
      && result.progress.buildingId === full.requirement.buildingId
      && result.progress.progress === 1
      && result.progress.state === 'COMPLETED',
    pendingToCompletedDoesNotSkipExistingInProgressSemantics:
      result.transitions.length === 2
      && result.transitions[0].state === 'IN_PROGRESS'
      && result.transitions[0].progress === 1 / 3
      && result.transitions[1].state === 'COMPLETED'
      && result.transitions[1].progress === 1,
    partialDeliveryProducesMonotonicProportionalProgress:
      partialResult.previousProgress.progress === 0
      && partialResult.progress.progress === 1 / 3
      && partialResult.progress.state === 'IN_PROGRESS'
      && partialDemand.fulfilledAmount === 1
      && partialDemand.remainingAmount === 2,
    invalidSettlementRejectedBeforeClaimMutation:
      wrongSettlementRejected
      && rejectedClaim?.state === 'ACTIVE'
      && rejected.demands.get(rejected.requirement.demandId).fulfilledAmount === 0,
    alreadyConsumedDeliveryCannotAdvanceTwice:
      duplicateRejected
      && full.demands.get(full.requirement.demandId).fulfilledAmount === 3
      && full.claims.get(result.claimId).state === 'CONSUMED',
    frozenIM17CBuildingIdentityPreserved:
      result.buildingId === full.initialized.buildingId
      && result.progress.buildingId === full.initialized.buildingId,
    noIM17FOrLaterSideEffects:
      !('completion' in result)
      && !('workforce' in result)
      && !('production' in result)
      && typeof DeliveredMaterialConstructionProgressSettlement.complete === 'undefined'
      && typeof DeliveredMaterialConstructionProgressSettlement.assignWorker === 'undefined'
      && typeof DeliveredMaterialConstructionProgressSettlement.produce === 'undefined'
  });

  return Object.freeze({
    kind: 'im-17e-self-test-result',
    pass: Object.values(checks).every(Boolean),
    checks,
    evidence: Object.freeze({
      buildingId: result.buildingId,
      demandId: result.demandId,
      claimId: result.claimId,
      settledAmount: result.settledAmount,
      fulfilledAmount: fullDemand.fulfilledAmount,
      remainingAmount: fullDemand.remainingAmount,
      progress: result.progress.progress,
      constructionState: result.progress.state,
      transitionCount: result.transitions.length
    }),
    capabilities: Object.freeze({
      frozenIM17DLogisticsReused: true,
      authoritativeDeliveredStockSettlementRequired: true,
      existingDemandClaimConsumeReused: true,
      existingConstructionProgressContractReused: true,
      deterministicFulfillmentToProgressMapping: true,
      completionBoundaryExecuted: false,
      workforceIntegration: false,
      productionIntegration: false
    })
  });
}
