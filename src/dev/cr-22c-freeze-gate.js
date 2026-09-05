import { runCr22bFreezeGate } from './cr-22b-freeze-gate.js';
import { runCr22cSelfTest } from './cr-22c-self-test.js';

export function runCr22cFreezeGate() {
  const cr22b = runCr22bFreezeGate();
  const cr22c = runCr22cSelfTest();
  const results = Object.freeze([
    Object.freeze({ name: 'cr22b-frozen-baseline-regression', pass: !!cr22b.pass && cr22b.blockerCount === 0 }),
    Object.freeze({ name: 'cr22c-registration-contract-regression', pass: !!cr22c.pass && cr22c.blockerCount === 0 }),
    Object.freeze({ name: 'cr22c-registers-in-existing-building-store', pass: !!cr22c.results?.find(r => r.name === 'registers-complete-building-owner-in-existing-building-store')?.pass }),
    Object.freeze({ name: 'cr22c-lookup-remains-exact-and-controlled', pass: !!cr22c.results?.find(r => r.name === 'lookup-resolves-exact-same-building-id')?.pass && !!cr22c.results?.find(r => r.name === 'unknown-building-lookup-is-controlled-null')?.pass }),
    Object.freeze({ name: 'cr22c-duplicate-id-remains-rejected', pass: !!cr22c.results?.find(r => r.name === 'duplicate-building-id-is-rejected-deterministically')?.pass }),
    Object.freeze({ name: 'cr22c-removal-is-targeted-and-controlled', pass: !!cr22c.results?.find(r => r.name === 'remove-affects-only-target-building')?.pass && !!cr22c.results?.find(r => r.name === 'remove-unknown-building-is-controlled-false')?.pass }),
    Object.freeze({ name: 'cr22c-no-lifecycle-or-feature-side-effects', pass: !!cr22c.results?.find(r => r.name === 'registry-does-not-apply-lifecycle-policy-or-feature-side-effects')?.pass })
  ]);
  const blockerCount = results.filter(result => !result.pass).length;
  return Object.freeze({
    pass: blockerCount === 0,
    blockerCount,
    results,
    cr22b,
    cr22c
  });
}
