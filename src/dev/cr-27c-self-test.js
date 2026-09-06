import { BuildingStockContract } from '../domain/building-stock-contract.js';
import { BuildingStockTransportReservationContract } from '../domain/building-stock-transport-reservation-contract.js';
import { DeliveredTransportBuildingStockSettlement } from '../domain/delivered-transport-building-stock-settlement.js';
import { PersonWorkforceProfileContract } from '../domain/person-workforce-profile-contract.js';
import { WorkforceAssignmentStateContract } from '../domain/workforce-assignment-state-contract.js';
import { WorkforceAwareTransportDispatchIntegration } from '../domain/workforce-aware-transport-dispatch-integration.js';

export function runCr27cSelfTest() {
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
    resourceTypeId: 'resource-type:00000017',
    amount: 4,
    state
  });

  const profile = (personId = 'unit:00000081') => PersonWorkforceProfileContract.define({
    personId,
    specialization: 'CARRIER',
    capabilities: ['CAN_MOVE', 'CAN_SIMPLE_TRANSPORT']
  });

  const freeState = (personId = 'unit:00000081') => WorkforceAssignmentStateContract.define({ personId });

  const makeDispatch = () => WorkforceAwareTransportDispatchIntegration.dispatch({
    reservation: reservation(),
    candidates: [{ profile: profile(), state: freeState() }],
    projectionRefs: {
      jobId: 'transport-job:00000081',
      claimId: 'claim:00000081',
      demandId: 'demand:00000081',
      resourceId: 'resource:00000081',
      assignmentId: 'assignment:00000081'
    },
    eligibility: { preconditionsPassed: true, requiresReachability: false }
  });

  const deliveryFor = (dispatch, overrides = {}) => Object.freeze({
    kind: 'delivered-cargo',
    jobId: dispatch.job.id,
    unitId: dispatch.workforce.personId,
    resourceId: dispatch.job.resourceId,
    amount: dispatch.reservation.amount,
    targetId: dispatch.reservation.targetBuildingId,
    ...overrides
  });

  const sourceStock = (quantity = 10, overrides = {}) => BuildingStockContract.define({
    buildingId: 'building:00000081',
    resourceTypeId: 'resource-type:00000017',
    quantity,
    ...overrides
  });

  const targetStock = (quantity = 2, overrides = {}) => BuildingStockContract.define({
    buildingId: 'building:00000082',
    resourceTypeId: 'resource-type:00000017',
    quantity,
    ...overrides
  });

  const settle = (overrides = {}) => {
    const dispatch = overrides.dispatch || makeDispatch();
    return DeliveredTransportBuildingStockSettlement.settle({
      dispatch,
      delivery: deliveryFor(dispatch),
      reservation: dispatch.reservation,
      workforceState: dispatch.workforce.assignedState,
      sourceStock: sourceStock(),
      targetStock: targetStock(),
      ...overrides
    });
  };

  check('valid-delivered-transport-settles-source-to-target', () => {
    const result = settle();
    return result.kind === 'delivered-transport-building-stock-settlement'
      && result.sourceStock.quantity === 6
      && result.targetStock.quantity === 6
      && result.amount === 4
      && result.jobId === 'transport-job:00000081'
      && result.personId === 'unit:00000081';
  });

  check('wrong-delivery-job-id-is-rejected', () => {
    const dispatch = makeDispatch();
    return rejects(() => settle({ dispatch, delivery: deliveryFor(dispatch, { jobId: 'transport-job:00000082' }) }));
  });

  check('wrong-delivery-unit-id-is-rejected', () => {
    const dispatch = makeDispatch();
    return rejects(() => settle({ dispatch, delivery: deliveryFor(dispatch, { unitId: 'unit:00000082' }) }));
  });

  check('wrong-delivery-resource-id-is-rejected', () => {
    const dispatch = makeDispatch();
    return rejects(() => settle({ dispatch, delivery: deliveryFor(dispatch, { resourceId: 'resource:00000082' }) }));
  });

  check('wrong-delivery-target-is-rejected', () => {
    const dispatch = makeDispatch();
    return rejects(() => settle({ dispatch, delivery: deliveryFor(dispatch, { targetId: 'building:00000083' }) }));
  });

  check('wrong-delivery-amount-is-rejected', () => {
    const dispatch = makeDispatch();
    return rejects(() => settle({ dispatch, delivery: deliveryFor(dispatch, { amount: 3 }) }));
  });

  check('released-reservation-cannot-settle', () => {
    const dispatch = makeDispatch();
    const released = BuildingStockTransportReservationContract.release(dispatch.reservation);
    return rejects(() => settle({ dispatch, reservation: released }));
  });

  check('workforce-must-still-be-assigned', () => {
    const dispatch = makeDispatch();
    const free = WorkforceAssignmentStateContract.release(dispatch.workforce.assignedState);
    return rejects(() => settle({ dispatch, workforceState: free }));
  });

  check('workforce-assignment-id-must-match-dispatch', () => {
    const dispatch = makeDispatch();
    const wrong = WorkforceAssignmentStateContract.define({
      personId: dispatch.workforce.personId,
      availability: 'ASSIGNED',
      assignmentId: 'assignment:00000082'
    });
    return rejects(() => settle({ dispatch, workforceState: wrong }));
  });

  check('source-building-or-resource-mismatch-is-rejected', () => {
    return rejects(() => settle({ sourceStock: sourceStock(10, { buildingId: 'building:00000090' }) }))
      && rejects(() => settle({ sourceStock: sourceStock(10, { resourceTypeId: 'resource-type:00000018' }) }));
  });

  check('target-building-or-resource-mismatch-is-rejected', () => {
    return rejects(() => settle({ targetStock: targetStock(2, { buildingId: 'building:00000090' }) }))
      && rejects(() => settle({ targetStock: targetStock(2, { resourceTypeId: 'resource-type:00000018' }) }));
  });

  check('source-underflow-is-rejected-without-partial-result', () => {
    return rejects(() => settle({ sourceStock: sourceStock(3) }));
  });

  check('target-overflow-is-rejected-without-partial-result', () => {
    return rejects(() => settle({ targetStock: targetStock(Number.MAX_SAFE_INTEGER - 1) }));
  });

  check('success-releases-reservation-and-workforce', () => {
    const result = settle();
    return result.reservation.state === 'RELEASED'
      && result.workforceState.availability === 'FREE'
      && result.workforceState.assignmentId === null;
  });

  check('committed-successor-owner-states-cannot-settle-again', () => {
    const dispatch = makeDispatch();
    const first = DeliveredTransportBuildingStockSettlement.settle({
      dispatch,
      delivery: deliveryFor(dispatch),
      reservation: dispatch.reservation,
      workforceState: dispatch.workforce.assignedState,
      sourceStock: sourceStock(),
      targetStock: targetStock()
    });
    return rejects(() => DeliveredTransportBuildingStockSettlement.settle({
      dispatch,
      delivery: deliveryFor(dispatch),
      reservation: first.reservation,
      workforceState: first.workforceState,
      sourceStock: first.sourceStock,
      targetStock: first.targetStock
    }));
  });

  check('source-target-quantity-is-conserved', () => {
    const beforeSource = sourceStock(10);
    const beforeTarget = targetStock(2);
    const dispatch = makeDispatch();
    const result = DeliveredTransportBuildingStockSettlement.settle({
      dispatch,
      delivery: deliveryFor(dispatch),
      reservation: dispatch.reservation,
      workforceState: dispatch.workforce.assignedState,
      sourceStock: beforeSource,
      targetStock: beforeTarget
    });
    return beforeSource.quantity + beforeTarget.quantity === result.sourceStock.quantity + result.targetStock.quantity;
  });

  check('all-inputs-remain-byte-for-byte-unchanged', () => {
    const dispatch = makeDispatch();
    const delivery = deliveryFor(dispatch);
    const currentReservation = dispatch.reservation;
    const workforceState = dispatch.workforce.assignedState;
    const source = sourceStock();
    const target = targetStock();
    const before = [dispatch, delivery, currentReservation, workforceState, source, target].map(value => JSON.stringify(value));
    DeliveredTransportBuildingStockSettlement.settle({ dispatch, delivery, reservation: currentReservation, workforceState, sourceStock: source, targetStock: target });
    const after = [dispatch, delivery, currentReservation, workforceState, source, target].map(value => JSON.stringify(value));
    return before.every((value, index) => value === after[index]);
  });

  check('cr27c-does-not-leak-post-settlement-or-transport-runtime-ownership', () => {
    const result = settle();
    const forbidden = ['carrier','route','path','movement','traffic','claimStore','demandStore','resourceState','priority','score','saveGame'];
    return forbidden.every(key => !(key in result))
      && typeof DeliveredTransportBuildingStockSettlement.deliver === 'undefined'
      && typeof DeliveredTransportBuildingStockSettlement.pickup === 'undefined'
      && typeof DeliveredTransportBuildingStockSettlement.cancel === 'undefined'
      && typeof DeliveredTransportBuildingStockSettlement.recover === 'undefined'
      && typeof DeliveredTransportBuildingStockSettlement.dispatch === 'undefined'
      && typeof DeliveredTransportBuildingStockSettlement.findPath === 'undefined';
  });

  const blockerCount = results.filter(result => !result.pass).length;
  return Object.freeze({ pass: blockerCount === 0, blockerCount, results: Object.freeze(results) });
}
