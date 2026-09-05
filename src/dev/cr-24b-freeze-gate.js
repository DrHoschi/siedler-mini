import { runCr24aFreezeGate } from './cr-24a-freeze-gate.js';
import { runCr24bSelfTest } from './cr-24b-self-test.js';

export function runCr24bFreezeGate() {
  const cr24a = runCr24aFreezeGate();
  const cr24b = runCr24bSelfTest();
  const find = name => !!cr24b.results?.find(result => result.name === name)?.pass;

  const results = Object.freeze([
    Object.freeze({ name: 'cr24a-frozen-baseline-regression', pass: !!cr24a.pass && cr24a.blockerCount === 0 }),
    Object.freeze({ name: 'cr24b-progress-transition-contract-regression', pass: !!cr24b.pass && cr24b.blockerCount === 0 }),
    Object.freeze({ name: 'cr24b-progress-domain-and-state-mapping-remain-deterministic', pass: find('progress-domain-is-strictly-zero-to-one') && find('progress-deterministically-maps-to-construction-state') }),
    Object.freeze({ name: 'cr24b-transition-order-remains-forward-only', pass: find('allows-only-forward-state-order-without-pending-to-completed-skip') && find('rejects-progress-regression-and-completed-is-terminal') }),
    Object.freeze({ name: 'cr24b-building-id-remains-stable', pass: find('building-id-remains-stable-across-progress-changes') }),
    Object.freeze({ name: 'cr24b-contract-remains-deterministic-immutable', pass: find('contract-values-remain-deterministic-and-immutable') }),
    Object.freeze({ name: 'cr24b-scope-remains-clean', pass: find('cr24b-does-not-add-cause-material-builder-time-production-or-transport-state') })
  ]);

  const blockerCount = results.filter(result => !result.pass).length;
  return Object.freeze({ pass: blockerCount === 0, blockerCount, results, cr24a, cr24b });
}
