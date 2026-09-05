import { BuildingIdentityOwnershipContract } from '../domain/building-identity-ownership-contract.js';

export function runCr22aSelfTest() {
  const results = [];
  const check = (name, fn) => {
    try { results.push({ name, pass: !!fn() }); }
    catch (error) { results.push({ name, pass: false, error: String(error?.message || error) }); }
  };
  const rejects = fn => { try { fn(); return false; } catch { return true; } };
  const define = overrides => BuildingIdentityOwnershipContract.define({
    buildingId: 'building:00000001',
    definitionId: 'b.lumberjack',
    ...(overrides || {})
  });

  check('defines-stable-building-identity', () => {
    const value = define();
    return value.kind === 'building-identity-ownership'
      && value.buildingId === 'building:00000001'
      && value.definitionId === 'b.lumberjack';
  });

  check('building-is-the-explicit-owner-anchor', () => {
    const value = define();
    return value.ownerRef.kind === 'building'
      && value.ownerRef.id === value.buildingId;
  });

  check('rejects-non-building-stable-ids', () =>
    rejects(() => define({ buildingId: 'unit:00000001' }))
    && rejects(() => define({ buildingId: 'building-1' }))
    && rejects(() => define({ buildingId: '' }))
  );

  check('requires-building-definition-reference', () =>
    rejects(() => define({ definitionId: '' }))
    && rejects(() => define({ definitionId: '   ' }))
    && rejects(() => BuildingIdentityOwnershipContract.define({ buildingId: 'building:00000001' }))
  );

  check('normalizes-definition-reference-without-reinterpreting-it', () => {
    const value = define({ definitionId: '  b.house.small  ' });
    return value.definitionId === 'b.house.small';
  });

  check('contract-is-deeply-immutable', () => {
    const value = define();
    return Object.isFrozen(value) && Object.isFrozen(value.ownerRef);
  });

  check('cr22a-does-not-add-lifecycle-population-workforce-production-stock-or-construction-state', () => {
    const value = define();
    const forbidden = [
      'status', 'state', 'lifecycle', 'residents', 'workers', 'children', 'birthTimer',
      'profession', 'production', 'stock', 'storage', 'construction', 'progress', 'inventory'
    ];
    return forbidden.every(key => !(key in value))
      && Object.keys(value.ownerRef).sort().join(',') === 'id,kind';
  });

  check('cr22a-does-not-register-or-remove-buildings', () => {
    const source = BuildingIdentityOwnershipContract.toString().toLowerCase();
    return !source.includes('domainstore')
      && !source.includes('worldstore')
      && !source.includes('.create(')
      && !source.includes('.remove(')
      && !source.includes('.update(');
  });

  const blockerCount = results.filter(result => !result.pass).length;
  return Object.freeze({
    pass: blockerCount === 0,
    blockerCount,
    results: Object.freeze(results.map(Object.freeze))
  });
}
