import { runIM17ASelfTest } from './dev/im-17a-self-test.js';
import { RuntimeConfig } from './runtime/config.js';

const EXPECTED_BUILD = 'IM-17A-PLAYER-CONSTRUCTION-RUNTIME-ADMISSION-CONTRACT';
const result = runIM17ASelfTest();
const testEl = document.querySelector('#test-status');
const buildPass = RuntimeConfig.build === EXPECTED_BUILD;
const pass = result.pass && buildPass;

if (testEl) {
  testEl.textContent = pass
    ? `IM-17A — PASS · economic admission only in ${result.evidence.admittedRuntimeState} · READY → ${result.evidence.readyReason} · PAUSED → ${result.evidence.pausedReason} · rejected placement → ${result.evidence.rejectedPlacementReason} · NO IM-17B DEMAND/RESOURCE/PROGRESS · Build Identity PASS`
    : `IM-17A — FAIL · selfTest=${result.pass} · buildIdentity=${buildPass}`;
  testEl.dataset.pass = pass ? 'true' : 'false';
}

console.info('[IM-17A] Player Construction Runtime Admission Contract evidence', {
  pass,
  build: RuntimeConfig.build,
  expectedBuild: EXPECTED_BUILD,
  result,
  consumesFrozenIM16AuthoritativeCommitResult: true,
  admittedRuntimeState: result.evidence.admittedRuntimeState,
  frozenIM16SelectionPreviewCommitChanged: false,
  buildingMutationAuthority: false,
  constructionInitialization: false,
  resourceDemandAuthority: false,
  reservationTransportAuthority: false,
  constructionProgressAuthority: false,
  completionAuthority: false,
});
