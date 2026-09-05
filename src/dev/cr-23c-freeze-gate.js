import { runCr22cFreezeGate } from './cr-22c-freeze-gate.js';
import { runCr23aFreezeGate } from './cr-23a-freeze-gate.js';
import { runCr23bFreezeGate } from './cr-23b-freeze-gate.js';
import { runCr23cSelfTest } from './cr-23c-self-test.js';

export function runCr23cFreezeGate() {
  const cr22 = runCr22cFreezeGate();
  const cr23a = runCr23aFreezeGate();
  const cr23b = runCr23bFreezeGate();
  const cr23c = runCr23cSelfTest();

  const find = name => !!cr23c.results?.find(result => result.name === name)?.pass;
  const results = Object.freeze([
    Object.freeze({ name: 'cr22-frozen-baseline-regression', pass: !!cr22.pass && cr22.blockerCount === 0 }),
    Object.freeze({ name: 'cr23a-frozen-identity-regression', pass: !!cr23a.pass && cr23a.blockerCount === 0 }),
    Object.freeze({ name: 'cr23b-frozen-home-assignment-regression', pass: !!cr23b.pass && cr23b.blockerCount === 0 }),
    Object.freeze({ name: 'cr23c-capacity-contract-regression', pass: !!cr23c.pass && cr23c.blockerCount === 0 }),
    Object.freeze({ name: 'cr23c-capacity-remains-building-scoped', pass: find('capacity-contract-is-building-scoped-and-immutable') }),
    Object.freeze({ name: 'cr23c-occupancy-remains-derived-from-home-assignments', pass: find('occupancy-is-derived-only-from-assigned-home-references') }),
    Object.freeze({ name: 'cr23c-capacity-boundary-remains-enforced', pass: find('capacity-boundary-allows-exactly-capacity-and-rejects-overflow') }),
    Object.freeze({ name: 'cr23c-summary-remains-deterministic-immutable', pass: find('occupancy-summary-is-deterministic-and-immutable') }),
    Object.freeze({ name: 'cr23c-scope-remains-clean', pass: find('cr23c-does-not-add-resident-list-population-family-workforce-or-production-state') })
  ]);

  const blockerCount = results.filter(result => !result.pass).length;
  return Object.freeze({ pass: blockerCount === 0, blockerCount, results, cr22, cr23a, cr23b, cr23c });
}
