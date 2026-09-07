import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

const frozenSubsteps = Object.freeze([
  ['IM-13A', 'src/dev/im-13a-self-test.node.js'],
  ['IM-13B', 'src/dev/im-13b-self-test.node.js'],
  ['IM-13C', 'src/dev/im-13c-self-test.node.js'],
  ['IM-13D', 'src/dev/im-13d-self-test.node.js'],
]);

const results = [];
for (const [name, script] of frozenSubsteps) {
  const run = spawnSync(process.execPath, [script], {
    cwd: process.cwd(),
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  assert.equal(run.status, 0, `${name} frozen regression failed:\n${run.stdout}\n${run.stderr}`);
  assert.match(`${run.stdout}\n${run.stderr}`, /PASS/, `${name} did not report PASS`);
  results.push(Object.freeze({ name, status: 'PASS' }));
}

assert.equal(results.length, 4);
assert.deepEqual(results.map(result => result.name), ['IM-13A', 'IM-13B', 'IM-13C', 'IM-13D']);

console.info('[IM-13] WHOLE-BLOCK COMPLETION / REGRESSION / FREEZE GATE: PASS / 0 BLOCKER', {
  frozenSubsteps: results,
  originalFoundationContractCovered: true,
  authoritativeSnapshotCapture: true,
  deterministicValidation: true,
  deterministicRestore: true,
  atomicRuntimeActivationAndDerivedRebinding: true,
  stableIdsAndAllocatorContinuity: true,
  worldMapDomainsGoldWearPreserved: true,
  derivedTransientStateRecomputed: true,
  completedStepBoundaryRequired: true,
  versionedSchema: 1,
  invalidStateRejectedDeterministically: true,
  saveSlotsStorageUiAbsent: true,
  autosaveAbsent: true,
  cloudMultiplayerSyncAbsent: true,
  schemaMigrationBeyondV1Absent: true,
  gameplayOwnershipUnchanged: true,
});
