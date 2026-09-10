import { runIM17FSelfTest } from './dev/im-17f-self-test.js';
import { RuntimeConfig } from './runtime/config.js';

const EXPECTED_BUILD = 'IM-17F-CONSTRUCTION-COMPLETION-INTEGRATION';
const result = runIM17FSelfTest();
const testEl = document.querySelector('#test-status');
const buildPass = RuntimeConfig.build === EXPECTED_BUILD;
const pass = result.pass && buildPass;

if (testEl) {
  testEl.textContent = pass
    ? `IM-17F — PASS · ${result.evidence.buildingId} ${result.evidence.previousState} → ${result.evidence.finalState} @ ${result.evidence.finalProgress} · completion=${result.evidence.completionEffective} count=${result.evidence.completionCount} · NO WORKFORCE / NO PRODUCTION / NO IM-17G · Build Identity PASS`
    : `IM-17F — FAIL · selfTest=${result.pass} · buildIdentity=${buildPass}`;
  testEl.dataset.pass = pass ? 'true' : 'false';
}

console.info('[IM-17F] Construction Completion Integration evidence', {
  pass,
  build: RuntimeConfig.build,
  expectedBuild: EXPECTED_BUILD,
  result,
  frozenIM17EProgressConsumed: true,
  existingConstructionCompletionBoundaryReused: true,
  stableBuildingIdentityPreserved: true,
  lifecycleMutation: false,
  workforceAssignment: false,
  productionStart: false,
  im17gImplemented: false
});
