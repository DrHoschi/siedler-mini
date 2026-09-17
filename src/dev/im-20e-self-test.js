import assert from 'node:assert/strict';
import { Runtime } from '../runtime/runtime.js';
import { RuntimeConfig } from '../runtime/config.js';
import { Scheduler } from '../runtime/scheduler.js';
import { createBaselineMiniworldScenario } from '../diagnostics/baseline-miniworld-scenario.js';
import { BrowserSaveGameStorageAdapter } from '../savegame/browser-savegame-storage-adapter.js';
import { PostIM13BrowserSaveContinueLifecycle } from '../savegame/post-im13-browser-save-continue-lifecycle.js';
import { PostIM13ActiveRuntimeCaptureAdapter } from '../savegame/post-im13-active-runtime-capture-adapter.js';
import { PostIM13AuthoritativeSnapshotIntegration } from '../savegame/post-im13-authoritative-snapshot-integration.js';

class MemoryStorage {
  values = new Map();
  getItem(key) { return this.values.get(key) ?? null; }
  setItem(key, value) { this.values.set(key, String(value)); }
  removeItem(key) { this.values.delete(key); }
}

class MutatingFailStorage extends MemoryStorage {
  fail = false;
  setItem(key, value) {
    if (!this.fail) return super.setItem(key, value);
    this.fail = false;
    super.setItem(key, 'partial-write');
    throw new Error('quota failure');
  }
}

