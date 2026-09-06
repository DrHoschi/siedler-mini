import { BuildingStockContract } from '../domain/building-stock-contract.js';
import { BuildingStockTransportReservationContract } from '../domain/building-stock-transport-reservation-contract.js';
import { BuildingStockTransportReservationService } from '../domain/building-stock-transport-reservation-service.js';
import { runCr27aSelfTest } from './cr-27a-self-test.js';

export function runCr27aFreezeGate() {
  const direct = runCr27aSelfTest();
  const results = [];
  const check = (name, fn) => {
    try { results.push(Object.freeze({ name, pass: !!fn() })); }
    catch (error) { results.push(Object.freeze({ name, pass: false, error: String(error?.message || error) })); }
  };
  const rejects = fn => { try { fn(); return false; } catch { return true; } };

  check('cr27a-direct-test-regression', () => direct.pass && direct.blockerCount === 0);

  check('cr27a-end-to-end-reservation-availability-invariant', () => {
    const stock = BuildingStockContract.define({
      buildingId: 'building:00000041',
      resourceTypeId: 'resource-type:00000007',
      quantity: 12
    });
    const first = BuildingStockTransportReservationContract.define({
      id: 'transport-reservation:00000041',
      sourceBuildingId: 'building:00000041',
      targetBuildingId: 'building:00000051',
      resourceTypeId: 'resource-type:00000007',
      amount: 5
    });
    const second = BuildingStockTransportReservationContract.define({
      id: 'transport-reservation:00000042',
      sourceBuildingId: 'building:00000041',
      targetBuildingId: 'building:00000052',
      resourceTypeId: 'resource-type:00000007',
      amount: 7
    });
    const before = JSON.stringify(stock);
    const a = BuildingStockTransportReservationService.reserve({ stock, reservation: first });
    const b = BuildingStockTransportReservationService.reserve({ stock, reservations: [first], reservation: second });
    return a.availableBefore === 12
      && a.availableAfter === 7
      && b.availableBefore === 7
      && b.availableAfter === 0
      && JSON.stringify(stock) === before;
  });

  check('cr27a-release-restores-availability-without-stock-mutation', () => {
    const stock = BuildingStockContract.define({
      buildingId: 'building:00000061',
      resourceTypeId: 'resource-type:00000009',
      quantity: 9
    });
    const active = BuildingStockTransportReservationContract.define({
      id: 'transport-reservation:00000061',
      sourceBuildingId: 'building:00000061',
      targetBuildingId: 'building:00000062',
      resourceTypeId: 'resource-type:00000009',
      amount: 6
    });
    const before = JSON.stringify(stock);
    const released = BuildingStockTransportReservationContract.release(active);
    return BuildingStockTransportReservationService.availableAmount(stock, [active]) === 3
      && BuildingStockTransportReservationService.availableAmount(stock, [released]) === 9
      && active.state === 'ACTIVE'
      && released.state === 'RELEASED'
      && JSON.stringify(stock) === before;
  });

  check('cr27a-overcommit-is-deterministically-rejected', () => {
    const stock = BuildingStockContract.define({
      buildingId: 'building:00000071',
      resourceTypeId: 'resource-type:00000011',
      quantity: 4
    });
    const existing = BuildingStockTransportReservationContract.define({
      id: 'transport-reservation:00000071',
      sourceBuildingId: 'building:00000071',
      targetBuildingId: 'building:00000072',
      resourceTypeId: 'resource-type:00000011',
      amount: 3
    });
    const next = BuildingStockTransportReservationContract.define({
      id: 'transport-reservation:00000072',
      sourceBuildingId: 'building:00000071',
      targetBuildingId: 'building:00000073',
      resourceTypeId: 'resource-type:00000011',
      amount: 2
    });
    return rejects(() => BuildingStockTransportReservationService.reserve({ stock, reservations: [existing], reservation: next }));
  });

  check('cr27a-scope-remains-intent-reservation-only', () => {
    const forbiddenServiceMethods = ['dispatch','assign','selectPerson','createTransportJob','findPath','move','pickup','deliver','settle','execute'];
    const forbiddenContractMethods = ['dispatch','assign','deliver','settle','completeTransport'];
    return forbiddenServiceMethods.every(name => typeof BuildingStockTransportReservationService[name] === 'undefined')
      && forbiddenContractMethods.every(name => typeof BuildingStockTransportReservationContract[name] === 'undefined');
  });

  const blockerCount = results.filter(result => !result.pass).length;
  return Object.freeze({
    pass: blockerCount === 0,
    blockerCount,
    results: Object.freeze(results),
    direct
  });
}
