import { BuildingConstructionProgressTransitionContract } from '../domain/building-construction-progress-transition-contract.js';

export function runCr24bSelfTest() {
  const results = [];
  const check = (name, fn) => {
    try { results.push(Object.freeze({ name, pass: !!fn() })); }
    catch (error) { results.push(Object.freeze({ name, pass: false, error: String(error?.message || error) })); }
  };
  const rejects = fn => { try { fn(); return false; } catch { return true; } };

  check('progress-domain-is-strictly-zero-to-one', () =>
    rejects(() => BuildingConstructionProgressTransitionContract.define({ buildingId: 'building:00000020', progress: -0.01 }))
      && rejects(() => BuildingConstructionProgressTransitionContract.define({ buildingId: 'building:00000020', progress: 1.01 }))
      && rejects(() => BuildingConstructionProgressTransitionContract.define({ buildingId: 'building:00000020', progress: Number.NaN }))
  );

  check('progress-deterministically-maps-to-construction-state', () => {
    const pending = BuildingConstructionProgressTransitionContract.define({ buildingId: 'building:00000020', progress: 0 });
    const active = BuildingConstructionProgressTransitionContract.define({ buildingId: 'building:00000020', progress: 0.4 });
    const complete = BuildingConstructionProgressTransitionContract.define({ buildingId: 'building:00000020', progress: 1 });
    return pending.state === 'PENDING' && active.state === 'IN_PROGRESS' && complete.state === 'COMPLETED';
  });

  check('allows-only-forward-state-order-without-pending-to-completed-skip', () => {
    const pending = BuildingConstructionProgressTransitionContract.define({ buildingId: 'building:00000020', progress: 0 });
    const active = BuildingConstructionProgressTransitionContract.advance(pending, 0.25);
    const complete = BuildingConstructionProgressTransitionContract.advance(active, 1);
    return active.state === 'IN_PROGRESS'
      && complete.state === 'COMPLETED'
      && rejects(() => BuildingConstructionProgressTransitionContract.advance(pending, 1));
  });

  check('rejects-progress-regression-and-completed-is-terminal', () => {
    const active = BuildingConstructionProgressTransitionContract.define({ buildingId: 'building:00000020', progress: 0.6 });
    const complete = BuildingConstructionProgressTransitionContract.define({ buildingId: 'building:00000020', progress: 1 });
    return rejects(() => BuildingConstructionProgressTransitionContract.advance(active, 0.5))
      && rejects(() => BuildingConstructionProgressTransitionContract.advance(complete, 0.9))
      && BuildingConstructionProgressTransitionContract.advance(complete, 1).state === 'COMPLETED';
  });

  check('building-id-remains-stable-across-progress-changes', () => {
    const pending = BuildingConstructionProgressTransitionContract.define({ buildingId: 'building:00000020', progress: 0 });
    const active = BuildingConstructionProgressTransitionContract.advance(pending, 0.5);
    return pending.buildingId === active.buildingId && active.buildingId === 'building:00000020';
  });

  check('contract-values-remain-deterministic-and-immutable', () => {
    const a = BuildingConstructionProgressTransitionContract.define({ buildingId: 'building:00000020', progress: 0.5 });
    const b = BuildingConstructionProgressTransitionContract.define({ buildingId: 'building:00000020', progress: 0.5 });
    return Object.isFrozen(a) && Object.isFrozen(b) && JSON.stringify(a) === JSON.stringify(b);
  });

  check('cr24b-does-not-add-cause-material-builder-time-production-or-transport-state', () => {
    const value = BuildingConstructionProgressTransitionContract.define({ buildingId: 'building:00000020', progress: 0.5 });
    const forbidden = ['materials','materialDemand','materialConsumed','builder','worker','workTime','elapsedTime','profession','production','stock','storage','transport','phase','foundation','roof','hammering','cause'];
    return forbidden.every(key => !(key in value));
  });

  const blockerCount = results.filter(result => !result.pass).length;
  return Object.freeze({ pass: blockerCount === 0, blockerCount, results: Object.freeze(results) });
}
