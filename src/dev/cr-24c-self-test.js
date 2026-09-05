import { BuildingConstructionCompletionBoundary } from '../domain/building-construction-completion-boundary.js';

export function runCr24cSelfTest() {
  const results = [];
  const check = (name, fn) => {
    try { results.push(Object.freeze({ name, pass: !!fn() })); }
    catch (error) { results.push(Object.freeze({ name, pass: false, error: String(error?.message || error) })); }
  };

  check('completion-is-false-for-pending-and-in-progress', () => {
    const pending = BuildingConstructionCompletionBoundary.derive({ buildingId: 'building:00000030', progress: 0 });
    const active = BuildingConstructionCompletionBoundary.derive({ buildingId: 'building:00000030', progress: 0.5 });
    return pending.constructionComplete === false && active.constructionComplete === false;
  });

  check('completion-is-true-only-for-completed-progress-one', () => {
    const complete = BuildingConstructionCompletionBoundary.derive({ buildingId: 'building:00000030', progress: 1 });
    return complete.constructionComplete === true;
  });

  check('completion-preserves-stable-building-id', () => {
    const value = BuildingConstructionCompletionBoundary.derive({ buildingId: 'building:00000030', progress: 1 });
    return value.buildingId === 'building:00000030';
  });

  check('completion-result-is-deterministic-and-immutable', () => {
    const a = BuildingConstructionCompletionBoundary.derive({ buildingId: 'building:00000030', progress: 1 });
    const b = BuildingConstructionCompletionBoundary.derive({ buildingId: 'building:00000030', progress: 1 });
    return Object.isFrozen(a) && Object.isFrozen(b) && JSON.stringify(a) === JSON.stringify(b);
  });

  check('completion-boundary-does-not-add-usability-production-housing-workforce-storage-or-transport-state', () => {
    const value = BuildingConstructionCompletionBoundary.derive({ buildingId: 'building:00000030', progress: 1 });
    const forbidden = ['usable','active','production','resident','housing','worker','workforce','stock','storage','transport','materials','builder','demolition','rendering'];
    return forbidden.every(key => !(key in value));
  });

  const blockerCount = results.filter(result => !result.pass).length;
  return Object.freeze({ pass: blockerCount === 0, blockerCount, results: Object.freeze(results) });
}
