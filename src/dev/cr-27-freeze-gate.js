import { BuildingStockContract } from '../domain/building-stock-contract.js';
import { BuildingStockTransportReservationContract } from '../domain/building-stock-transport-reservation-contract.js';
import { BuildingStockTransportReservationService } from '../domain/building-stock-transport-reservation-service.js';
import { DeliveredTransportBuildingStockSettlement } from '../domain/delivered-transport-building-stock-settlement.js';
import { PersonWorkforceProfileContract } from '../domain/person-workforce-profile-contract.js';
import { WorkforceAssignmentStateContract } from '../domain/workforce-assignment-state-contract.js';
import { WorkforceAwareTransportDispatchIntegration } from '../domain/workforce-aware-transport-dispatch-integration.js';
import { runCr27cFreezeGate } from './cr-27c-freeze-gate.js';

export function runCr27FreezeGate() {
  const cr27c = runCr27cFreezeGate();
  const results = [];
  const check = (name, fn) => {
    try { results.push(Object.freeze({ name, pass: !!fn() })); }
    catch (error) { results.push(Object.freeze({ name, pass: false, error: String(error?.message || error) })); }
  };
  const rejects = fn => { try { fn(); return false; } catch { return true; } };

  const sourceStock = BuildingStockContract.define({
    buildingId: 'building:00000151',
    resourceTypeId: 'resource-type:00000031',
    quantity: 20
  });
  const targetStock = BuildingStockContract.define({
    buildingId: 'building:00000152',
    resourceTypeId: 'resource-type:00000031',
    quantity: 4
  });
  const reservation = BuildingStockTransportReservationContract.define({
    id: 'transport-reservation:00000151',
    sourceBuildingId: sourceStock.buildingId,
    targetBuildingId: targetStock.buildingId,
    resourceTypeId: sourceStock.resourceTypeId,
    amount: 7
  });

  const makeDispatch = () => WorkforceAwareTransportDispatchIntegration.dispatch({
    reservation,
    candidates: [
      {
        profile: PersonWorkforceProfileContract.define({
          personId: 'unit:00000153',
          specialization: 'CARRIER',
          capabilities: ['CAN_MOVE', 'CAN_SIMPLE_TRANSPORT']
        }),
        state: WorkforceAssignmentStateContract.define({ personId: 'unit:00000153' })
      },
      {
        profile: PersonWorkforceProfileContract.define({
          personId: 'unit:00000152',
          specialization: 'CARRIER',
          capabilities: ['CAN_MOVE', 'CAN_SIMPLE_TRANSPORT']
        }),
        state: WorkforceAssignmentStateContract.define({ personId: 'unit:00000152' })
      }
    ],
    projectionRefs: {
      jobId: 'transport-job:00000151',
      claimId: 'claim:00000151',
      demandId: 'demand:00000151',
      resourceId: 'resource:00000151',
      assignmentId: 'assignment:00000151'
    },
    eligibility: { preconditionsPassed: true, requiresReachability: false }
  });

  const deliveryFor = dispatch => Object.freeze({
    kind: 'delivered-cargo',
    jobId: dispatch.job.id,
    unitId: dispatch.workforce.personId,
    resourceId: dispatch.job.resourceId,
    amount: dispatch.reservation.amount,
    targetId: dispatch.reservation.targetBuildingId
  });

  check('cr27a-cr27b-cr27c-frozen-regression', () => cr27c.pass && cr27c.blockerCount === 0);

  check('cr27-end-to-end-game-facing-logistics-owner-chain', () => {
    const beforeSource = JSON.stringify(sourceStock);
    const beforeTarget = JSON.stringify(targetStock);
    const beforeReservation = JSON.stringify(reservation);

    const reserved = BuildingStockTransportReservationService.reserve({ stock: sourceStock, reservation });
    if (reserved.availableBefore !== 20 || reserved.availableAfter !== 13) return false;

    const dispatch = makeDispatch();
    if (!dispatch || dispatch.workforce.personId !== 'unit:00000152') return false;
    if (dispatch.workforce.assignedState.availability !== 'ASSIGNED') return false;
    if (dispatch.executionAssignment.unitId !== dispatch.workforce.personId) return false;
    if (dispatch.execution.state !== 'TO_PICKUP') return false;
    if (dispatch.reservation.state !== 'ACTIVE') return false;
    if (JSON.stringify(sourceStock) !== beforeSource || JSON.stringify(targetStock) !== beforeTarget || JSON.stringify(reservation) !== beforeReservation) return false;

    const settled = DeliveredTransportBuildingStockSettlement.settle({
      dispatch,
      delivery: deliveryFor(dispatch),
      reservation: dispatch.reservation,
      workforceState: dispatch.workforce.assignedState,
      sourceStock,
      targetStock
    });

    return settled.sourceStock.quantity === 13
      && settled.targetStock.quantity === 11
      && settled.sourceStock.quantity + settled.targetStock.quantity === 24
      && settled.reservation.state === 'RELEASED'
      && settled.workforceState.availability === 'FREE'
      && settled.workforceState.assignmentId === null
      && BuildingStockTransportReservationService.availableAmount(sourceStock, [settled.reservation]) === 20
      && JSON.stringify(sourceStock) === beforeSource
      && JSON.stringify(targetStock) === beforeTarget
      && JSON.stringify(reservation) === beforeReservation;
  });

  check('cr27-unconfirmed-or-mismatched-delivery-cannot-settle', () => {
    const dispatch = makeDispatch();
    const common = {
      dispatch,
      reservation: dispatch.reservation,
      workforceState: dispatch.workforce.assignedState,
      sourceStock,
      targetStock
    };
    return rejects(() => DeliveredTransportBuildingStockSettlement.settle({
      ...common,
      delivery: { kind: 'delivered-cargo', jobId: 'transport-job:00000159', unitId: dispatch.workforce.personId, resourceId: dispatch.job.resourceId, amount: reservation.amount, targetId: reservation.targetBuildingId }
    }))
      && rejects(() => DeliveredTransportBuildingStockSettlement.settle({
        ...common,
        delivery: { ...deliveryFor(dispatch), amount: reservation.amount - 1 }
      }));
  });

  check('cr27-failure-paths-produce-no-partial-owner-state', () => {
    const dispatch = makeDispatch();
    const delivery = deliveryFor(dispatch);
    const before = [sourceStock, targetStock, dispatch.reservation, dispatch.workforce.assignedState].map(value => JSON.stringify(value));
    const failed = rejects(() => DeliveredTransportBuildingStockSettlement.settle({
      dispatch,
      delivery,
      reservation: dispatch.reservation,
      workforceState: dispatch.workforce.assignedState,
      sourceStock: BuildingStockContract.define({ ...sourceStock, quantity: 6 }),
      targetStock
    }));
    const after = [sourceStock, targetStock, dispatch.reservation, dispatch.workforce.assignedState].map(value => JSON.stringify(value));
    return failed && before.every((value, index) => value === after[index]);
  });

  check('cr27-global-scope-remains-integration-only', () => {
    const forbiddenDispatchMethods = ['assignCarrier','findPath','move','prioritize','score','createClaim','createDemand','createResource','save'];
    const forbiddenSettlementMethods = ['deliver','pickup','findPath','move','cancel','recover','prioritize','score','save'];
    const dispatch = makeDispatch();
    const settled = DeliveredTransportBuildingStockSettlement.settle({
      dispatch,
      delivery: deliveryFor(dispatch),
      reservation: dispatch.reservation,
      workforceState: dispatch.workforce.assignedState,
      sourceStock,
      targetStock
    });
    const forbiddenResultKeys = ['carrier','carrierState','route','path','movement','traffic','deadlock','claimStore','demandStore','resourceState','priority','score','production','construction','saveGame','rendering','inspector','balancing'];
    return forbiddenDispatchMethods.every(name => typeof WorkforceAwareTransportDispatchIntegration[name] === 'undefined')
      && forbiddenSettlementMethods.every(name => typeof DeliveredTransportBuildingStockSettlement[name] === 'undefined')
      && forbiddenResultKeys.every(key => !(key in dispatch) && !(key in settled));
  });

  const blockerCount = results.filter(result => !result.pass).length;
  return Object.freeze({
    pass: blockerCount === 0,
    blockerCount,
    results: Object.freeze(results),
    cr27c
  });
}
