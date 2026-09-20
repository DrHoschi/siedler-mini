import assert from 'node:assert/strict';
import { RuntimeConfig } from '../runtime/config.js';
import { BrowserSaveGameStorageAdapter } from '../savegame/browser-savegame-storage-adapter.js';
import { PostIM13BrowserSaveContinueLifecycle } from '../savegame/post-im13-browser-save-continue-lifecycle.js';

export function runIM20GSelfTest() {
  assert.equal(RuntimeConfig.build, 'IM-20G-SAVE-CONTINUE-PLAYER-DEVICE-VERIFICATION-TESTBUILD-1');
  const capabilities = PostIM13BrowserSaveContinueLifecycle.capabilities();
  assert.equal(capabilities.browserStorage, true);
  assert.equal(capabilities.v2Restore, true);
  assert.equal(capabilities.derivedStateRebinding, true);
  assert.equal(capabilities.atomicRuntimeActivation, true);
  assert.equal(capabilities.continueLifecycle, true);
  assert.equal(capabilities.exactlyOnceRecoveryReconciliation, true);
  assert.equal(typeof BrowserSaveGameStorageAdapter, 'function');
  return Object.freeze({
    kind: 'im20g-verification-contract-self-test',
    status: 'PASS',
    build: RuntimeConfig.build,
    verificationOnly: true,
    requiredDeviceEvidence: Object.freeze(['iPhone/iOS Safari', 'iPad/iPadOS Safari'])
  });
}
