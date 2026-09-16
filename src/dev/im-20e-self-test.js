import assert from 'node:assert/strict';
import { Runtime } from '../runtime/runtime.js';
import { RuntimeConfig } from '../runtime/config.js';
import { createBaselineMiniworldScenario } from '../diagnostics/baseline-miniworld-scenario.js';
import { BrowserSaveGameStorageAdapter } from '../savegame/browser-savegame-storage-adapter.js';
import { PostIM13BrowserSaveContinueLifecycle } from '../savegame/post-im13-browser-save-continue-lifecycle.js';

class MemoryStorage {
  values = new Map();
  getItem(key) { return this.values.get(key) ?? null; }
  setItem(key, value) { this.values.set(key, String(value)); }
  removeItem(key) { this.values.delete(key); }
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

  memory.setItem(storage.key, '{broken');
  assert.equal(lifecycle.continueFromStorage().reason, 'INVALID_JSON');

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
