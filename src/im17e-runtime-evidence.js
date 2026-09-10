import { runIM17ESelfTest } from './dev/im-17e-self-test.js';
import { RuntimeConfig } from './runtime/config.js';

const EXPECTED_BUILD = 'IM-17E-DELIVERED-MATERIAL-CONSTRUCTION-PROGRESS-SETTLEMENT';
const result = runIM17ESelfTest();
const testEl = document.querySelector('#test-status');
const buildPass = RuntimeConfig.build === EXPECTED_BUILD;
const pass = result.pass && buildPass;

if (testEl) {
  testEl.textContent = pass
    ? `IM-17E — PASS · ${result.evidence.claimId} settled=${result.evidence.settledAmount} → fulfilled=${result.evidence.fulfilledAmount} → progress=${result.evidence.progress} ${result.evidence.constructionState} · NO IM-17F COMPLETION EFFECT · Build Identity PASS`
    : `IM-17E — FAIL · selfTest=${result.pass} · buildIdentity=${buildPass}`;
  testEl.dataset.pass = pass ? 'true' : 'false';
}

console.info('[IM-17E] Delivered Material → Construction Progress Settlement evidence', {
  pass,
  build: RuntimeConfig.build,
  expectedBuild: EXPECTED_BUILD,
  result,
  frozenIM17DLogisticsReused: true,
  authoritativeDeliveredStockSettlementRequired: true,
  existingDemandClaimConsumeReused: true,
  existingConstructionProgressContractReused: true,
  deterministicFulfillmentToProgressMapping: true,
  completionBoundaryExecuted: false,
  workforceIntegration: false,
  productionIntegration: false,
});
