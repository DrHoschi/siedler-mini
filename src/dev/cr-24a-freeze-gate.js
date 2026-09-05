import { runCr23cFreezeGate } from './cr-23c-freeze-gate.js';
import { runCr24aSelfTest } from './cr-24a-self-test.js';

export function runCr24aFreezeGate() {
  const cr23 = runCr23cFreezeGate();
  const cr24a = runCr24aSelfTest();
  const find = name => !!cr24a.results?.find(result => result.name === name)?.pass;

  const results = Object.freeze([
    Object.freeze({ name: 'cr23-frozen-baseline-regression', pass: !!cr23.pass && cr23.blockerCount === 0 }),
    Object.freeze({ name: 'cr24a-construction-state-contract-regression', pass: !!cr24a.pass && cr24a.blockerCount === 0 }),
    Object.freeze({ name: 'cr24a-states-remain-pending-in-progress-completed', pass: find('supports-only-pending-in-progress-completed') }),
    Object.freeze({ name: 'cr24a-construction-remains-separate-from-building-lifecycle', pass: find('construction-state-remains-independent-from-building-lifecycle') }),
    Object.freeze({ name: 'cr24a-contract-remains-deterministic-immutable', pass: find('contract-value-is-deterministic-and-immutable') }),
    Object.freeze({ name: 'cr24a-scope-remains-clean', pass: find('cr24a-does-not-add-transition-progress-material-builder-production-or-demolition-state') })
  ]);

  const blockerCount = results.filter(result => !result.pass).length;
  return Object.freeze({ pass: blockerCount === 0, blockerCount, results, cr23, cr24a });
}
