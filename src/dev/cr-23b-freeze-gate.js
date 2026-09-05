import { runCr23aFreezeGate } from './cr-23a-freeze-gate.js';
import { runCr23bSelfTest } from './cr-23b-self-test.js';

export function runCr23bFreezeGate() {
  const cr23a = runCr23aFreezeGate();
  const cr23b = runCr23bSelfTest();
  const results = Object.freeze([
    Object.freeze({ name: 'cr23a-frozen-baseline-regression', pass: !!cr23a.pass && cr23a.blockerCount === 0 }),
    Object.freeze({ name: 'cr23b-home-assignment-contract-regression', pass: !!cr23b.pass && cr23b.blockerCount === 0 }),
    Object.freeze({ name: 'cr23b-unassigned-remains-without-home', pass: !!cr23b.results?.find(r => r.name === 'unassigned-resident-has-no-home-building')?.pass }),
    Object.freeze({ name: 'cr23b-assigned-references-stable-building-id', pass: !!cr23b.results?.find(r => r.name === 'assigned-resident-references-exact-building-owner-id')?.pass }),
    Object.freeze({ name: 'cr23b-person-and-building-id-kinds-remain-strict', pass: !!cr23b.results?.find(r => r.name === 'person-and-building-id-kinds-are-strict')?.pass }),
    Object.freeze({ name: 'cr23b-state-and-home-reference-remain-consistent', pass: !!cr23b.results?.find(r => r.name === 'assignment-state-and-home-reference-must-agree')?.pass }),
    Object.freeze({ name: 'cr23b-contract-remains-immutable-deterministic', pass: !!cr23b.results?.find(r => r.name === 'same-input-produces-same-immutable-contract')?.pass }),
    Object.freeze({ name: 'cr23b-explicit-reassignment-does-not-mutate-prior-value', pass: !!cr23b.results?.find(r => r.name === 'explicit-new-assignment-does-not-mutate-previous-assignment')?.pass }),
    Object.freeze({ name: 'cr23b-scope-remains-clean', pass: !!cr23b.results?.find(r => r.name === 'cr23b-does-not-add-capacity-occupancy-population-workforce-or-movement')?.pass })
  ]);
  const blockerCount = results.filter(result => !result.pass).length;
  return Object.freeze({ pass: blockerCount === 0, blockerCount, results, cr23a, cr23b });
}