export async function runIM20ESelfTest() {
  const runtime = new Runtime(RuntimeConfig);
  runtime.boot();
  const memory = new MemoryStorage();
  const storage = new BrowserSaveGameStorageAdapter({ storage: memory });
  let active = createBaselineMiniworldScenario({ includeSaveContinuity: true });
  let cameraReset = 0;
  let selectionClear = 0;
  const lifecycle = new PostIM13BrowserSaveContinueLifecycle({
    storage,
    runtime,
    getComposition: () => active,
    publishComposition: composition => { active = composition; },
    resetCamera: () => { cameraReset += 1; },
    clearSelection: () => { selectionClear += 1; },
  });

  const save = await lifecycle.save();
  const serialized = storage.read();
  const parsed = JSON.parse(serialized);
  const result = lifecycle.continueFromStorage();
  runtime.pause();

  assert.equal(save.status, 'SAVED');
  assert.equal(parsed.schemaVersion, 2);
  assert.equal(parsed.authoritative.workforceBindings.length, 1);
  assert.equal(parsed.authoritative.carrierBindings.length, 1);
  assert.equal(parsed.authoritative.transportExecutions[0].state, 'TO_PICKUP');
  assert.equal(result.status, 'CONTINUED');
  assert.equal(result.rebound.status, 'REBOUND');
  assert.equal(result.schedulerRegistrationCount, 1);
  assert.equal(active.scenarioId, 'IM20E_RESTORED_CONTINUE');
  assert.equal(cameraReset, 1);
  assert.equal(selectionClear, 1);

  const recaptured = PostIM13ActiveRuntimeCaptureAdapter.capture(active, result.captureStepIndex);
  assert.equal(PostIM13AuthoritativeSnapshotIntegration.serialize(recaptured), serialized);
  const transportJobId = parsed.authoritative.carrierBindings[0].jobId;
  for (let index = 0; index < 32 && result.transport.executionForJob(transportJobId).state !== 'DELIVERED'; index += 1) runtime.scheduler.step(100);
  assert.equal(result.transport.executionForJob(transportJobId).state, 'DELIVERED');
  assert.equal(active.authoritative.domains.jobs.get(transportJobId).status, 'RELEASED');

  memory.setItem(storage.key, '{broken');
  assert.equal(lifecycle.continueFromStorage().reason, 'INVALID_JSON');

  memory.setItem(storage.key, JSON.stringify({ ...parsed, schemaVersion: 999 }));
  assert.equal(lifecycle.continueFromStorage().reason, 'RESTORE_REJECTED');

  const failingMemory = new MutatingFailStorage();
  const failingStorage = new BrowserSaveGameStorageAdapter({ storage: failingMemory });
  failingMemory.setItem(failingStorage.key, 'previous-save');
  failingMemory.fail = true;
  assert.throws(() => failingStorage.write('replacement-save'), /quota failure/);
  assert.equal(failingStorage.read(), 'previous-save');

  const boundaryRuntime = new Runtime(RuntimeConfig); boundaryRuntime.boot(); boundaryRuntime.start();
  const boundaryStorage = new BrowserSaveGameStorageAdapter({ storage: new MemoryStorage() });
  const boundaryLifecycle = new PostIM13BrowserSaveContinueLifecycle({ storage: boundaryStorage, runtime: boundaryRuntime,
    getComposition: () => createBaselineMiniworldScenario({ includeSaveContinuity: true }), publishComposition: () => {} });
  const boundarySave = boundaryLifecycle.save();
  assert.equal(boundaryStorage.read(), null);
  boundaryRuntime.scheduler.step();
  assert.equal((await boundarySave).stepIndex >= 1, true); boundaryRuntime.pause();

  const rollbackRuntime = { state: 'READY', scheduler: new Scheduler(RuntimeConfig.simulation), start() { throw new Error('activation start failure'); } };
  const rollbackMemory = new MemoryStorage(); rollbackMemory.setItem(storage.key, serialized);
  let rollbackActive = createBaselineMiniworldScenario({ includeSaveContinuity: true }); const originalActive = rollbackActive;
  let presentation = Object.freeze({ camera: 'before', selection: 'before' });
  const rollbackLifecycle = new PostIM13BrowserSaveContinueLifecycle({ storage: new BrowserSaveGameStorageAdapter({ storage: rollbackMemory }), runtime: rollbackRuntime,
    getComposition: () => rollbackActive, publishComposition: value => { rollbackActive = value; }, resetCamera: () => { presentation = { camera: 'reset', selection: presentation.selection }; },
    clearSelection: () => { presentation = { camera: presentation.camera, selection: null }; }, capturePresentation: () => presentation, restorePresentation: value => { presentation = value; } });
  const rollback = rollbackLifecycle.continueFromStorage();
  assert.equal(rollback.reason, 'ACTIVATION_FAILED'); assert.equal(rollbackActive, originalActive); assert.deepEqual(presentation, { camera: 'before', selection: 'before' });

  const reloadRuntime = new Runtime(RuntimeConfig); reloadRuntime.boot(); let reloadActive = createBaselineMiniworldScenario({ includeSaveContinuity: true });
  const reloadLifecycle = new PostIM13BrowserSaveContinueLifecycle({ storage, runtime: reloadRuntime, getComposition: () => reloadActive, publishComposition: value => { reloadActive = value; } });
  memory.setItem(storage.key, serialized);
  assert.equal(reloadLifecycle.continueFromStorage().status, 'CONTINUED'); reloadRuntime.pause();

  const noSaveStorage = new BrowserSaveGameStorageAdapter({ storage: new MemoryStorage() });
  const noSave = new PostIM13BrowserSaveContinueLifecycle({
    storage: noSaveStorage, runtime, getComposition: () => active, publishComposition: () => {},
  });
  assert.equal(noSave.continueFromStorage().status, 'NO_SAVE');

  const capabilities = PostIM13BrowserSaveContinueLifecycle.capabilities();
  assert.equal(capabilities.continueLifecycle, true);
  assert.equal(capabilities.exactlyOnceRecoveryReconciliation, false);
  return Object.freeze({
    kind: 'im-20e-self-test-result', pass: true,
    evidence: Object.freeze({
      schemaVersion: parsed.schemaVersion,
      workforceBindings: parsed.authoritative.workforceBindings.length,
      carrierBindings: parsed.authoritative.carrierBindings.length,
      transportExecutionState: parsed.authoritative.transportExecutions[0].state,
      schedulerRegistrationCount: result.schedulerRegistrationCount,
      captureStepIndex: result.captureStepIndex,
    }),
    capabilities,
  });
}
