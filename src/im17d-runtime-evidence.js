import { runIM17DSelfTest } from './dev/im-17d-self-test.js';
import { RuntimeConfig } from './runtime/config.js';

const EXPECTED_BUILD = 'IM-17D-CONSTRUCTION-DEMAND-EXISTING-LOGISTICS-INTEGRATION';
const result = runIM17DSelfTest();
const testEl = document.querySelector('#test-status');
const buildPass = RuntimeConfig.build === EXPECTED_BUILD;
const pass = result.pass && buildPass;

if (testEl) {
  testEl.textContent = pass
    ? `IM-17D — PASS · ${result.evidence.demandId} → ${result.evidence.claimId} → ${result.evidence.reservationId} → ${result.evidence.transportJobId} · reserved=${result.evidence.reservedAmount} fulfilled=${result.evidence.fulfilledAmount} · NO IM-17E PROGRESS · Build Identity PASS`
    : `IM-17D — FAIL · selfTest=${result.pass} · buildIdentity=${buildPass}`;
  testEl.dataset.pass = pass ? 'true' : 'false';
}

console.info('[IM-17D] Construction Demand → Existing Logistics Integration evidence', {
  pass,
  build: RuntimeConfig.build,
  expectedBuild: EXPECTED_BUILD,
  result,
  frozenIM17BRequirementAuthorityReused: true,
  existingResourceMatchingReused: true,
  existingResourceAssignmentClaimsReused: true,
  existingBuildingStockReservationReused: true,
  existingTransportJobServiceReused: true,
  secondLogisticsAuthorityCreated: false,
  newRoutingMovementOwnership: false,
  deliverySettlement: false,
  deliveryClaimConsumeIntegration: false,
  constructionProgressAuthority: false,
  completionAuthority: false,
});
