import { BuildingStockContract } from '../domain/building-stock-contract.js';
import { ProductionBuildingStockContract } from '../domain/production-building-stock-contract.js';

export function runCr25cSelfTest() {
  const results = [];
  const check = (name, fn) => {
    try { results.push(Object.freeze({ name, pass: !!fn() })); }
    catch (error) { results.push(Object.freeze({ name, pass: false, error: String(error?.message || error) })); }
  };
  const rejects = fn => { try { fn(); return false; } catch { return true; } };

  const production = () => ProductionBuildingStockContract.define({
    buildingId: 'building:00000010',
    inputs: [
      { resourceTypeId: 'resource-type:00000002', quantity: 2 },
      { resourceTypeId: 'resource-type:00000001', quantity: 3 }
    ],
    outputs: [
      { resourceTypeId: 'resource-type:00000004', quantity: 1 },
      { resourceTypeId: 'resource-type:00000003', quantity: 4 }
    ]
  });

  const stocks = () => Object.freeze([
    BuildingStockContract.define({ buildingId: 'building:00000010', resourceTypeId: 'resource-type:00000004', quantity: 2 }),
    BuildingStockContract.define({ buildingId: 'building:00000010', resourceTypeId: 'resource-type:00000002', quantity: 5 }),
    BuildingStockContract.define({ buildingId: 'building:00000010', resourceTypeId: 'resource-type:00000001', quantity: 3 })
  ]);

  check('defines-deterministic-production-input-output-contract', () => {
    const value = production();
    return value.kind === 'production-building-stock'
      && value.buildingId === 'building:00000010'
      && Object.isFrozen(value)
      && Object.isFrozen(value.inputs)
      && Object.isFrozen(value.outputs)
      && JSON.stringify(value.inputs.map(entry => entry.resourceTypeId)) === JSON.stringify(['resource-type:00000001','resource-type:00000002'])
      && JSON.stringify(value.outputs.map(entry => entry.resourceTypeId)) === JSON.stringify(['resource-type:00000003','resource-type:00000004']);
  });

  check('execution-consumes-inputs-and-adds-outputs', () => {
    const result = ProductionBuildingStockContract.execute(production(), stocks());
    const byType = Object.fromEntries(result.map(entry => [entry.resourceTypeId, entry.quantity]));
    return byType['resource-type:00000001'] === 0
      && byType['resource-type:00000002'] === 3
      && byType['resource-type:00000003'] === 4
      && byType['resource-type:00000004'] === 3
      && Object.isFrozen(result)
      && result.every(Object.isFrozen);
  });

  check('insufficient-input-rejects-before-any-result', () => {
    const current = stocks();
    const snapshot = JSON.stringify(current);
    return rejects(() => ProductionBuildingStockContract.execute({
      buildingId: 'building:00000010',
      inputs: [{ resourceTypeId: 'resource-type:00000001', quantity: 4 }],
      outputs: [{ resourceTypeId: 'resource-type:00000003', quantity: 1 }]
    }, current)) && JSON.stringify(current) === snapshot;
  });

  check('execution-preserves-building-identity-and-input-values', () => {
    const current = stocks();
    const snapshot = JSON.stringify(current);
    const result = ProductionBuildingStockContract.execute(production(), current);
    return result.every(entry => entry.buildingId === 'building:00000010')
      && JSON.stringify(current) === snapshot;
  });

  check('supports-same-resource-type-as-input-and-output-deterministically', () => {
    const current = [BuildingStockContract.define({ buildingId: 'building:00000010', resourceTypeId: 'resource-type:00000001', quantity: 5 })];
    const result = ProductionBuildingStockContract.execute({
      buildingId: 'building:00000010',
      inputs: [{ resourceTypeId: 'resource-type:00000001', quantity: 3 }],
      outputs: [{ resourceTypeId: 'resource-type:00000001', quantity: 2 }]
    }, current);
    return result.length === 1 && result[0].quantity === 4;
  });

  check('rejects-invalid-production-contract-or-stock-set', () =>
    rejects(() => ProductionBuildingStockContract.define({ buildingId: 'building:00000010', inputs: [], outputs: [{ resourceTypeId: 'resource-type:00000003', quantity: 1 }] }))
      && rejects(() => ProductionBuildingStockContract.define({ buildingId: 'building:00000010', inputs: [{ resourceTypeId: 'resource-type:00000001', quantity: 1 }], outputs: [] }))
      && rejects(() => ProductionBuildingStockContract.define({ buildingId: 'building:00000010', inputs: [{ resourceTypeId: 'resource-type:00000001', quantity: 0 }], outputs: [{ resourceTypeId: 'resource-type:00000003', quantity: 1 }] }))
      && rejects(() => ProductionBuildingStockContract.define({ buildingId: 'building:00000010', inputs: [{ resourceTypeId: 'resource-type:00000001', quantity: 1 }, { resourceTypeId: 'resource-type:00000001', quantity: 1 }], outputs: [{ resourceTypeId: 'resource-type:00000003', quantity: 1 }] }))
      && rejects(() => ProductionBuildingStockContract.execute(production(), [BuildingStockContract.define({ buildingId: 'building:00000011', resourceTypeId: 'resource-type:00000001', quantity: 5 })]))
  );

  check('production-result-is-deterministic-and-immutable', () => {
    const a = ProductionBuildingStockContract.execute(production(), stocks());
    const b = ProductionBuildingStockContract.execute(production(), [...stocks()].reverse());
    return JSON.stringify(a) === JSON.stringify(b)
      && Object.isFrozen(a)
      && a.every(Object.isFrozen);
  });

  check('cr25c-does-not-add-timing-workforce-transport-capacity-or-savegame', () => {
    const value = production();
    const forbidden = ['duration','tick','interval','worker','profession','transport','carrier','capacity','slots','saveGame','constructionMaterial'];
    return forbidden.every(key => !(key in value))
      && typeof ProductionBuildingStockContract.tick === 'undefined'
      && typeof ProductionBuildingStockContract.assignWorker === 'undefined';
  });

  const blockerCount = results.filter(result => !result.pass).length;
  return Object.freeze({ pass: blockerCount === 0, blockerCount, results: Object.freeze(results) });
}
