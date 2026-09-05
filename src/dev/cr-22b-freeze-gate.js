import { runCr22aFreezeGate } from './cr-22a-freeze-gate.js';
import { runCr22bSelfTest } from './cr-22b-self-test.js';

export function runCr22bFreezeGate() {
  const cr22a = runCr22aFreezeGate();
  const cr22b = runCr22bSelfTest();
  const results = Object.freeze([
    Object.freeze({ name: 'cr22a-frozen-baseline-regression', pass: !!cr22a.pass && cr22a.blockerCount === 0 }),
    Object.freeze({ name: 'cr22b-contract-regression', pass: !!cr22b.pass && cr22b.blockerCount === 0 }),
    Object.freeze({ name: 'cr22b-exists-to-retired-only', pass: !!cr22b.results?.find(r => r.name === 'allows-only-exists-to-retired')?.pass }),
    Object.freeze({ name: 'cr22b-retired-remains-terminal', pass: !!cr22b.results?.find(r => r.name === 'retired-is-terminal')?.pass }),
    Object.freeze({ name: 'cr22b-scope-remains-minimal', pass: !!cr22b.results?.find(r => r.name === 'cr22b-does-not-add-registry-construction-population-workforce-production-or-storage')?.pass }),
    Object.freeze({ name: 'cr22b-contract-values-immutable', pass: !!cr22b.results?.find(r => r.name === 'contract-values-are-immutable')?.pass })
  ]);
  const blockerCount = results.filter(result => !result.pass).length;
  return Object.freeze({
    pass: blockerCount === 0,
    blockerCount,
    results,
    cr22a,
    cr22b
  });
}
