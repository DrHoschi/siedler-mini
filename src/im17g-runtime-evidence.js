import { runIM17GSelfTest } from './dev/im-17g-self-test.js';
import { RuntimeConfig } from './runtime/config.js';
import { renderPlayerConstructionStateProjection } from './ui/player-construction-state-projection.js';

const EXPECTED_BUILD = 'IM-17G-PLAYER-CONSTRUCTION-STATE-PROJECTION';
const result = runIM17GSelfTest();
const testEl = document.querySelector('#test-status');
const buildPass = RuntimeConfig.build === EXPECTED_BUILD;
const pass = result.pass && buildPass;

if (pass) renderPlayerConstructionStateProjection(result.evidence.completed);

if (testEl) {
  testEl.textContent = pass
    ? `IM-17G — PASS · ${result.evidence.waiting.status} 0% → ${result.evidence.underConstruction.status} 33% → ${result.evidence.completed.status} 100% · authoritative Demand/Progress/Completion projection only · Build Identity PASS`
    : `IM-17G — FAIL · selfTest=${result.pass} · buildIdentity=${buildPass}`;
  testEl.dataset.pass = pass ? 'true' : 'false';
}

console.info('[IM-17G] Player Construction State Projection evidence', {
  pass,
  build: RuntimeConfig.build,
  expectedBuild: EXPECTED_BUILD,
  result,
  authoritativeRequirementProjection: true,
  authoritativeProgressProjection: true,
  frozenIM17FCompletionProjection: true,
  uiTruthAuthority: false,
  workforceIntegration: false,
  productionIntegration: false,
  wholeBlockGateExecuted: false
});
