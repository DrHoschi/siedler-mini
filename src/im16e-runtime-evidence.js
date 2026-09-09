import { runIM16ESelfTest } from './dev/im-16e-self-test.js';
import { RuntimeConfig } from './runtime/config.js';

const EXPECTED_BUILD = 'IM-16E-PLAYER-PLACEMENT-CONFIRM-CANCEL-INTERACTION-CONTRACT';
const result = runIM16ESelfTest();
const testEl = document.querySelector('#test-status');
const buildPass = RuntimeConfig.build === EXPECTED_BUILD;
const pass = result.pass && buildPass;

if (testEl) {
  const checks = result.checks;
  testEl.textContent = pass
    ? `IM-16E — PASS · Confirm requires ACTIVE target · occupied → ${result.evidence.rejectedReason} / PLACEMENT PRESERVED · free → COMMITTED ${result.evidence.committedBuildingId} / PLACEMENT INACTIVE · Cancel → INACTIVE / NO BUILDING MUTATION · World pointer/touch is NOT implicit Confirm · Build Identity PASS`
    : `IM-16E — FAIL · selfTest=${result.pass} · buildIdentity=${buildPass}`;
  testEl.dataset.pass = pass ? 'true' : 'false';
}

console.info('[IM-16E] Player Placement Confirm / Cancel Interaction Contract evidence', {
  pass,
  build: RuntimeConfig.build,
  expectedBuild: EXPECTED_BUILD,
  result,
  liveRuntimeMutation: false,
  explicitConfirmOnly: true,
  implicitWorldPointerCommit: false,
});
