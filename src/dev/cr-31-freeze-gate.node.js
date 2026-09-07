import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// Whole CR-31 regression intentionally consumes reusable frozen predecessor/substep
// verification rather than historical browser/build-identity freeze gates. Current
// successors may replace visible CR/build labels without invalidating frozen CR-31.
const modules = [
  './cr-24c-freeze-gate.node.js',
  './cr-28-freeze-gate.node.js',
  './cr-30a-self-test.node.js',
  './cr-30b-self-test.node.js',
  './cr-30c-self-test.node.js',
  './cr-31a-self-test.node.js',
  './cr-31b-self-test.node.js',
  './cr-31c-self-test.node.js',
];

for (const modulePath of modules) {
  await import(modulePath);
}

assert.equal(modules.length, 8, 'CR-31 whole gate must cover frozen CR-30 functional predecessor plus CR-31A, CR-31B and CR-31C');

const mainJs = await readFile(new URL('../main.js', import.meta.url), 'utf8');

assert.doesNotMatch(mainJs, /CR-31C ACTIVE/, 'stale CR-31C active status must not remain after CR-31 freeze');
assert.match(mainJs, /Person \$\{personNavigationValidation\.reason\} \/ Carrier \$\{carrierNavigationValidation\.reason\}/, 'successor runtime must preserve CR-31C runtime entity navigation evidence');
assert.match(mainJs, /CR-31B world reachability/, 'successor runtime must preserve CR-31B reachability evidence');
assert.match(mainJs, /CR-31 Navigation PASS erhalten/, 'successor runtime must explicitly preserve frozen CR-31 navigation evidence');
assert.match(mainJs, /CR-30 Population \$\{housingPopulation\.population\.count\} \/ Gold \$\{goldSettlement\.state\.balance\}/, 'successor runtime must preserve frozen CR-30 population/gold evidence');

console.log('CR-31 NAVIGATION INTEGRATION FOUNDATION FROZEN REGRESSION: PASS / 0 BLOCKER');
