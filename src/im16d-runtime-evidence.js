import { RuntimeConfig } from './runtime/config.js?v=im16d-1';
import { runIM16DSelfTest } from './dev/im-16d-self-test.js';

const BUILD = 'IM-16D-AUTHORITATIVE-PLACEMENT-COMMIT-BUILDING-REGISTRATION-CONTRACT';
const testEl = document.querySelector('#test-status');

const selfTest = runIM16DSelfTest();
const buildIdentityPass = RuntimeConfig.build === BUILD && window.CleanRuntime?.config?.build === BUILD;
const pass = selfTest.pass && buildIdentityPass;

if (testEl) {
  const e = selfTest.evidence;
  testEl.textContent = `IM-16D — ${pass ? 'PASS' : 'FAIL'} · Occupied ${e.occupiedCellId}: ${e.occupiedRejectReason} / NO MUTATION · Free ${e.freeCellId}: COMMITTED ${e.committedBuildingId} · Recheck same target: ${e.repeatedRejectReason} / NO SECOND REGISTRATION · Authoritative position registered · No Player Confirm/Cancel · Build Identity ${buildIdentityPass ? 'PASS' : 'FAIL'}`;
  testEl.dataset.pass = pass ? 'true' : 'false';
}

window.IM16DAuthoritativeCommitEvidence = Object.freeze({
  kind: 'im-16d-runtime-evidence',
  pass,
  buildIdentityPass,
  selfTest,
  liveRuntimeMutation: false,
  playerConfirmCancel: false,
});
