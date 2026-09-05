import { runCr25aFreezeGate } from './cr-25a-freeze-gate.js';
import { runCr25bSelfTest } from './cr-25b-self-test.js';

export function runCr25bFreezeGate() {
  const cr25a = runCr25aFreezeGate();
  const cr25b = runCr25bSelfTest();
  const find = name => !!cr25b.results?.find(result => result.name === name)?.pass;

  const results = Object.freeze([
    Object.freeze({ name: 'cr25a-frozen-baseline-regression', pass: !!cr25a.pass && cr25a.blockerCount === 0 }),
    Object.freeze({ name: 'cr25b-mutation-regression', pass: !!cr25b.pass && cr25b.blockerCount === 0 }),
    Object.freeze({ name: 'cr25b-add-preserves-identity', pass: find('add-increases-quantity-and-preserves-identities') }),
    Object.freeze({ name: 'cr25b-remove-allows-zero', pass: find('remove-decreases-quantity-and-allows-zero') }),
    Object.freeze({ name: 'cr25b-over-withdrawal-guard', pass: find('rejects-over-withdrawal') }),
    Object.freeze({ name: 'cr25b-mutation-amount-validation', pass: find('rejects-zero-negative-fractional-or-unsafe-mutation-amounts') }),
    Object.freeze({ name: 'cr25b-overflow-guard', pass: find('rejects-safe-integer-overflow') }),
    Object.freeze({ name: 'cr25b-deterministic-immutable', pass: find('mutation-is-deterministic-and-immutable') }),
    Object.freeze({ name: 'cr25b-scope-remains-clean', pass: find('cr25b-does-not-add-production-capacity-workforce-or-transport') })
  ]);

  const blockerCount = results.filter(result => !result.pass).length;
  return Object.freeze({ pass: blockerCount === 0, blockerCount, results, cr25a, cr25b });
}
