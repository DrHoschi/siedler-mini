import { BuildingStockContract } from '../domain/building-stock-contract.js';

export function runCr25aSelfTest() {
  const results = [];
  const check = (name, fn) => {
    try { results.push(Object.freeze({ name, pass: !!fn() })); }
    catch (error) { results.push(Object.freeze({ name, pass: false, error: String(error?.message || error) })); }
  };
  const rejects = fn => { try { fn(); return false; } catch { return true; } };

  check('defines-building-scoped-resource-stock-with-zero-default', () => {
    const value = BuildingStockContract.define({
      buildingId: 'building:00000010',
      resourceTypeId: 'resource-type:00000003'
    });
    return value.kind === 'building-stock'
      && value.buildingId === 'building:00000010'
      && value.resourceTypeId === 'resource-type:00000003'
      && value.quantity === 0
      && Object.isFrozen(value);
  });

  check('accepts-non-negative-safe-integer-quantity', () =>
    BuildingStockContract.define({ buildingId: 'building:00000010', resourceTypeId: 'resource-type:00000003', quantity: 7 }).quantity === 7
      && BuildingStockContract.define({ buildingId: 'building:00000010', resourceTypeId: 'resource-type:00000003', quantity: 0 }).quantity === 0
  );

  check('rejects-negative-fractional-or-unsafe-quantity', () =>
    rejects(() => BuildingStockContract.define({ buildingId: 'building:00000010', resourceTypeId: 'resource-type:00000003', quantity: -1 }))
      && rejects(() => BuildingStockContract.define({ buildingId: 'building:00000010', resourceTypeId: 'resource-type:00000003', quantity: 1.5 }))
      && rejects(() => BuildingStockContract.define({ buildingId: 'building:00000010', resourceTypeId: 'resource-type:00000003', quantity: Number.MAX_SAFE_INTEGER + 1 }))
  );

  check('requires-stable-building-and-resource-type-ids', () =>
    rejects(() => BuildingStockContract.define({ buildingId: 'unit:00000010', resourceTypeId: 'resource-type:00000003' }))
      && rejects(() => BuildingStockContract.define({ buildingId: 'building:00000010', resourceTypeId: 'resource:00000003' }))
      && rejects(() => BuildingStockContract.define({ buildingId: 'building:00000010', resourceTypeId: 'not-an-id' }))
  );

  check('cr25a-does-not-add-mutation-capacity-production-workforce-or-transport', () => {
    const value = BuildingStockContract.define({
      buildingId: 'building:00000010',
      resourceTypeId: 'resource-type:00000003',
      quantity: 2
    });
    const forbidden = [
      'capacity','maxQuantity','slots','add','remove','deposit','withdraw','reserve','consume',
      'recipe','inputs','outputs','production','duration','worker','profession','transport','demand'
    ];
    return typeof BuildingStockContract.add === 'undefined'
      && typeof BuildingStockContract.remove === 'undefined'
      && forbidden.every(key => !(key in value));
  });

  check('contract-value-is-deterministic-and-immutable', () => {
    const a = BuildingStockContract.define({ buildingId: 'building:00000010', resourceTypeId: 'resource-type:00000003', quantity: 2 });
    const b = BuildingStockContract.define({ buildingId: 'building:00000010', resourceTypeId: 'resource-type:00000003', quantity: 2 });
    return Object.isFrozen(a) && JSON.stringify(a) === JSON.stringify(b);
  });

  const blockerCount = results.filter(result => !result.pass).length;
  return Object.freeze({ pass: blockerCount === 0, blockerCount, results: Object.freeze(results) });
}
