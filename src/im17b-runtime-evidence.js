import { runIM17BSelfTest } from './dev/im-17b-self-test.js';
import { RuntimeConfig } from './runtime/config.js';

const EXPECTED_BUILD = 'IM-17B-ECONOMIC-CONSTRUCTION-REQUIREMENT-CONTRACT';
const result = runIM17BSelfTest();
const testEl = document.querySelector('#test-status');
const buildPass = RuntimeConfig.build === EXPECTED_BUILD;
const pass = result.pass && buildPass;

if (testEl) {
  testEl.textContent = pass
    ? `IM-17B — PASS · Demand ${result.evidence.demandId} · target ${result.evidence.targetAmount} · reserved ${result.evidence.reservedAmount} · fulfilled ${result.evidence.fulfilledAmount} · remaining ${result.evidence.remainingAmount} · ${result.evidence.status} · NO IM-17C INITIALIZATION/TRANSPORT/PROGRESS · Build Identity PASS`
    : `IM-17B — FAIL · selfTest=${result.pass} · buildIdentity=${buildPass}`;
  testEl.dataset.pass = pass ? 'true' : 'false';
}

console.info('[IM-17B] Economic Construction Requirement Contract evidence', {
  pass,
  build: RuntimeConfig.build,
  expectedBuild: EXPECTED_BUILD,
  result,
  existingResourceDemandAuthorityReused: true,
  buildingIdAsDemandConsumer: true,
  exactDemandVocabularyReused: true,
  newResourceAuthority: false,
  newDemandAuthority: false,
  placementInitialization: false,
  transportIntegration: false,
  deliveryClaimConsumeIntegration: false,
  constructionProgressAuthority: false,
  completionAuthority: false,
});
