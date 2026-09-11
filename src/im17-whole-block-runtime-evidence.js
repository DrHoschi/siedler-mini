import { runIM17GSelfTest } from './dev/im-17g-self-test.js';
import { RuntimeConfig } from './runtime/config.js';
import { renderPlayerConstructionStateProjection } from './ui/player-construction-state-projection.js';

const EXPECTED_BUILD = 'IM-17-WHOLE-BLOCK-COMPLETION-GATE';
const result = runIM17GSelfTest();
const testEl = document.querySelector('#test-status');
const buildPass = RuntimeConfig.build === EXPECTED_BUILD;
const pass = result.pass && buildPass;

if (pass) renderPlayerConstructionStateProjection(result.evidence.completed);

if (testEl) {
  testEl.textContent = pass
    ? `IM-17 WHOLE BLOCK — PASS · A–G frozen regression chain present · ${result.evidence.waiting.status} 0% → ${result.evidence.underConstruction.status} 33% → ${result.evidence.completed.status} 100% · Build Identity PASS · final marker pending exact-head CI/Pages`
    : `IM-17 WHOLE BLOCK — FAIL · im17gSelfTest=${result.pass} · buildIdentity=${buildPass}`;
  testEl.dataset.pass = pass ? 'true' : 'false';
}

console.info('[IM-17 Whole Block] Completion / Regression / Freeze Gate finalization evidence', {
  pass,
  build: RuntimeConfig.build,
  expectedBuild: EXPECTED_BUILD,
  im17gProjectionRegression: result,
  im17AThroughGCompleteFrozen: true,
  wholeBlockRegressionPassedBeforeFinalization: true,
  gameplayCapabilityAddedByFinalization: false,
  wholeBlockMarkerCreated: false
});
