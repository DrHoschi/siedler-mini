import { runCr25FreezeGate } from './cr-25-freeze-gate.js';
import { runCr26aSelfTest } from './cr-26a-self-test.js';

export function runCr26aFreezeGate() {
  const cr25 = runCr25FreezeGate();
  const cr26a = runCr26aSelfTest();
  const find = name => !!cr26a.results?.find(result => result.name === name)?.pass;

  const results = Object.freeze([
    Object.freeze({ name: 'cr25-frozen-predecessor-regression', pass: !!cr25.pass && cr25.blockerCount === 0 }),
    Object.freeze({ name: 'cr26a-workforce-profile-regression', pass: !!cr26a.pass && cr26a.blockerCount === 0 }),
    Object.freeze({ name: 'cr26a-existing-unit-identity', pass: find('defines-person-workforce-profile-on-existing-unit-identity') && find('requires-valid-existing-person-unit-id') }),
    Object.freeze({ name: 'cr26a-v1-specialization-set', pass: find('supports-frozen-v1-specializations') }),
    Object.freeze({ name: 'cr26a-v1-capability-set', pass: find('supports-frozen-v1-capabilities') }),
    Object.freeze({ name: 'cr26a-deterministic-capability-normalization', pass: find('capability-set-is-deduplicated-sorted-and-immutable') }),
    Object.freeze({ name: 'cr26a-invalid-profile-guard', pass: find('rejects-empty-or-unknown-capabilities-and-specializations') }),
    Object.freeze({ name: 'cr26a-deterministic-immutable-profile', pass: find('profile-is-deterministic-and-immutable') }),
    Object.freeze({ name: 'cr26a-scope-remains-clean', pass: find('cr26a-does-not-add-availability-assignment-or-job-selection') })
  ]);

  const blockerCount = results.filter(result => !result.pass).length;
  return Object.freeze({ pass: blockerCount === 0, blockerCount, results, cr25, cr26a });
}
