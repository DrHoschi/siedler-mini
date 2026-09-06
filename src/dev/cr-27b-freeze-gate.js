import { BuildingStockTransportReservationContract } from '../domain/building-stock-transport-reservation-contract.js';
import { PersonWorkforceProfileContract } from '../domain/person-workforce-profile-contract.js';
import { WorkforceAssignmentStateContract } from '../domain/workforce-assignment-state-contract.js';
import { WorkforceAwareTransportDispatchIntegration } from '../domain/workforce-aware-transport-dispatch-integration.js';
import { runCr27aFreezeGate } from './cr-27a-freeze-gate.js';
import { runCr27bSelfTest } from './cr-27b-self-test.js';

export function runCr27bFreezeGate() {
  const cr27a = runCr27aFreezeGate();
  const direct = runCr27bSelfTest();
  const results = [];
  const check = (name, fn) => {
    try { results.push(Object.freeze({ name, pass: !!fn() })); }
    catch (error) { results.push(Object.freeze({ name, pass: false, error: String(error?.message || error) })); }
  };
  const rejects = fn => { try { fn(); return false; } catch { return true; } };

  const reservation = (state = 'ACTIVE') => BuildingStockTransportReservationContract.define({
    id: 'transport-reservation:00000081',
    sourceBuildingId: 'building:00000081',
    targetBuildingId: 'building:00000082',
    resourceTypeId: 'resource-type:00000013',
    amount: 5,
    state
  });
  const candidate = (personId, capabilities = ['CAN_MOVE','CAN_SIMPLE_TRANSPORT'], availability = 'FREE', assignmentId = null) => ({
    profile: PersonWorkforceProfileContract.define({ personId, specialization: 'CARRIER', capabilities }),
    state: WorkforceAssignmentStateContract.define({ personId, availability, assignmentId })
  });
  const refs = () => ({
    jobId: 'transport-job:00000081',
    claimId: 'claim:00000081',
    demandId: 'demand:00000081',
    resourceId: 'resource:00000081',
    assignmentId: 'assignment:00000081'
  });
  const dispatch = overrides => WorkforceAwareTransportDispatchIntegration.dispatch({
    reservation: reservation(),
    candidates: [candidate('unit:00000081')],
    projectionRefs: refs(),
    eligibility: { preconditionsPassed: true, requiresReachability: false },
    ...overrides
  });

  check('cr27a-frozen-predecessor-regression', () => cr27a.pass && cr27a.blockerCount === 0);
  check('cr27b-direct-test-regression', () => direct.pass && direct.blockerCount === 0);

  check('cr27b-end-to-end-active-reservation-workforce-execution-entry', () => {
    const input = reservation();
    const before = JSON.stringify(input);
    const result = dispatch({
      reservation: input,
      candidates: [
        candidate('unit:00000093', ['CAN_SIMPLE_TRANSPORT']),
        candidate('unit:00000082', ['CAN_SIMPLE_TRANSPORT']),
        candidate('unit:00000091', ['CAN_SIMPLE_TRANSPORT'], 'UNAVAILABLE')
      ]
    });
    return result?.workforce.personId === 'unit:00000082'
      && result.workforce.assignedState.availability === 'ASSIGNED'
      && result.workforce.assignedState.assignmentId === 'assignment:00000081'
      && result.executionAssignment.unitId === 'unit:00000082'
      && result.execution.unitId === 'unit:00000082'
      && result.execution.state === 'TO_PICKUP'
      && result.job.status === 'PENDING'
      && result.job.sourceLocation.kind === 'owner'
      && result.job.sourceLocation.refId === input.sourceBuildingId
      && result.job.targetId === input.targetBuildingId
      && result.job.definitionId === input.resourceTypeId
      && result.job.amount === input.amount
      && JSON.stringify(input) === before
      && result.reservation.state === 'ACTIVE';
  });

  check('cr27b-released-reservation-cannot-dispatch', () => rejects(() => dispatch({ reservation: reservation('RELEASED') })));

  check('cr27b-workforce-authority-cannot-be-bypassed', () => {
    const noCapability = dispatch({ candidates: [candidate('unit:00000081', ['CAN_MOVE'])] });
    const assignedOnly = dispatch({ candidates: [candidate('unit:00000081', ['CAN_SIMPLE_TRANSPORT'], 'ASSIGNED', 'assignment:00000009')] });
    const blockedReachability = dispatch({ eligibility: { preconditionsPassed: true, requiresReachability: true, reachable: false } });
    return noCapability === null && assignedOnly === null && blockedReachability === null;
  });

  check('cr27b-scope-remains-dispatch-entry-only', () => {
    const forbiddenMethods = [
      'assignCarrier','createClaim','createDemand','createResource','settle','releaseReservation','releaseWorkforce',
      'pickup','deliver','findPath','move','prioritize','score'
    ];
    const result = dispatch();
    const forbiddenResultKeys = [
      'carrier','carrierState','claimStore','demandStore','resourceState','buildingStockMutation','delivery','settlement','releasedReservation'
    ];
    return forbiddenMethods.every(name => typeof WorkforceAwareTransportDispatchIntegration[name] === 'undefined')
      && forbiddenResultKeys.every(key => !(key in result));
  });

  const blockerCount = results.filter(result => !result.pass).length;
  return Object.freeze({
    pass: blockerCount === 0,
    blockerCount,
    results: Object.freeze(results),
    direct,
    cr27a
  });
}
