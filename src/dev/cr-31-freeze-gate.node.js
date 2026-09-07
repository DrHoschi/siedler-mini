import assert from 'node:assert/strict';

// Whole CR-31 regression intentionally consumes reusable frozen predecessor/substep
// verification rather than historical browser/build/UI text identities. Current
// successors may replace visible CR/build labels and evidence wording without
// invalidating frozen CR-31, as long as the actual CR-31A/B/C contracts still pass.
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
assert.deepEqual(
  modules.slice(-3),
  ['./cr-31a-self-test.node.js', './cr-31b-self-test.node.js', './cr-31c-self-test.node.js'],
  'CR-31 frozen regression must execute the real CR-31A, CR-31B and CR-31C self-tests'
);

console.log('CR-31 NAVIGATION INTEGRATION FOUNDATION FROZEN REGRESSION: PASS / 0 BLOCKER');
