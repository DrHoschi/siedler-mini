import { runCr26bFreezeGate } from './cr-26b-freeze-gate.js';
import { runCr26cSelfTest } from './cr-26c-self-test.js';

export function runCr26cFreezeGate() {
  const cr26b = runCr26bFreezeGate();
  const cr26c = runCr26cSelfTest();
  const find = name => !!cr26c.results?.find(result => result.name === name)?.pass;

  const results = Object.freeze([
    Object.freeze({ name: 'cr26b-frozen-predecessor-regression', pass: !!cr26b.pass && cr26b.blockerCount === 0 }),
    Object.freeze({ name: 'cr26c-eligibility-selection-regression', pass: !!cr26c.pass && cr26c.blockerCount === 0 }),
    Object.freeze({ name: 'cr26c-minimal-request-contract', pass: find('defines-minimal-deterministic-eligibility-request') }),
    Object.freeze({ name: 'cr26c-capability-free-preconditions', pass: find('eligibility-requires-capability-free-and-preconditions') }),
    Object.freeze({ name: 'cr26c-reachability-input-boundary', pass: find('required-reachability-must-pass-when-applicable') }),
    Object.freeze({ name: 'cr26c-deterministic-person-selection', pass: find('selection-is-deterministic-by-stable-person-id') }),
    Object.freeze({ name: 'cr26c-no-eligible-person-result', pass: find('selection-returns-null-when-no-person-is-eligible') }),
    Object.freeze({ name: 'cr26c-assigns-through-frozen-cr26b', pass: find('selected-person-is-assigned-through-frozen-cr26b-transition') }),
    Object.freeze({ name: 'cr26c-input-immutability', pass: find('selection-does-not-mutate-profile-or-input-state') }),
    Object.freeze({ name: 'cr26c-invalid-candidate-request-guard', pass: find('rejects-mismatched-or-duplicate-candidates-and-invalid-request') }),
    Object.freeze({ name: 'cr26c-scope-remains-clean', pass: find('cr26c-does-not-add-priority-pathfinding-movement-or-work-execution') })
  ]);

  const blockerCount = results.filter(result => !result.pass).length;
  return Object.freeze({ pass: blockerCount === 0, blockerCount, results, cr26b, cr26c });
}
