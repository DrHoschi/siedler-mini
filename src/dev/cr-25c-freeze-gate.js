import { runCr25bFreezeGate } from './cr-25b-freeze-gate.js';
import { runCr25cSelfTest } from './cr-25c-self-test.js';

export function runCr25cFreezeGate() {
  const cr25b = runCr25bFreezeGate();
  const cr25c = runCr25cSelfTest();
  const find = name => !!cr25c.results?.find(result => result.name === name)?.pass;

  const results = Object.freeze([
    Object.freeze({ name: 'cr25b-frozen-baseline-regression', pass: !!cr25b.pass && cr25b.blockerCount === 0 }),
    Object.freeze({ name: 'cr25c-production-contract-regression', pass: !!cr25c.pass && cr25c.blockerCount === 0 }),
    Object.freeze({ name: 'cr25c-deterministic-input-output-contract', pass: find('defines-deterministic-production-input-output-contract') }),
    Object.freeze({ name: 'cr25c-consumes-inputs-adds-outputs', pass: find('execution-consumes-inputs-and-adds-outputs') }),
    Object.freeze({ name: 'cr25c-insufficient-input-atomic-rejection', pass: find('insufficient-input-rejects-before-any-result') }),
    Object.freeze({ name: 'cr25c-preserves-building-and-input-values', pass: find('execution-preserves-building-identity-and-input-values') }),
    Object.freeze({ name: 'cr25c-same-resource-input-output', pass: find('supports-same-resource-type-as-input-and-output-deterministically') }),
    Object.freeze({ name: 'cr25c-invalid-contract-stock-guard', pass: find('rejects-invalid-production-contract-or-stock-set') }),
    Object.freeze({ name: 'cr25c-deterministic-immutable-result', pass: find('production-result-is-deterministic-and-immutable') }),
    Object.freeze({ name: 'cr25c-scope-remains-clean', pass: find('cr25c-does-not-add-timing-workforce-transport-capacity-or-savegame') })
  ]);

  const blockerCount = results.filter(result => !result.pass).length;
  return Object.freeze({ pass: blockerCount === 0, blockerCount, results, cr25b, cr25c });
}
