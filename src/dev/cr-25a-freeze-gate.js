import { runCr24cFreezeGate } from './cr-24c-freeze-gate.js';
import { runCr25aSelfTest } from './cr-25a-self-test.js';

export function runCr25aFreezeGate() {
  const cr24c = runCr24cFreezeGate();
  const cr25a = runCr25aSelfTest();
  const find = name => !!cr25a.results?.find(result => result.name === name)?.pass;

  const results = Object.freeze([
    Object.freeze({ name: 'cr24-frozen-baseline-regression', pass: !!cr24c.pass && cr24c.blockerCount === 0 }),
    Object.freeze({ name: 'cr25a-buildingstock-contract-regression', pass: !!cr25a.pass && cr25a.blockerCount === 0 }),
    Object.freeze({ name: 'cr25a-stable-building-ownership', pass: find('defines-building-scoped-resource-stock') && find('requires-stable-building-id') }),
    Object.freeze({ name: 'cr25a-resource-type-contract', pass: find('requires-resource-type-id') }),
    Object.freeze({ name: 'cr25a-nonnegative-safe-integer-quantity', pass: find('quantity-is-nonnegative-safe-integer') }),
    Object.freeze({ name: 'cr25a-deterministic-immutable-value', pass: find('contract-value-is-deterministic-and-immutable') }),
    Object.freeze({ name: 'cr25a-scope-remains-clean', pass: find('cr25a-does-not-add-mutation-capacity-production-workforce-or-transport') })
  ]);

  const blockerCount = results.filter(result => !result.pass).length;
  return Object.freeze({ pass: blockerCount === 0, blockerCount, results, cr24c, cr25a });
}
