import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// Regress the accepted CR-31A contract first.
await import('./cr-31a-self-test.node.js');

// Regress the reusable frozen predecessor line without reusing historical
// completion-page identity assertions from CR-30.
const predecessorModules = [
  './cr-29-freeze-gate.node.js',
  './cr-30a-self-test.node.js',
  './cr-30b-self-test.node.js',
  './cr-30c-self-test.node.js',
];
for (const modulePath of predecessorModules) await import(modulePath);

const [indexHtml, mainJs, runtimeConfig, sourceJs] = await Promise.all([
  readFile(new URL('../../index.html', import.meta.url), 'utf8'),
  readFile(new URL('../main.js', import.meta.url), 'utf8'),
  readFile(new URL('../runtime/config.js', import.meta.url), 'utf8'),
  readFile(new URL('../transport/world-backed-traversability-source.js', import.meta.url), 'utf8'),
]);

assert.match(indexHtml, /CR-31A[^<]*World-backed Traversability Source Contract/, 'visible title/heading must identify CR-31A');
assert.match(indexHtml, /cr31a-1/, 'CR-31A cache-busting identity must remain current');
assert.match(mainJs, /CR-31A ACTIVE/, 'runtime evidence must identify CR-31A as active');
assert.match(mainJs, /static BLOCKED cells/, 'runtime evidence must expose static blocked-cell result');
assert.match(runtimeConfig, /build: 'CR-31A-WORLD-BACKED-TRAVERSABILITY-SOURCE-CONTRACT'/, 'RuntimeConfig.build must identify CR-31A');
assert.match(sourceJs, /export class WorldBackedTraversabilitySource/, 'CR-31A source implementation must exist');
assert.doesNotMatch(sourceJs, /findPath|findRoute|moveCarrier|reservation|wear/i, 'CR-31A source must not absorb pathfinding, movement, reservation or wear ownership');

console.log('CR-31A WORLD-BACKED TRAVERSABILITY SOURCE CONTRACT VERIFICATION / FREEZE GATE: PASS / 0 BLOCKER');
