import { BuildingStockContract } from '../domain/building-stock-contract.js';
import { BuildingStockTransportReservationContract } from '../domain/building-stock-transport-reservation-contract.js';
import { DeliveredTransportBuildingStockSettlement } from '../domain/delivered-transport-building-stock-settlement.js';
import { PersonWorkforceProfileContract } from '../domain/person-workforce-profile-contract.js';
import { WorkforceAssignmentStateContract } from '../domain/workforce-assignment-state-contract.js';
import { WorkforceAwareTransportDispatchIntegration } from '../domain/workforce-aware-transport-dispatch-integration.js';
import { runCr27bFreezeGate } from './cr-27b-freeze-gate.js';
import { runCr27cSelfTest } from './cr-27c-self-test.js';

export function runCr27cFreezeGate() {
  const cr27b = runCr27bFreezeGate();
  const direct = runCr27cSelfTest();
  const results = [];
  const check = (name, fn) => {
    try { results.push(Object.freeze({ name, pass: !!fn() })); }
    catch (error) { results.push(Object.freeze({ name, pass: false, error: String(error?.message || error) })); }
  };
  const rejects = fn => { try { fn(); return false; } catch { return true; } };

  const reservation = (state = 'ACTIVE') => BuildingStockTransportReservationContract.define({
    id: 'transport-reservation:00000101',
    sourceBuildingId: 'building:00000101',
    targetBuildingId: 'building:00000102',
    resourceTypeId: 'resource-type:00000021',
    amount: 6,
    state
  });

  const makeDispatch = () => WorkforceAwareTransportDispatchIntegration.dispatch({
    reservation: reservation(),
    candidates: [{
      profile: PersonWorkforceProfileContract.define({
        personId: 'unit:00000101',
        specialization: 'CARRIER',
        capabilities: ['CAN_MOVE', 'CAN_SIMPLE_TRANSPORT']
      }),
      state: WorkforceAssignmentStateContract.define({ personId: 'unit:00000101' })
    }],
    projectionRefs: {
      jobId: 'transport-job:00000101',
      claimId: 'claim:00000101',
      demandId: 'demand:00000101',
      resourceId: 'resource:00000101',
      assignmentId: 'assignment:00000101'
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

  const sourceStock = quantity => BuildingStockContract.define({
    buildingId: 'building:00000101',
    resourceTypeId: 'resource-type:00000021',
    quantity
  });

  const targetStock = quantity => BuildingStockContract.define({
    buildingId: 'building:00000102',
    resourceTypeId: 'resource-type:00000021',
    quantity
  });

  check('cr27b-frozen-predecessor-regression', () => cr27b.pass && cr27b.blockerCount === 0);
  check('cr27c-direct-test-regression', () => direct.pass && direct.blockerCount === 0);

  check('cr27c-end-to-end-confirmed-delivery-settles-all-frozen-owners', () => {
    const dispatch = makeDispatch();
    const delivery = deliveryFor(dispatch);
    const source = sourceStock(14);
    const target = targetStock(3);
    const before = [dispatch.reservation, dispatch.workforce.assignedState, source, target].map(value => JSON.stringify(value));

    const result = DeliveredTransportBuildingStockSettlement.settle({
      dispatch,
      delivery,
      reservation: dispatch.reservation,
      workforceState: dispatch.workforce.assignedState,
      sourceStock: source,
      targetStock: target
    });

    const after = [dispatch.reservation, dispatch.workforce.assignedState, source, target].map(value => JSON.stringify(value));

    return result.sourceStock.quantity === 8
      && result.targetStock.quantity === 9
      && result.sourceStock.quantity + result.targetStock.quantity === 17
      && result.reservation.state === 'RELEASED'
      && result.workforceState.availability === 'FREE'
      && result.workforceState.assignmentId === null
      && result.jobId === dispatch.job.id
      && result.personId === dispatch.workforce.personId
      && before.every((value, index) => value === after[index]);
  });

  check('cr27c-delivery-linkage-cannot-be-bypassed', () => {
    const dispatch = makeDispatch();
    const base = {
      dispatch,
      reservation: dispatch.reservation,
      workforceState: dispatch.workforce.assignedState,
      sourceStock: sourceStock(14),
      targetStock: targetStock(3)
    };
    return rejects(() => DeliveredTransportBuildingStockSettlement.settle({ ...base, delivery: deliveryFor(dispatch, { jobId: 'transport-job:00000102' }) }))
      && rejects(() => DeliveredTransportBuildingStockSettlement.settle({ ...base, delivery: deliveryFor(dispatch, { unitId: 'unit:00000102' }) }))
      && rejects(() => DeliveredTransportBuildingStockSettlement.settle({ ...base, delivery: deliveryFor(dispatch, { resourceId: 'resource:00000102' }) }))
      && rejects(() => DeliveredTransportBuildingStockSettlement.settle({ ...base, delivery: deliveryFor(dispatch, { targetId: 'building:00000103' }) }))
      && rejects(() => DeliveredTransportBuildingStockSettlement.settle({ ...base, delivery: deliveryFor(dispatch, { amount: 5 }) }));
  });

  check('cr27c-owner-state-and-stock-safety-cannot-be-bypassed', () => {
    const dispatch = makeDispatch();
    const delivery = deliveryFor(dispatch);
    const common = { dispatch, delivery, sourceStock: sourceStock(14), targetStock: targetStock(3) };
    const releasedReservation = BuildingStockTransportReservationContract.release(dispatch.reservation);
    const freeWorkforce = WorkforceAssignmentStateContract.release(dispatch.workforce.assignedState);

    return rejects(() => DeliveredTransportBuildingStockSettlement.settle({
      ...common,
      reservation: releasedReservation,
      workforceState: dispatch.workforce.assignedState
    }))
      && rejects(() => DeliveredTransportBuildingStockSettlement.settle({
        ...common,
        reservation: dispatch.reservation,
        workforceState: freeWorkforce
      }))
      && rejects(() => DeliveredTransportBuildingStockSettlement.settle({
        ...common,
        reservation: dispatch.reservation,
        workforceState: dispatch.workforce.assignedState,
        sourceStock: sourceStock(5)
      }))
      && rejects(() => DeliveredTransportBuildingStockSettlement.settle({
        ...common,
        reservation: dispatch.reservation,
        workforceState: dispatch.workforce.assignedState,
        targetStock: targetStock(Number.MAX_SAFE_INTEGER - 2)
      }));
  });

  check('cr27c-committed-successor-states-prevent-second-settlement', () => {
    const dispatch = makeDispatch();
    const delivery = deliveryFor(dispatch);
    const first = DeliveredTransportBuildingStockSettlement.settle({
      dispatch,
      delivery,
      reservation: dispatch.reservation,
      workforceState: dispatch.workforce.assignedState,
      sourceStock: sourceStock(14),
      targetStock: targetStock(3)
    });

    return rejects(() => DeliveredTransportBuildingStockSettlement.settle({
      dispatch,
      delivery,
      reservation: first.reservation,
      workforceState: first.workforceState,
      sourceStock: first.sourceStock,
      targetStock: first.targetStock
    }));
  });

  check('cr27c-scope-remains-settlement-only', () => {
    const forbiddenMethods = ['deliver','pickup','dispatch','findPath','move','cancel','recover','prioritize','score','save'];
    const dispatch = makeDispatch();
    const result = DeliveredTransportBuildingStockSettlement.settle({
      dispatch,
      delivery: deliveryFor(dispatch),
      reservation: dispatch.reservation,
      workforceState: dispatch.workforce.assignedState,
      sourceStock: sourceStock(14),
      targetStock: targetStock(3)
    });
    const forbiddenResultKeys = ['carrier','route','path','movement','traffic','claimStore','demandStore','resourceState','priority','score','saveGame'];
    return forbiddenMethods.every(name => typeof DeliveredTransportBuildingStockSettlement[name] === 'undefined')
      && forbiddenResultKeys.every(key => !(key in result));
  });

  const blockerCount = results.filter(result => !result.pass).length;
  return Object.freeze({
    pass: blockerCount === 0,
    blockerCount,
    results: Object.freeze(results),
    direct,
    cr27b
  });
}
