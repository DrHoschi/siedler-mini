import { runCr24bFreezeGate } from './cr-24b-freeze-gate.js';
import { runCr24cSelfTest } from './cr-24c-self-test.js';

export function runCr24cFreezeGate() {
  const cr24b = runCr24bFreezeGate();
  const cr24c = runCr24cSelfTest();
  const find = name => !!cr24c.results?.find(result => result.name === name)?.pass;

  const results = Object.freeze([
    Object.freeze({ name: 'cr24b-frozen-baseline-regression', pass: !!cr24b.pass && cr24b.blockerCount === 0 }),
    Object.freeze({ name: 'cr24c-completion-boundary-regression', pass: !!cr24c.pass && cr24c.blockerCount === 0 }),
    Object.freeze({ name: 'cr24c-incomplete-states-remain-not-complete', pass: find('completion-is-false-for-pending-and-in-progress') }),
    Object.freeze({ name: 'cr24c-completion-remains-only-completed-progress-one', pass: find('completion-is-true-only-for-completed-progress-one') }),
    Object.freeze({ name: 'cr24c-building-id-remains-stable', pass: find('completion-preserves-stable-building-id') }),
    Object.freeze({ name: 'cr24c-result-remains-deterministic-immutable', pass: find('completion-result-is-deterministic-and-immutable') }),
    Object.freeze({ name: 'cr24c-scope-remains-clean', pass: find('completion-boundary-does-not-add-usability-production-housing-workforce-storage-or-transport-state') })
  ]);

  const blockerCount = results.filter(result => !result.pass).length;
  return Object.freeze({ pass: blockerCount === 0, blockerCount, results, cr24b, cr24c });
}
