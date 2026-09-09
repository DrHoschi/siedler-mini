import { runIM16GSelfTest } from './dev/im-16g-self-test.js';
import { RuntimeConfig } from './runtime/config.js';

const EXPECTED_BUILD = 'IM-16G-AUTHORITATIVE-CONSTRUCTION-RESULT-PLAYER-UI-PROJECTION-CONTRACT';
const result = runIM16GSelfTest();
const testEl = document.querySelector('#test-status');
const buildPass = RuntimeConfig.build === EXPECTED_BUILD;
const pass = result.pass && buildPass;

if (testEl) {
  testEl.textContent = pass
    ? `IM-16G — PASS · actual IM-16D commit result consumed · success → ${result.evidence.committedDefinitionId} / ${result.evidence.committedBuildingId} · rejection → ${result.evidence.rejectedDefinitionId} / ${result.evidence.rejectedReason} · NO PREVIEW/CONTROL/WORLD SUCCESS INFERENCE · NO BUILDING MUTATION · Build Identity PASS`
    : `IM-16G — FAIL · selfTest=${result.pass} · buildIdentity=${buildPass}`;
  testEl.dataset.pass = pass ? 'true' : 'false';
}

console.info('[IM-16G] Authoritative Construction Result Player UI Projection Contract evidence', {
  pass,
  build: RuntimeConfig.build,
  expectedBuild: EXPECTED_BUILD,
  result,
  actualIM16DCommitResultConsumedOnly: true,
  previewValiditySuccessInference: false,
  controlStateSuccessInference: false,
  worldRenderSuccessInference: false,
  buildingMutationAuthority: false,
  commitAuthority: false,
  placementValidityAuthority: false,
});
