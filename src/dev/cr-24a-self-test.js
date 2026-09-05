import { BuildingConstructionStateContract } from '../domain/building-construction-state-contract.js';
import { BuildingLifecycleStateContract } from '../domain/building-lifecycle-state-contract.js';

export function runCr24aSelfTest() {
  const results = [];
  const check = (name, fn) => {
    try { results.push(Object.freeze({ name, pass: !!fn() })); }
    catch (error) { results.push(Object.freeze({ name, pass: false, error: String(error?.message || error) })); }
  };
  const rejects = fn => { try { fn(); return false; } catch { return true; } };

  check('defines-stable-building-scoped-construction-state', () => {
    const value = BuildingConstructionStateContract.define({ buildingId: 'building:00000010' });
    return value.kind === 'building-construction-state'
      && value.buildingId === 'building:00000010'
      && value.state === 'PENDING'
      && Object.isFrozen(value);
  });

  check('supports-only-pending-in-progress-completed', () => {
    const states = BuildingConstructionStateContract.states;
    return Object.isFrozen(states)
      && JSON.stringify(Object.values(states)) === JSON.stringify(['PENDING','IN_PROGRESS','COMPLETED'])
      && BuildingConstructionStateContract.define({ buildingId: 'building:00000010', state: 'IN_PROGRESS' }).state === 'IN_PROGRESS'
      && BuildingConstructionStateContract.define({ buildingId: 'building:00000010', state: 'COMPLETED' }).state === 'COMPLETED'
      && rejects(() => BuildingConstructionStateContract.define({ buildingId: 'building:00000010', state: 'RETIRED' }));
  });

  check('requires-stable-building-id', () =>
    rejects(() => BuildingConstructionStateContract.define({ buildingId: 'unit:00000010' }))
      && rejects(() => BuildingConstructionStateContract.define({ buildingId: 'not-an-id' }))
  );

  check('construction-state-remains-independent-from-building-lifecycle', () => {
    const lifecycle = BuildingLifecycleStateContract.define({ buildingId: 'building:00000010', state: 'EXISTS' });
    const construction = BuildingConstructionStateContract.define({ buildingId: 'building:00000010', state: 'IN_PROGRESS' });
    return lifecycle.state === 'EXISTS'
      && construction.state === 'IN_PROGRESS'
      && lifecycle.kind === 'building-lifecycle-state'
      && construction.kind === 'building-construction-state'
      && !('constructionState' in lifecycle)
      && !('lifecycleState' in construction);
  });

  check('cr24a-does-not-add-transition-progress-material-builder-production-or-demolition-state', () => {
    const value = BuildingConstructionStateContract.define({ buildingId: 'building:00000010' });
    const forbidden = ['progress','progressPercent','phase','materials','materialDemand','builder','worker','profession','production','stock','storage','transport','demolition','destruction','usable','active'];
    return typeof BuildingConstructionStateContract.transition === 'undefined'
      && forbidden.every(key => !(key in value));
  });

  check('contract-value-is-deterministic-and-immutable', () => {
    const a = BuildingConstructionStateContract.define({ buildingId: 'building:00000010', state: 'PENDING' });
    const b = BuildingConstructionStateContract.define({ buildingId: 'building:00000010', state: 'PENDING' });
    return Object.isFrozen(a) && JSON.stringify(a) === JSON.stringify(b);
  });

  const blockerCount = results.filter(result => !result.pass).length;
  return Object.freeze({ pass: blockerCount === 0, blockerCount, results: Object.freeze(results) });
}
