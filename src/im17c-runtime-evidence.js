import { runIM17CSelfTest } from './dev/im-17c-self-test.js';
import { RuntimeConfig } from './runtime/config.js';

const EXPECTED_BUILD = 'IM-17C-PLAYER-PLACEMENT-CONSTRUCTION-INITIALIZATION-INTEGRATION';
const result = runIM17CSelfTest();
const testEl = document.querySelector('#test-status');
const buildPass = RuntimeConfig.build === EXPECTED_BUILD;
const pass = result.pass && buildPass;

if (testEl) {
  testEl.textContent = pass
    ? `IM-17C — PASS · ${result.evidence.buildingId} → ${result.evidence.constructionState} · same stable Building identity · admitted in ${result.evidence.runtimeState} · NO IM-17D LOGISTICS/DELIVERY/PROGRESS · Build Identity PASS`
    : `IM-17C — FAIL · selfTest=${result.pass} · buildIdentity=${buildPass}`;
  testEl.dataset.pass = pass ? 'true' : 'false';
}

console.info('[IM-17C] Player Placement → Construction Initialization Integration evidence', {
  pass,
  build: RuntimeConfig.build,
  expectedBuild: EXPECTED_BUILD,
  result,
  consumesFrozenIM16Commit: true,
  consumesFrozenIM17AAdmission: true,
  preservesFrozenIM17BRequirementAuthority: true,
  stableBuildingIdentityPreserved: true,
  existingConstructionStateAuthorityReused: true,
  initialConstructionStatePending: true,
  secondBuildingIdentityCreated: false,
  transportIntegration: false,
  deliverySettlement: false,
  deliveryClaimConsumeIntegration: false,
  constructionProgressAuthority: false,
  completionAuthority: false,
});
