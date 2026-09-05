import { runCr21FreezeGate } from './cr-21-freeze-gate.js';
import { runCr22aSelfTest } from './cr-22a-self-test.js';

export function runCr22aFreezeGate() {
  const cr21 = runCr21FreezeGate();
  const cr22a = runCr22aSelfTest();
  const results = Object.freeze([
    Object.freeze({ name: 'cr21-frozen-baseline-regression', pass: !!cr21.pass && cr21.blockerCount === 0 }),
    Object.freeze({ name: 'cr22a-contract-regression', pass: !!cr22a.pass && cr22a.blockerCount === 0 }),
    Object.freeze({ name: 'cr22a-scope-remains-minimal', pass: !!cr22a.results?.find(r => r.name === 'cr22a-does-not-add-lifecycle-population-workforce-production-stock-or-construction-state')?.pass }),
    Object.freeze({ name: 'cr22a-registry-integration-not-preempted', pass: !!cr22a.results?.find(r => r.name === 'cr22a-does-not-register-or-remove-buildings')?.pass }),
    Object.freeze({ name: 'cr22a-owner-contract-is-immutable', pass: !!cr22a.results?.find(r => r.name === 'contract-is-deeply-immutable')?.pass })
  ]);
  const blockerCount = results.filter(result => !result.pass).length;
  return Object.freeze({
    pass: blockerCount === 0,
    blockerCount,
    results,
    cr21,
    cr22a
  });
}
