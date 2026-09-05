import { BuildingStockContract } from '../domain/building-stock-contract.js';
import { BuildingStockMutationContract } from '../domain/building-stock-mutation-contract.js';
import { ProductionBuildingStockContract } from '../domain/production-building-stock-contract.js';
import { runCr25cFreezeGate } from './cr-25c-freeze-gate.js';

export function runCr25FreezeGate() {
  const cr25c = runCr25cFreezeGate();

  const results = [];
  const check = (name, fn) => {
    try { results.push(Object.freeze({ name, pass: !!fn() })); }
    catch (error) { results.push(Object.freeze({ name, pass: false, error: String(error?.message || error) })); }
  };

  check('cr25a-b-c-frozen-chain-regression', () => !!cr25c.pass && cr25c.blockerCount === 0);

  check('cr25-end-to-end-stock-mutation-production-chain', () => {
    const buildingId = 'building:00000010';
    const wood = BuildingStockContract.define({ buildingId, resourceTypeId: 'resource-type:00000001', quantity: 5 });
    const stone = BuildingStockContract.define({ buildingId, resourceTypeId: 'resource-type:00000002', quantity: 1 });
    const suppliedStone = BuildingStockMutationContract.add(stone, 2);
    const result = ProductionBuildingStockContract.execute({
      buildingId,
      inputs: [
        { resourceTypeId: 'resource-type:00000001', quantity: 3 },
        { resourceTypeId: 'resource-type:00000002', quantity: 2 }
      ],
      outputs: [{ resourceTypeId: 'resource-type:00000003', quantity: 1 }]
    }, [wood, suppliedStone]);
    const byType = Object.fromEntries(result.map(entry => [entry.resourceTypeId, entry.quantity]));
    return byType['resource-type:00000001'] === 2
      && byType['resource-type:00000002'] === 1
      && byType['resource-type:00000003'] === 1
      && result.every(Object.isFrozen)
      && Object.isFrozen(result);
  });

  check('cr25-insufficient-input-remains-atomic', () => {
    const buildingId = 'building:00000010';
    const stock = Object.freeze([
      BuildingStockContract.define({ buildingId, resourceTypeId: 'resource-type:00000001', quantity: 1 })
    ]);
    const before = JSON.stringify(stock);
    try {
      ProductionBuildingStockContract.execute({
        buildingId,
        inputs: [{ resourceTypeId: 'resource-type:00000001', quantity: 2 }],
        outputs: [{ resourceTypeId: 'resource-type:00000003', quantity: 1 }]
      }, stock);
      return false;
    } catch {
      return JSON.stringify(stock) === before;
    }
  });

  check('cr25-scope-remains-foundation-only', () => {
    const forbiddenProductionMethods = ['tick','start','pause','resume','assignWorker','dispatchTransport','setCapacity','save'];
    const forbiddenMutationMethods = ['produce','setCapacity','dispatchTransport','assignWorker'];
    return forbiddenProductionMethods.every(name => typeof ProductionBuildingStockContract[name] === 'undefined')
      && forbiddenMutationMethods.every(name => typeof BuildingStockMutationContract[name] === 'undefined');
  });

  const blockerCount = results.filter(result => !result.pass).length;
  return Object.freeze({ pass: blockerCount === 0, blockerCount, results: Object.freeze(results), cr25c });
}
