import { createBaselineMiniworldScenario } from '../diagnostics/baseline-miniworld-scenario.js';
import { EconomicConstructionRequirementContract } from '../domain/economic-construction-requirement-contract.js';
import { ResourceState } from '../resources/resource-state.js';
import { ResourceClaims } from '../resources/resource-claims.js';
import { ResourceDemands } from '../resources/resource-demands.js';

export function runIM17BSelfTest() {
  const composition = createBaselineMiniworldScenario();
  const { world, domains } = composition.authoritative;
  const buildingId = domains.buildings.ids()[0];

  const resourceState = new ResourceState({ world, resourceStore: domains.resources });
  const wood = resourceState.createDefinition({ technicalName: 'construction.wood', label: 'Construction Wood' });
  const resource = resourceState.createResource({ definitionId: wood.id, amount: 10 });
  const claims = new ResourceClaims({ resourceState });
  const demands = new ResourceDemands({ resourceState, claims });
  const requirements = new EconomicConstructionRequirementContract({ demands });

  const initial = requirements.create({
    buildingId,
    definitionId: wood.id,
    targetAmount: 6,
    metadata: { purpose: 'IM-17B vocabulary verification' },
  });

  const firstClaim = demands.reserve({ demandId: initial.demandId, resourceId: resource.id, amount: 2 });
  const reserved = requirements.get(initial.demandId);
  demands.consumeClaim(firstClaim.id);
  const partiallyFulfilled = requirements.get(initial.demandId);
  const secondClaim = demands.reserve({ demandId: initial.demandId, resourceId: resource.id, amount: 4 });
  const fullyReserved = requirements.get(initial.demandId);
  demands.consumeClaim(secondClaim.id);
  const fulfilled = requirements.get(initial.demandId);

  let overReserveRejected = false;
  try {
    demands.reserve({ demandId: initial.demandId, resourceId: resource.id, amount: 1 });
  } catch {
    overReserveRejected = true;
  }

  const invariant = value =>
    value.targetAmount === value.reservedAmount + value.fulfilledAmount + value.remainingAmount;

  const checks = Object.freeze({
    existingDemandAuthorityUsed:
      initial.sourceDemand.kind === 'demand'
      && initial.demandId === initial.sourceDemand.id
      && initial.buildingId === initial.sourceDemand.consumerId
      && initial.definitionId === initial.sourceDemand.definitionId,
    exactDemandVocabularyProjected:
      initial.targetAmount === 6
      && initial.reservedAmount === 0
      && initial.fulfilledAmount === 0
      && initial.remainingAmount === 6
      && initial.status === 'OPEN',
    activeClaimMeansReserved:
      reserved.reservedAmount === 2
      && reserved.fulfilledAmount === 0
      && reserved.remainingAmount === 4
      && reserved.status === 'PARTIAL',
    consumedClaimMeansFulfilled:
      partiallyFulfilled.reservedAmount === 0
      && partiallyFulfilled.fulfilledAmount === 2
      && partiallyFulfilled.remainingAmount === 4
      && partiallyFulfilled.status === 'PARTIAL',
    zeroRemainingWithActiveClaimMeansReserved:
      fullyReserved.reservedAmount === 4
      && fullyReserved.fulfilledAmount === 2
      && fullyReserved.remainingAmount === 0
      && fullyReserved.status === 'RESERVED',
    fulfilledDemandUsesConsumedClaims:
      fulfilled.reservedAmount === 0
      && fulfilled.fulfilledAmount === 6
      && fulfilled.remainingAmount === 0
      && fulfilled.status === 'FULFILLED',
    quantityInvariantPreserved:
      [initial, reserved, partiallyFulfilled, fullyReserved, fulfilled].every(invariant),
    remainingDemandCannotBeExceeded: overReserveRejected,
    immutableRequirementProjections:
      [initial, reserved, partiallyFulfilled, fullyReserved, fulfilled].every(Object.isFrozen),
    noIM17CSideEffects:
      !('constructionState' in fulfilled)
      && !('progress' in fulfilled)
      && !('placement' in fulfilled)
      && !('transport' in fulfilled)
      && !('delivery' in fulfilled),
  });

  return Object.freeze({
    kind: 'im-17b-self-test-result',
    pass: Object.values(checks).every(Boolean),
    checks,
    evidence: Object.freeze({
      buildingId,
      demandId: initial.demandId,
      definitionId: initial.definitionId,
      targetAmount: fulfilled.targetAmount,
      reservedAmount: fulfilled.reservedAmount,
      fulfilledAmount: fulfilled.fulfilledAmount,
      remainingAmount: fulfilled.remainingAmount,
      status: fulfilled.status,
    }),
    capabilities: Object.freeze({
      existingResourceDemandAuthorityReused: true,
      buildingIdAsDemandConsumer: true,
      exactDemandVocabularyReused: true,
      newResourceAuthority: false,
      newDemandAuthority: false,
      placementInitialization: false,
      transportIntegration: false,
      deliveryClaimConsumeIntegration: false,
      constructionProgressAuthority: false,
      completionAuthority: false,
    }),
  });
}
