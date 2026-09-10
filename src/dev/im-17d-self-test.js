import { createBaselineMiniworldScenario } from '../diagnostics/baseline-miniworld-scenario.js';
import { AuthoritativePlacementCommitBuildingRegistrationContract } from '../domain/authoritative-placement-commit-building-registration-contract.js';
import { PlayerConstructionRuntimeAdmissionContract } from '../domain/player-construction-runtime-admission-contract.js';
import { PlayerPlacementConstructionInitializationIntegration } from '../domain/player-placement-construction-initialization-integration.js';
import { EconomicConstructionRequirementContract } from '../domain/economic-construction-requirement-contract.js';
import { ConstructionDemandExistingLogisticsIntegration } from '../domain/construction-demand-existing-logistics-integration.js';
import { BuildingStockContract } from '../domain/building-stock-contract.js';
import { ResourceState } from '../resources/resource-state.js';
import { ResourceClaims } from '../resources/resource-claims.js';
import { ResourceDemands } from '../resources/resource-demands.js';
import { ResourceMatching } from '../resources/resource-matching.js';
import { ResourceAssignment } from '../resources/resource-assignment.js';
import { TransportJobService } from '../transport/transport-job-service.js';
import { RuntimeConfig } from '../runtime/config.js';
import { Runtime } from '../runtime/runtime.js';

function setup({ resourceAmount = 4, stockQuantity = 4 } = {}) {
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
  const requirement = requirements.create({ buildingId: initialized.buildingId, definitionId: definition.id, targetAmount: 3 });
  const matching = new ResourceMatching({ resourceState, claims, demands });
  const assignment = new ResourceAssignment({ resourceState, claims, demands });
  const transportJobs = new TransportJobService({ jobStore: domains.jobs, claims, demands, resourceState });
  const integration = new ConstructionDemandExistingLogisticsIntegration({ resourceState, claims, demands, matching, assignment, transportJobs });
  const sourceStock = BuildingStockContract.define({ buildingId: sourceBuildingId, resourceTypeId: definition.id, quantity: stockQuantity });

  return { composition, domains, initialized, resourceState, resource, claims, demands, requirement, integration, sourceStock, sourceBuildingId };
}

export function runIM17DSelfTest() {
  const main = setup();
  const result = main.integration.connect({
    requirement: main.requirement,
    sourceStocks: [main.sourceStock],
    reservationIds: ['transport-reservation:00000001']
  });
  const demandAfter = main.demands.get(main.requirement.demandId);
  const claim = main.claims.get(result.assignment.claimIds[0]);
  const job = result.transportJobs.jobs[0];
  const reservation = result.reservations[0];

  const blocked = setup({ stockQuantity: 2 });
  let stockBlockRejected = false;
  try {
    blocked.integration.connect({
      requirement: blocked.requirement,
      sourceStocks: [blocked.sourceStock],
      reservationIds: ['transport-reservation:00000001']
    });
  } catch {
    stockBlockRejected = true;
  }

  const unavailable = setup({ resourceAmount: 1, stockQuantity: 4 });
  const unavailableResult = unavailable.integration.connect({
    requirement: unavailable.requirement,
    sourceStocks: [unavailable.sourceStock],
    reservationIds: ['transport-reservation:00000001']
  });

  const checks = Object.freeze({
    frozenIM17BRequirementConsumed:
      result.demandId === main.requirement.demandId
      && result.buildingId === main.requirement.buildingId
      && result.definitionId === main.requirement.definitionId,
    existingResourceMatchingAndAssignmentUsed:
      result.match.matchedAmount === 3
      && result.assignment.assignedAmount === 3
      && result.assignment.claimIds.length === 1,
    authoritativeClaimReservationCreated:
      claim?.state === 'ACTIVE'
      && claim.demandId === main.requirement.demandId
      && claim.consumerId === main.requirement.buildingId
      && claim.amount === 3
      && main.resourceState.get(main.resource.id).state === 'RESERVED',
    buildingStockReservationMatchesSameFlow:
      reservation?.state === 'ACTIVE'
      && reservation.sourceBuildingId === main.sourceBuildingId
      && reservation.targetBuildingId === main.requirement.buildingId
      && reservation.resourceTypeId === main.requirement.definitionId
      && reservation.amount === 3,
    existingTransportJobCreated:
      result.transportJobs.createdCount === 1
      && main.domains.jobs.size === 1
      && job.claimId === claim.id
      && job.demandId === main.requirement.demandId
      && job.resourceId === main.resource.id
      && job.targetId === main.requirement.buildingId
      && job.amount === 3
      && job.status === 'PENDING',
    demandIsReservedNotFulfilled:
      demandAfter.status === 'RESERVED'
      && demandAfter.reservedAmount === 3
      && demandAfter.fulfilledAmount === 0
      && demandAfter.remainingAmount === 0,
    physicalStockPreflightBlocksOvercommitBeforeClaimsOrJobs:
      stockBlockRejected
      && blocked.claims.ids().length === 0
      && blocked.domains.jobs.size === 0
      && blocked.demands.get(blocked.requirement.demandId).reservedAmount === 0,
    partialResourceAvailabilityUsesOnlyAuthoritativeAvailableAmount:
      unavailableResult.status === 'DISPATCHED_TO_EXISTING_LOGISTICS'
      && unavailableResult.match.matchedAmount === 1
      && unavailableResult.assignment.assignedAmount === 1
      && unavailable.demands.get(unavailable.requirement.demandId).remainingAmount === 2,
    frozenIM17CConstructionStateUntouched:
      main.initialized.constructionState.state === 'PENDING'
      && !('progress' in main.initialized.constructionState),
    noIM17EOrLaterSideEffects:
      !('delivery' in result)
      && !('settlement' in result)
      && !('progress' in result)
      && !('completion' in result)
      && demandAfter.fulfilledAmount === 0
  });

  return Object.freeze({
    kind: 'im-17d-self-test-result',
    pass: Object.values(checks).every(Boolean),
    checks,
    evidence: Object.freeze({
      buildingId: result.buildingId,
      demandId: result.demandId,
      resourceId: claim.resourceId,
      claimId: claim.id,
      reservationId: reservation.id,
      transportJobId: job.id,
      reservedAmount: demandAfter.reservedAmount,
      fulfilledAmount: demandAfter.fulfilledAmount,
      remainingAmount: demandAfter.remainingAmount
    }),
    capabilities: Object.freeze({
      frozenIM17BRequirementAuthorityReused: true,
      existingResourceMatchingReused: true,
      existingResourceAssignmentClaimsReused: true,
      existingBuildingStockReservationReused: true,
      existingTransportJobServiceReused: true,
      secondLogisticsAuthorityCreated: false,
      newRoutingMovementOwnership: false,
      deliverySettlement: false,
      deliveryClaimConsumeIntegration: false,
      constructionProgressAuthority: false,
      completionAuthority: false
    })
  });
}
