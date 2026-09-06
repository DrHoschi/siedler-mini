import { parseStableId } from '../world/stable-id.js';
import { BuildingStockTransportReservationContract } from './building-stock-transport-reservation-contract.js';
import { WorkforceJobEligibilityContract } from './workforce-job-eligibility-contract.js';
import { TransportJobContract } from '../transport/transport-job-contract.js';
import { TransportExecutionContract } from '../transport/transport-execution-contract.js';

const REQUIRED_CAPABILITY = 'CAN_SIMPLE_TRANSPORT';

function requireStableKind(value, kind, label) {
  const parsed = parseStableId(value);
  if (!parsed || parsed.kind !== kind) throw new TypeError(`invalid ${label}: ${value}`);
  return parsed.id;
}

function requireBoolean(value, label) {
  if (typeof value !== 'boolean') throw new TypeError(`${label} must be boolean`);
  return value;
}

function normalizeProjectionRefs(value = {}) {
  return Object.freeze({
    jobId: requireStableKind(value.jobId, 'transport-job', 'transport job id'),
    claimId: requireStableKind(value.claimId, 'claim', 'compatibility claim id'),
    demandId: requireStableKind(value.demandId, 'demand', 'compatibility demand id'),
    resourceId: requireStableKind(value.resourceId, 'resource', 'compatibility resource id'),
    assignmentId: requireStableKind(value.assignmentId, 'assignment', 'workforce assignment id')
  });
}

function normalizeEligibilityInput({ preconditionsPassed, requiresReachability = false, reachable = null } = {}) {
  const normalizedRequiresReachability = requireBoolean(requiresReachability, 'requiresReachability');
  if (!normalizedRequiresReachability && reachable !== undefined && reachable !== null) {
    throw new TypeError('reachable must be omitted when reachability is not required');
  }
  return Object.freeze({
    preconditionsPassed: requireBoolean(preconditionsPassed, 'preconditionsPassed'),
    requiresReachability: normalizedRequiresReachability,
    reachable: normalizedRequiresReachability ? requireBoolean(reachable, 'reachable') : null
  });
}

export class WorkforceAwareTransportDispatchIntegration {
  static get requiredCapability() {
    return REQUIRED_CAPABILITY;
  }

  static dispatch({ reservation, candidates, projectionRefs, eligibility } = {}) {
    const reserved = BuildingStockTransportReservationContract.define(reservation);
    if (!BuildingStockTransportReservationContract.isActive(reserved)) {
      throw new Error(`transport dispatch requires ACTIVE reservation: ${reserved.id}`);
    }

    const refs = normalizeProjectionRefs(projectionRefs);
    const gate = normalizeEligibilityInput(eligibility);
    const request = WorkforceJobEligibilityContract.defineRequest({
      assignmentId: refs.assignmentId,
      requiredCapability: REQUIRED_CAPABILITY,
      preconditionsPassed: gate.preconditionsPassed,
      requiresReachability: gate.requiresReachability,
      reachable: gate.requiresReachability ? gate.reachable : null
    });

    const workforce = WorkforceJobEligibilityContract.selectAndAssign(request, candidates);
    if (!workforce) return null;

    const job = TransportJobContract.define({
      id: refs.jobId,
      claimId: refs.claimId,
      demandId: refs.demandId,
      resourceId: refs.resourceId,
      definitionId: reserved.resourceTypeId,
      sourceLocation: Object.freeze({ kind: 'owner', refId: reserved.sourceBuildingId }),
      targetId: reserved.targetBuildingId,
      amount: reserved.amount,
      status: 'PENDING'
    });

    const executionAssignment = Object.freeze({
      jobId: job.id,
      unitId: workforce.personId
    });
    const execution = TransportExecutionContract.begin(job, executionAssignment);

    return Object.freeze({
      kind: 'workforce-aware-transport-dispatch',
      reservation: reserved,
      workforce,
      job,
      executionAssignment,
      execution,
      compatibilityRefs: refs
    });
  }
}
