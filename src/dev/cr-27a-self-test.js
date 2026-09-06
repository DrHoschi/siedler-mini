import { BuildingStockContract } from '../domain/building-stock-contract.js';
import { BuildingStockTransportReservationContract } from '../domain/building-stock-transport-reservation-contract.js';
import { BuildingStockTransportReservationService } from '../domain/building-stock-transport-reservation-service.js';

export function runCr27aSelfTest() {
  const results = [];
  const check = (name, fn) => {
    try { results.push(Object.freeze({ name, pass: !!fn() })); }
    catch (error) { results.push(Object.freeze({ name, pass: false, error: String(error?.message || error) })); }
  };
  const rejects = fn => { try { fn(); return false; } catch { return true; } };

  const stock = (buildingId = 'building:00000001', resourceTypeId = 'resource-type:00000001', quantity = 10) =>
    BuildingStockContract.define({ buildingId, resourceTypeId, quantity });

  const reservation = (id, amount, overrides = {}) => BuildingStockTransportReservationContract.define({
    id,
    sourceBuildingId: 'building:00000001',
    targetBuildingId: 'building:00000002',
    resourceTypeId: 'resource-type:00000001',
    amount,
    ...overrides
  });

  check('defines-immutable-active-transport-reservation', () => {
    const value = reservation('transport-reservation:00000001', 3);
    return value.kind === 'building-stock-transport-reservation'
      && value.state === 'ACTIVE'
      && value.sourceBuildingId === 'building:00000001'
      && value.targetBuildingId === 'building:00000002'
      && value.resourceTypeId === 'resource-type:00000001'
      && value.amount === 3
      && Object.isFrozen(value);
  });

  check('valid-reservation-below-available-stock-succeeds', () => {
    const result = BuildingStockTransportReservationService.reserve({
      stock: stock(),
      reservation: reservation('transport-reservation:00000001', 4)
    });
    return result.availableBefore === 10
      && result.availableAfter === 6
      && result.reservation.amount === 4
      && Object.isFrozen(result);
  });

  check('exact-remaining-quantity-succeeds', () => {
    const existing = reservation('transport-reservation:00000001', 4);
    const result = BuildingStockTransportReservationService.reserve({
      stock: stock(),
      reservations: [existing],
      reservation: reservation('transport-reservation:00000002', 6)
    });
    return result.availableBefore === 6 && result.availableAfter === 0;
  });

  check('amount-above-remaining-quantity-is-rejected', () => {
    const existing = reservation('transport-reservation:00000001', 7);
    return rejects(() => BuildingStockTransportReservationService.reserve({
      stock: stock(),
      reservations: [existing],
      reservation: reservation('transport-reservation:00000002', 4)
    }));
  });

  check('two-active-reservations-cannot-overcommit-physical-stock', () => {
    const values = [
      reservation('transport-reservation:00000001', 6),
      reservation('transport-reservation:00000002', 5)
    ];
    return rejects(() => BuildingStockTransportReservationService.availableAmount(stock(), values));
  });

  check('different-source-buildings-remain-independent', () => {
    const unrelated = reservation('transport-reservation:00000001', 9, {
      sourceBuildingId: 'building:00000003'
    });
    return BuildingStockTransportReservationService.availableAmount(stock(), [unrelated]) === 10;
  });

  check('different-resource-types-remain-independent', () => {
    const unrelated = reservation('transport-reservation:00000001', 9, {
      resourceTypeId: 'resource-type:00000002'
    });
    return BuildingStockTransportReservationService.availableAmount(stock(), [unrelated]) === 10;
  });

  check('released-reservation-frees-availability', () => {
    const active = reservation('transport-reservation:00000001', 7);
    const released = BuildingStockTransportReservationContract.release(active);
    return active.state === 'ACTIVE'
      && released.state === 'RELEASED'
      && BuildingStockTransportReservationService.availableAmount(stock(), [active]) === 3
      && BuildingStockTransportReservationService.availableAmount(stock(), [released]) === 10
      && Object.isFrozen(released);
  });

  check('reserve-and-release-never-mutate-physical-building-stock', () => {
    const physical = stock();
    const before = JSON.stringify(physical);
    const active = reservation('transport-reservation:00000001', 5);
    BuildingStockTransportReservationService.reserve({ stock: physical, reservation: active });
    BuildingStockTransportReservationContract.release(active);
    return JSON.stringify(physical) === before && Object.isFrozen(physical);
  });

  check('availability-is-independent-of-reservation-input-order', () => {
    const values = [
      reservation('transport-reservation:00000001', 2),
      reservation('transport-reservation:00000002', 3),
      reservation('transport-reservation:00000003', 1)
    ];
    const a = BuildingStockTransportReservationService.availableAmount(stock(), values);
    const b = BuildingStockTransportReservationService.availableAmount(stock(), [...values].reverse());
    return a === 4 && b === 4;
  });

  check('rejects-invalid-stable-ids-and-invalid-amounts', () => {
    return rejects(() => reservation('job:00000001', 1))
      && rejects(() => reservation('transport-reservation:00000001', 0))
      && rejects(() => reservation('transport-reservation:00000001', -1))
      && rejects(() => reservation('transport-reservation:00000001', 1.5))
      && rejects(() => reservation('transport-reservation:00000001', 1, { sourceBuildingId: 'unit:00000001' }))
      && rejects(() => reservation('transport-reservation:00000001', 1, { targetBuildingId: 'unit:00000002' }))
      && rejects(() => reservation('transport-reservation:00000001', 1, { resourceTypeId: 'resource:00000001' }));
  });

  check('duplicate-reservation-ids-are-rejected', () => {
    const one = reservation('transport-reservation:00000001', 2);
    return rejects(() => BuildingStockTransportReservationService.availableAmount(stock(), [one, one]));
  });

  check('cr27a-does-not-leak-dispatch-movement-delivery-or-settlement', () => {
    const value = BuildingStockTransportReservationService.reserve({
      stock: stock(),
      reservation: reservation('transport-reservation:00000001', 2)
    });
    const forbidden = ['personId','carrier','transportJob','jobId','route','path','movement','delivery','settlement','assignmentId','priority','score'];
    return forbidden.every(key => !(key in value) && !(key in value.reservation))
      && typeof BuildingStockTransportReservationService.dispatch === 'undefined'
      && typeof BuildingStockTransportReservationService.findPath === 'undefined'
      && typeof BuildingStockTransportReservationService.deliver === 'undefined'
      && typeof BuildingStockTransportReservationService.settle === 'undefined';
  });

  const blockerCount = results.filter(result => !result.pass).length;
  return Object.freeze({ pass: blockerCount === 0, blockerCount, results: Object.freeze(results) });
}
