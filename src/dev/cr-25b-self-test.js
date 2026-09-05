import { BuildingStockContract } from '../domain/building-stock-contract.js';
import { BuildingStockMutationContract } from '../domain/building-stock-mutation-contract.js';

export function runCr25bSelfTest() {
  const results = [];
  const check = (name, fn) => {
    try { results.push(Object.freeze({ name, pass: !!fn() })); }
    catch (error) { results.push(Object.freeze({ name, pass: false, error: String(error?.message || error) })); }
  };
  const rejects = fn => { try { fn(); return false; } catch { return true; } };

  const base = () => BuildingStockContract.define({
    buildingId: 'building:00000010',
    resourceTypeId: 'resource-type:00000003',
    quantity: 5
  });

  check('add-increases-quantity-and-preserves-identities', () => {
    const current = base();
    const next = BuildingStockMutationContract.add(current, 3);
    return next.kind === 'building-stock'
      && next.buildingId === current.buildingId
      && next.resourceTypeId === current.resourceTypeId
      && next.quantity === 8
      && Object.isFrozen(next)
      && current.quantity === 5;
  });

  check('remove-decreases-quantity-and-allows-zero', () => {
    const current = base();
    const partial = BuildingStockMutationContract.remove(current, 2);
    const empty = BuildingStockMutationContract.remove(current, 5);
    return partial.quantity === 3
      && empty.quantity === 0
      && current.quantity === 5;
  });

  check('rejects-over-withdrawal', () =>
    rejects(() => BuildingStockMutationContract.remove(base(), 6))
  );

  check('rejects-zero-negative-fractional-or-unsafe-mutation-amounts', () =>
    rejects(() => BuildingStockMutationContract.add(base(), 0))
      && rejects(() => BuildingStockMutationContract.add(base(), -1))
      && rejects(() => BuildingStockMutationContract.add(base(), 1.5))
      && rejects(() => BuildingStockMutationContract.remove(base(), 0))
      && rejects(() => BuildingStockMutationContract.remove(base(), Number.MAX_SAFE_INTEGER + 1))
  );

  check('rejects-safe-integer-overflow', () => {
    const nearlyFull = BuildingStockContract.define({
      buildingId: 'building:00000010',
      resourceTypeId: 'resource-type:00000003',
      quantity: Number.MAX_SAFE_INTEGER
    });
    return rejects(() => BuildingStockMutationContract.add(nearlyFull, 1));
  });

  check('mutation-is-deterministic-and-immutable', () => {
    const a = BuildingStockMutationContract.add(base(), 2);
    const b = BuildingStockMutationContract.add(base(), 2);
    const c = BuildingStockMutationContract.remove(a, 1);
    const d = BuildingStockMutationContract.remove(b, 1);
    return Object.isFrozen(a)
      && Object.isFrozen(c)
      && JSON.stringify(a) === JSON.stringify(b)
      && JSON.stringify(c) === JSON.stringify(d);
  });

  check('cr25b-does-not-add-production-capacity-workforce-or-transport', () => {
    const next = BuildingStockMutationContract.add(base(), 1);
    const forbidden = [
      'capacity','maxQuantity','slots','recipe','inputs','outputs','production','duration',
      'worker','profession','transport','demand','materialDemand','saveGame','storagePolicy'
    ];
    return forbidden.every(key => !(key in next))
      && typeof BuildingStockMutationContract.produce === 'undefined'
      && typeof BuildingStockMutationContract.setCapacity === 'undefined';
  });

  const blockerCount = results.filter(result => !result.pass).length;
  return Object.freeze({ pass: blockerCount === 0, blockerCount, results: Object.freeze(results) });
}
