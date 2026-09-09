import { runIM16FSelfTest } from './dev/im-16f-self-test.js';
import { RuntimeConfig } from './runtime/config.js';

const EXPECTED_BUILD = 'IM-16F-PLAYER-BUILDING-SELECTION-PLACEMENT-ACTIVATION-CONTRACT';
const result = runIM16FSelfTest();
const testEl = document.querySelector('#test-status');
const buildPass = RuntimeConfig.build === EXPECTED_BUILD;
const pass = result.pass && buildPass;

if (testEl) {
  testEl.textContent = pass
    ? `IM-16F — PASS · options ${result.evidence.options.join(' / ')} · select ${result.evidence.firstDefinitionId} → PLACEMENT ACTIVE · switch → ${result.evidence.switchedDefinitionId} · unavailable → ${result.evidence.rejectedReason} / NO ACTIVATION · frozen IM-16B activate(definitionId) consumed · NO BUILDING MUTATION · Build Identity PASS`
    : `IM-16F — FAIL · selfTest=${result.pass} · buildIdentity=${buildPass}`;
  testEl.dataset.pass = pass ? 'true' : 'false';
}

console.info('[IM-16F] Player Building Selection & Placement Activation Contract evidence', {
  pass,
  build: RuntimeConfig.build,
  expectedBuild: EXPECTED_BUILD,
  result,
  frozenIM16BActivationConsumed: true,
  authoritativeBuildingDefinitionRegistry: false,
  placementValidityAuthority: false,
  buildingMutationAuthority: false,
  commitAuthority: false,
});
