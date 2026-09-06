import { BuildingStockTransportReservationContract } from '../domain/building-stock-transport-reservation-contract.js';
import { PersonWorkforceProfileContract } from '../domain/person-workforce-profile-contract.js';
import { WorkforceAssignmentStateContract } from '../domain/workforce-assignment-state-contract.js';
import { WorkforceAwareTransportDispatchIntegration } from '../domain/workforce-aware-transport-dispatch-integration.js';

export function runCr27bSelfTest() {
  const results = [];
  const check = (name, fn) => {
    try { results.push(Object.freeze({ name, pass: !!fn() })); }
    catch (error) { results.push(Object.freeze({ name, pass: false, error: String(error?.message || error) })); }
  };
  const rejects = fn => { try { fn(); return false; } catch { return true; } };

  const reservation = (state = 'ACTIVE') => BuildingStockTransportReservationContract.define({
    id: 'transport-reservation:00000021',
    sourceBuildingId: 'building:00000011',
    targetBuildingId: 'building:00000012',
    resourceTypeId: 'resource-type:00000007',
    amount: 4,
    state
  });

  const profile = (personId, capabilities = ['CAN_MOVE','CAN_SIMPLE_TRANSPORT']) => PersonWorkforceProfileContract.define({
    personId,
    specialization: 'CARRIER',
    capabilities
  });
  const state = (personId, availability = 'FREE', assignmentId = null) => WorkforceAssignmentStateContract.define({
    personId,
    availability,
    assignmentId
  });
  const candidate = (personId, capabilities, availability = 'FREE', assignmentId = null) => ({
    profile: profile(personId, capabilities),
    state: state(personId, availability, assignmentId)
  });
  const refs = overrides => ({
    jobId: 'transport-job:00000031',
    claimId: 'claim:00000031',
    demandId: 'demand:00000031',
    resourceId: 'resource:00000031',
    assignmentId: 'assignment:00000031',
    ...overrides
  });
  const dispatch = overrides => WorkforceAwareTransportDispatchIntegration.dispatch({
    reservation: reservation(),
    candidates: [candidate('unit:00000021', ['CAN_MOVE','CAN_SIMPLE_TRANSPORT'])],
    projectionRefs: refs(),
    eligibility: { preconditionsPassed: true, requiresReachability: false },
    ...overrides
  });

  check('active-reservation-dispatches-through-frozen-cr26', () => {
    const result = dispatch();
    return result?.kind === 'workforce-aware-transport-dispatch'
      && result.workforce.personId === 'unit:00000021'
      && result.workforce.assignedState.availability === 'ASSIGNED'
      && result.workforce.assignedState.assignmentId === 'assignment:00000031'
      && result.execution.state === 'TO_PICKUP';
  });

  check('released-reservation-is-rejected', () => rejects(() => dispatch({ reservation: reservation('RELEASED') })));

  check('can-simple-transport-is-mandatory', () => {
    const result = dispatch({
      candidates: [candidate('unit:00000021', ['CAN_MOVE'])]
    });
    return result === null && WorkforceAwareTransportDispatchIntegration.requiredCapability === 'CAN_SIMPLE_TRANSPORT';
  });

  check('assigned-and-unavailable-candidates-are-excluded', () => {
    const result = dispatch({
      candidates: [
        candidate('unit:00000011', ['CAN_SIMPLE_TRANSPORT'], 'ASSIGNED', 'assignment:00000008'),
        candidate('unit:00000012', ['CAN_SIMPLE_TRANSPORT'], 'UNAVAILABLE'),
        candidate('unit:00000013', ['CAN_SIMPLE_TRANSPORT'], 'FREE')
      ]
    });
    return result?.workforce.personId === 'unit:00000013';
  });

  check('selection-remains-deterministic-under-candidate-order', () => {
    const candidates = [
      candidate('unit:00000030', ['CAN_SIMPLE_TRANSPORT']),
      candidate('unit:00000012', ['CAN_SIMPLE_TRANSPORT']),
      candidate('unit:00000021', ['CAN_SIMPLE_TRANSPORT'])
    ];
    const a = dispatch({ candidates });
    const b = dispatch({ candidates: [...candidates].reverse() });
    return a?.workforce.personId === 'unit:00000012'
      && b?.workforce.personId === 'unit:00000012';
  });

  check('no-eligible-person-returns-null-without-inventing-carrier', () => {
    const result = dispatch({ candidates: [candidate('unit:00000021', ['CAN_MOVE'])] });
    return result === null;
  });

  check('selected-person-is-the-execution-unit-identity', () => {
    const result = dispatch();
    return result.workforce.personId === result.executionAssignment.unitId
      && result.executionAssignment.unitId === result.execution.unitId
      && result.executionAssignment.jobId === result.job.id;
  });

  check('reservation-remains-byte-for-byte-active-and-unchanged', () => {
    const input = reservation();
    const before = JSON.stringify(input);
    const result = dispatch({ reservation: input });
    return JSON.stringify(input) === before
      && result.reservation.state === 'ACTIVE'
      && JSON.stringify(result.reservation) === before
      && Object.isFrozen(input);
  });

  check('profile-and-input-workforce-state-remain-unchanged', () => {
    const p = profile('unit:00000021');
    const s = state('unit:00000021');
    const beforeP = JSON.stringify(p);
    const beforeS = JSON.stringify(s);
    const result = dispatch({ candidates: [{ profile: p, state: s }] });
    return JSON.stringify(p) === beforeP
      && JSON.stringify(s) === beforeS
      && result.workforce.previousState.availability === 'FREE'
      && result.workforce.assignedState.availability === 'ASSIGNED';
  });

  check('transport-job-projection-copies-frozen-reservation-data-exactly', () => {
    const input = reservation();
    const result = dispatch({ reservation: input });
    return result.job.definitionId === input.resourceTypeId
      && result.job.sourceLocation.kind === 'owner'
      && result.job.sourceLocation.refId === input.sourceBuildingId
      && result.job.targetId === input.targetBuildingId
      && result.job.amount === input.amount
      && result.job.status === 'PENDING';
  });

  check('invalid-compatibility-identities-are-rejected', () => {
    return rejects(() => dispatch({ projectionRefs: refs({ jobId: 'job:00000031' }) }))
      && rejects(() => dispatch({ projectionRefs: refs({ claimId: 'resource:00000031' }) }))
      && rejects(() => dispatch({ projectionRefs: refs({ demandId: 'claim:00000031' }) }))
      && rejects(() => dispatch({ projectionRefs: refs({ resourceId: 'demand:00000031' }) }))
      && rejects(() => dispatch({ projectionRefs: refs({ assignmentId: 'transport-job:00000031' }) }));
  });

  check('explicit-reachability-gate-remains-an-input-not-a-calculation', () => {
    const candidates = [candidate('unit:00000021', ['CAN_SIMPLE_TRANSPORT'])];
    const allowed = dispatch({ candidates, eligibility: { preconditionsPassed: true, requiresReachability: true, reachable: true } });
    const blocked = dispatch({ candidates, eligibility: { preconditionsPassed: true, requiresReachability: true, reachable: false } });
    return allowed?.workforce.personId === 'unit:00000021' && blocked === null;
  });

  check('cr27b-does-not-expose-carrier-assignment-legacy-store-or-settlement-owners', () => {
    const result = dispatch();
    const forbiddenResultKeys = ['carrier','carrierState','available','occupied','claimStore','demandStore','resourceState','buildingStockMutation','delivery','settlement'];
    return forbiddenResultKeys.every(key => !(key in result))
      && typeof WorkforceAwareTransportDispatchIntegration.assignCarrier === 'undefined'
      && typeof WorkforceAwareTransportDispatchIntegration.createClaim === 'undefined'
      && typeof WorkforceAwareTransportDispatchIntegration.createDemand === 'undefined'
      && typeof WorkforceAwareTransportDispatchIntegration.createResource === 'undefined'
      && typeof WorkforceAwareTransportDispatchIntegration.settle === 'undefined'
      && typeof WorkforceAwareTransportDispatchIntegration.releaseReservation === 'undefined'
      && typeof WorkforceAwareTransportDispatchIntegration.releaseWorkforce === 'undefined';
  });

  const blockerCount = results.filter(result => !result.pass).length;
  return Object.freeze({ pass: blockerCount === 0, blockerCount, results: Object.freeze(results) });
}
