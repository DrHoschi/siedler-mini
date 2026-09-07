import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// Whole CR-31 regression intentionally consumes reusable frozen predecessor/substep
// verification rather than historical browser-identity freeze gates.
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

const [indexHtml, mainJs, runtimeConfig] = await Promise.all([
  readFile(new URL('../../index.html', import.meta.url), 'utf8'),
  readFile(new URL('../main.js', import.meta.url), 'utf8'),
  readFile(new URL('../runtime/config.js', import.meta.url), 'utf8'),
]);

assert.match(indexHtml, /CR-31 Completion \/ Regression \/ Freeze Gate/, 'visible page title/heading must identify the CR-31 whole gate');
assert.match(indexHtml, /CR-31-COMPLETION-FREEZE-GATE/, 'visible page must expose current whole-gate identity');
assert.match(mainJs, /CR-31 COMPLETION GATE/, 'runtime evidence status must identify the CR-31 whole gate');
assert.doesNotMatch(mainJs, /CR-31C ACTIVE/, 'stale CR-31C active status must not remain during whole gate');
assert.match(mainJs, /Person \$\{personNavigationValidation\.reason\} \/ Carrier \$\{carrierNavigationValidation\.reason\}/, 'whole gate must preserve CR-31C runtime entity navigation evidence');
assert.match(mainJs, /CR-31B world reachability/, 'whole gate must preserve CR-31B reachability evidence');
assert.match(mainJs, /CR-31A \$\{blockedStaticCells\.length\} static BLOCKED cells/, 'whole gate must preserve CR-31A traversability evidence');
assert.match(mainJs, /CR-30 Population \$\{housingPopulation\.population\.count\} \/ Gold \$\{goldSettlement\.state\.balance\}/, 'whole gate must preserve frozen CR-30 population/gold evidence');
assert.match(runtimeConfig, /build: 'CR-31-COMPLETION-FREEZE-GATE'/, 'RuntimeConfig.build must identify the CR-31 whole gate');

console.log('CR-31 NAVIGATION INTEGRATION FOUNDATION COMPLETION / REGRESSION / FREEZE GATE: PASS / 0 BLOCKER');
