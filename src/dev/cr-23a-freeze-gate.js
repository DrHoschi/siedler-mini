import { runCr22cFreezeGate } from './cr-22c-freeze-gate.js';
import { runCr23aSelfTest } from './cr-23a-self-test.js';

export function runCr23aFreezeGate() {
  const cr22 = runCr22cFreezeGate();
  const cr23a = runCr23aSelfTest();
  const results = Object.freeze([
    Object.freeze({ name: 'cr22-frozen-baseline-regression', pass: !!cr22.pass && cr22.blockerCount === 0 }),
    Object.freeze({ name: 'cr23a-identity-contract-regression', pass: !!cr23a.pass && cr23a.blockerCount === 0 }),
    Object.freeze({ name: 'cr23a-person-id-remains-stable-unit-id', pass: !!cr23a.results?.find(r => r.name === 'defines-stable-person-identity-on-existing-unit-id-kind')?.pass }),
    Object.freeze({ name: 'cr23a-minimal-existence-remains-exists', pass: !!cr23a.results?.find(r => r.name === 'cr23a-defines-only-exists-as-current-existence-state')?.pass }),
    Object.freeze({ name: 'cr23a-contract-remains-immutable', pass: !!cr23a.results?.find(r => r.name === 'contract-value-is-immutable')?.pass }),
    Object.freeze({ name: 'cr23a-scope-remains-clean', pass: !!cr23a.results?.find(r => r.name === 'cr23a-does-not-add-home-housing-population-workforce-or-gameplay-state')?.pass })
  ]);
  const blockerCount = results.filter(result => !result.pass).length;
  return Object.freeze({ pass: blockerCount === 0, blockerCount, results, cr22, cr23a });
}
