import { runCr26aFreezeGate } from './cr-26a-freeze-gate.js';
import { runCr26bSelfTest } from './cr-26b-self-test.js';

export function runCr26bFreezeGate() {
  const cr26a = runCr26aFreezeGate();
  const cr26b = runCr26bSelfTest();
  const find = name => !!cr26b.results?.find(result => result.name === name)?.pass;

  const results = Object.freeze([
    Object.freeze({ name: 'cr26a-frozen-predecessor-regression', pass: !!cr26a.pass && cr26a.blockerCount === 0 }),
    Object.freeze({ name: 'cr26b-assignment-state-regression', pass: !!cr26b.pass && cr26b.blockerCount === 0 }),
    Object.freeze({ name: 'cr26b-availability-state-contract', pass: find('defines-free-assigned-unavailable-states') }),
    Object.freeze({ name: 'cr26b-nonassigned-own-no-assignment', pass: find('free-and-unavailable-own-no-assignment') }),
    Object.freeze({ name: 'cr26b-assigned-requires-single-stable-assignment', pass: find('assigned-requires-exactly-one-stable-assignment-id') }),
    Object.freeze({ name: 'cr26b-parallel-assignment-guard', pass: find('assign-only-from-free-and-prevents-parallel-assignment') }),
    Object.freeze({ name: 'cr26b-release-to-free', pass: find('release-assigned-back-to-free') }),
    Object.freeze({ name: 'cr26b-unavailable-transition-boundary', pass: find('unavailable-transitions-only-through-free') }),
    Object.freeze({ name: 'cr26b-person-id-and-immutability', pass: find('transitions-preserve-person-id-and-input-immutability') }),
    Object.freeze({ name: 'cr26b-invalid-state-reference-guard', pass: find('rejects-invalid-person-state-and-nonassigned-assignment-reference') }),
    Object.freeze({ name: 'cr26b-scope-remains-clean', pass: find('cr26b-does-not-add-selection-priority-reachability-or-execution') })
  ]);

  const blockerCount = results.filter(result => !result.pass).length;
  return Object.freeze({ pass: blockerCount === 0, blockerCount, results, cr26a, cr26b });
}
