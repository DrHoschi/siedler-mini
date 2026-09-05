import { BuildingLifecycleStateContract } from '../domain/building-lifecycle-state-contract.js';

export function runCr22bSelfTest() {
  const results = [];
  const check = (name, fn) => {
    try { results.push({ name, pass: !!fn() }); }
    catch (error) { results.push({ name, pass: false, error: String(error?.message || error) }); }
  };
  const rejects = fn => { try { fn(); return false; } catch { return true; } };
  const define = overrides => BuildingLifecycleStateContract.define({
    buildingId: 'building:00000001',
    ...(overrides || {})
  });

  check('default-state-is-exists', () => define().state === 'EXISTS');

  check('states-are-exactly-exists-and-retired', () =>
    Object.values(BuildingLifecycleStateContract.states).sort().join(',') === 'EXISTS,RETIRED'
  );

  check('contract-keeps-stable-building-id', () => {
    const value = define();
    return value.kind === 'building-lifecycle-state'
      && value.buildingId === 'building:00000001';
  });

  check('rejects-invalid-building-id', () =>
    rejects(() => define({ buildingId: 'unit:00000001' }))
    && rejects(() => define({ buildingId: 'building-1' }))
    && rejects(() => define({ buildingId: '' }))
  );

  check('allows-only-exists-to-retired', () => {
    const retired = BuildingLifecycleStateContract.transition(define(), 'RETIRED');
    return retired.state === 'RETIRED'
      && retired.buildingId === 'building:00000001';
  });

  check('retired-is-terminal', () =>
    rejects(() => BuildingLifecycleStateContract.transition(define({ state: 'RETIRED' }), 'EXISTS'))
    && rejects(() => BuildingLifecycleStateContract.transition(define({ state: 'RETIRED' }), 'RETIRED'))
  );

  check('no-op-and-foreign-transitions-are-rejected', () =>
    rejects(() => BuildingLifecycleStateContract.transition(define(), 'EXISTS'))
    && rejects(() => BuildingLifecycleStateContract.transition(define(), 'CONSTRUCTING'))
    && rejects(() => define({ state: 'PLANNED' }))
    && rejects(() => define({ state: 'FINISHED' }))
    && rejects(() => define({ state: 'DAMAGED' }))
  );

  check('contract-values-are-immutable', () => {
    const value = define();
    const retired = BuildingLifecycleStateContract.transition(value, 'RETIRED');
    return Object.isFrozen(value) && Object.isFrozen(retired) && Object.isFrozen(BuildingLifecycleStateContract.states);
  });

  check('cr22b-does-not-add-registry-construction-population-workforce-production-or-storage', () => {
    const value = define();
    const forbidden = [
      'definitionId', 'ownerRef', 'residents', 'workers', 'children', 'birthTimer', 'profession',
      'production', 'stock', 'storage', 'inventory', 'construction', 'progress', 'registry', 'worldStore'
    ];
    const source = BuildingLifecycleStateContract.toString().toLowerCase();
    return forbidden.every(key => !(key in value))
      && !source.includes('domainstore')
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
