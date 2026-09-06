import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const modules = [
  './cr-29-freeze-gate.node.js',
  './cr-30a-self-test.node.js',
  './cr-30b-self-test.node.js',
  './cr-30c-self-test.node.js',
];

for (const modulePath of modules) {
  await import(modulePath);
}

assert.equal(modules.length, 4, 'CR-30 whole gate must cover frozen CR-29 plus CR-30A, CR-30B and CR-30C');

const [indexHtml, mainJs, runtimeConfig] = await Promise.all([
  readFile(new URL('../../index.html', import.meta.url), 'utf8'),
  readFile(new URL('../main.js', import.meta.url), 'utf8'),
  readFile(new URL('../runtime/config.js', import.meta.url), 'utf8'),
]);

assert.match(indexHtml, /CR-30 Completion \/ Regression \/ Freeze Gate/, 'visible page title/heading must identify the CR-30 whole gate');
assert.match(indexHtml, /CR-30-COMPLETION-FREEZE-GATE/, 'visible page must expose current whole-gate identity');
assert.match(mainJs, /CR-30 COMPLETION GATE/, 'runtime evidence status must identify the CR-30 whole gate');
assert.doesNotMatch(mainJs, /CR-30C ACTIVE/, 'stale CR-30C active status must not remain during whole gate');
assert.match(runtimeConfig, /build: 'CR-30-COMPLETION-FREEZE-GATE'/, 'RuntimeConfig.build must identify the CR-30 whole gate');

console.log('CR-30 HOUSING / POPULATION / GOLD INTEGRATION FOUNDATION COMPLETION / REGRESSION / FREEZE GATE: PASS / 0 BLOCKER');
