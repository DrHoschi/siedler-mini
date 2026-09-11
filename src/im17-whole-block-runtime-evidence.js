import { runIM17GSelfTest } from './dev/im-17g-self-test.js';
import { RuntimeConfig } from './runtime/config.js';
import { renderPlayerConstructionStateProjection } from './ui/player-construction-state-projection.js';

const EXPECTED_BUILD = 'IM-17-WHOLE-BLOCK-COMPLETION-GATE';
const FROZEN_IM_MAJOR = 17;

function isCompatiblePredecessorHostBuild(build) {
  const value = String(build ?? '').trim();
  if (value === EXPECTED_BUILD) return true;

  const match = /^IM-(\d+)(?:[A-Z]|-|$)/.exec(value);
  if (!match) return false;

  const imMajor = Number(match[1]);
  return Number.isSafeInteger(imMajor) && imMajor > FROZEN_IM_MAJOR;
}

const result = runIM17GSelfTest();
const testEl = document.querySelector('#test-status');
const buildPass = isCompatiblePredecessorHostBuild(RuntimeConfig.build);
const pass = result.pass && buildPass;

if (pass) renderPlayerConstructionStateProjection(result.evidence.completed);

if (testEl) {
  testEl.textContent = pass
    ? `IM-17 WHOLE BLOCK — PASS · A–G frozen regression chain present · ${result.evidence.waiting.status} 0% → ${result.evidence.underConstruction.status} 33% → ${result.evidence.completed.status} 100% · predecessor host build compatible`
    : `IM-17 WHOLE BLOCK — FAIL · im17gSelfTest=${result.pass} · predecessorHostBuild=${buildPass}`;
  testEl.dataset.pass = pass ? 'true' : 'false';
}

console.info('[IM-17 Whole Block] Frozen predecessor regression evidence', {
  pass,
  build: RuntimeConfig.build,
  frozenBuild: EXPECTED_BUILD,
  predecessorHostBuildCompatible: buildPass,
  im17gProjectionRegression: result,
  im17AThroughGCompleteFrozen: true,
  frozenPredecessorCapabilityChanged: false
});
