import assert from 'node:assert/strict';

const modules = [
  './cr-29a-self-test.node.js',
  './cr-29b-self-test.node.js',
  './cr-29c-self-test.node.js',
];

for (const modulePath of modules) {
  await import(modulePath);
}

assert.equal(modules.length, 3, 'CR-29 freeze gate must cover A, B and C');

console.log('CR-29 CAMERA & WORLD VIEW FOUNDATION FREEZE GATE: PASS / 0 BLOCKER');
