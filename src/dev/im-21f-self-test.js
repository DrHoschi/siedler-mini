import assert from 'node:assert/strict';
import { Runtime } from '../runtime/runtime.js';
import { RuntimeConfig } from '../runtime/config.js';
import { createBaselineMiniworldScenario } from '../diagnostics/baseline-miniworld-scenario.js';
import { BrowserSaveGameStorageAdapter } from '../savegame/browser-savegame-storage-adapter.js';
import { PostIM13BrowserSaveContinueLifecycle } from '../savegame/post-im13-browser-save-continue-lifecycle.js';
import { PlayerNewGameLifecycle } from '../runtime/player-new-game-lifecycle.js';

class MemoryStorage {
  values = new Map();
  getItem(key) { return this.values.get(key) ?? null; }
  setItem(key, value) { this.values.set(key, String(value)); }
  removeItem(key) { this.values.delete(key); }
}

export async function runIM21FSelfTest() {
  const runtime = new Runtime(RuntimeConfig);
  runtime.boot();
  const memory = new MemoryStorage();
  const storage = new BrowserSaveGameStorageAdapter({ storage: memory });
  let active = createBaselineMiniworldScenario({ includeSaveContinuity: true });
  const saveLifecycle = new PostIM13BrowserSaveContinueLifecycle({
    storage, runtime,
    getComposition: () => active,
    publishComposition: value => { active = value; },
  });

  assert.equal(saveLifecycle.availability().status, 'NO_SAVE');
  await saveLifecycle.save();
  assert.equal(saveLifecycle.availability().status, 'AVAILABLE');
  const validSave = storage.read();
  memory.setItem(storage.key, '{broken');
  assert.equal(saveLifecycle.availability().status, 'INVALID');
  memory.setItem(storage.key, JSON.stringify({ schemaVersion: 999 }));
  assert.equal(saveLifecycle.availability().status, 'INVALID');
  memory.setItem(storage.key, validSave);

  let cameraReset = 0;
  let selectionClear = 0;
  const beforeStorage = storage.read();
  const newGame = new PlayerNewGameLifecycle({
    runtime,
    createComposition: () => createBaselineMiniworldScenario({ includeSaveContinuity: true }),
    publishComposition: value => { active = value; },
    resetCamera: () => { cameraReset += 1; },
    clearSelection: () => { selectionClear += 1; },
  });
  const started = newGame.startFresh();
  assert.equal(started.status, 'STARTED');
  assert.equal(runtime.state, 'RUNNING');
  assert.equal(cameraReset, 1);
  assert.equal(selectionClear, 1);
  assert.equal(storage.read(), beforeStorage);
  assert.equal(newGame.startFresh().reason, 'RUNTIME_NOT_READY');
  runtime.pause();

  const capabilities = Object.freeze({
    saveAvailability: PostIM13BrowserSaveContinueLifecycle.capabilities().persistedSaveAvailability,
    newGame: PlayerNewGameLifecycle.capabilities(),
  });
  assert.equal(capabilities.saveAvailability, true);
  assert.equal(capabilities.newGame.storageMutation, false);
  assert.equal(capabilities.newGame.inGameReset, false);

  return Object.freeze({
    kind: 'im-21f-self-test-result',
    pass: true,
    evidence: Object.freeze({
      noSaveFailClosed: true,
      invalidSaveFailClosed: true,
      validSaveAvailable: true,
      readyOnlyNewGame: true,
      existingSavePreserved: true,
    }),
    capabilities,
  });
}
