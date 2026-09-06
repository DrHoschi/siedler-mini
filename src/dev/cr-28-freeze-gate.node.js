import assert from 'node:assert/strict';

const requiredModules = [
  './cr-28a-self-test.node.js',
  './cr-28b-self-test.node.js',
  './cr-28c-self-test.node.js'
];

for (const modulePath of requiredModules) {
  await import(modulePath);
}

assert.equal(requiredModules.length, 3, 'CR-28 freeze gate must cover A + B + C');

console.log('CR-28 VISIBLE WORLD RUNTIME INTEGRATION FOUNDATION FREEZE GATE: PASS / 0 BLOCKER');
