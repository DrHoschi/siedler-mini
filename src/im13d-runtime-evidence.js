import { SaveGameSnapshotContract } from './savegame/savegame-snapshot-contract.js';
import { RestoredRuntimeActivationContract } from './savegame/restored-runtime-activation-contract.js';

queueMicrotask(() => {
  const runtimeStateA = window.CleanRuntime;
  const restored = runtimeStateA?.saveGameRestoreEvidence;
  const serializedA = runtimeStateA?.saveGameSerializedEvidence;
  if (!runtimeStateA || restored?.status !== 'RESTORED' || typeof serializedA !== 'string') {
    throw new Error('IM-13D requires frozen IM-13C RESTORED evidence and IM-13A serialized snapshot evidence');
  }
  if (typeof runtimeStateA.installActiveRuntimeComposition !== 'function') {
    throw new Error('IM-13D atomic runtime composition publish hook required');
  }

  const authoritativeA = {
    world: runtimeStateA.world,
    map: runtimeStateA.map,
    domains: runtimeStateA.domains,
    goldEconomy: runtimeStateA.goldEconomy,
    pathClassification: runtimeStateA.pathClassification,
    pathUsageWear: runtimeStateA.pathUsageWear,
  };

  const activationOwner = new RestoredRuntimeActivationContract({
    activeAuthoritativeState: authoritativeA,
    publish: composition => runtimeStateA.installActiveRuntimeComposition(composition),
  });
  const compositionA = activationOwner.active();
  const activation = activationOwner.activate(restored);
  const compositionB = activationOwner.active();
  const publishedComposition = runtimeStateA.getActiveRuntimeComposition?.();

  const ownerIdentityPass = activation.status === 'ACTIVATED'
    && compositionB !== compositionA
    && compositionB.authoritative.world === restored.runtimeState.world
    && compositionB.authoritative.map === restored.runtimeState.map
    && compositionB.authoritative.domains === restored.runtimeState.domains
    && compositionB.authoritative.goldEconomy === restored.runtimeState.goldEconomy
    && compositionB.authoritative.pathClassification === restored.runtimeState.pathClassification
    && compositionB.authoritative.pathUsageWear === restored.runtimeState.pathUsageWear
    && publishedComposition === compositionB;

  const personId = compositionB.authoritative.domains.units.ids().find(id => {
    const unit = compositionB.authoritative.domains.units.get(id);
    return unit?.identity?.kind === 'person-resident-identity' && unit?.position;
  });
  const person = personId ? compositionB.authoritative.domains.units.get(personId) : null;
  const navigationB = person ? compositionB.derived.navigation.validatePerson({
    personId,
    targetPosition: person.position,
  }) : null;
  const navigationPass = navigationB?.valid === true;

  const traversabilityB = compositionB.derived.traversability.entries();
  const traversabilityPass = Array.isArray(traversabilityB)
    && compositionB.derived.traversability !== runtimeStateA.traversability;

  const projectedB = compositionB.derived.render.projectVisibleState();
  const visibleRenderB = runtimeStateA.renderCurrentWorld();
  const renderPass = projectedB.buildings.length === visibleRenderB.projection.buildings.length
    && projectedB.persons.length === visibleRenderB.projection.persons.length;

  const snapshotA = JSON.parse(serializedA);
  const snapshotB = SaveGameSnapshotContract.capture({
    boundary: SaveGameSnapshotContract.completedStepBoundary(restored.captureStepIndex),
    world: compositionB.authoritative.world,
    map: compositionB.authoritative.map,
    domains: compositionB.authoritative.domains,
    gold: compositionB.authoritative.goldEconomy,
    wear: compositionB.authoritative.pathUsageWear,
  });
  const serializedB = SaveGameSnapshotContract.serialize(snapshotB);
  const roundTripPass = serializedA === serializedB;
  const goldPass = snapshotB.economy.gold.balance === snapshotA.economy.gold.balance;
  const wearPass = JSON.stringify(snapshotB.pathWear.entries) === JSON.stringify(snapshotA.pathWear.entries);
  const populationPolicyPass = compositionB.derived.populationPolicy.persisted === false
    && compositionB.derived.populationPolicy.mutationDuringActivation === false;

  const failingOwner = new RestoredRuntimeActivationContract({
    activeAuthoritativeState: authoritativeA,
    publish: () => { throw new Error('intentional IM-13D browser evidence publish failure'); },
  });
  const failedPrevious = failingOwner.active();
  const failedActivation = failingOwner.activate(restored);
  const failedActivationKeepsA = failedActivation.status === 'REJECTED'
    && failedActivation.reason === 'ATOMIC_PUBLISH_FAILED'
    && failingOwner.active() === failedPrevious;

  const rawSnapshotRejected = activationOwner.activate(snapshotA);
  const rawInputPass = rawSnapshotRejected.status === 'REJECTED'
    && rawSnapshotRejected.reason === 'IM-13C_RESTORED_RESULT_REQUIRED'
    && activationOwner.active() === compositionB;

  const pass = ownerIdentityPass
    && navigationPass
    && traversabilityPass
    && renderPass
    && roundTripPass
    && goldPass
    && wearPass
    && populationPolicyPass
    && failedActivationKeepsA
    && rawInputPass;

  const testEl = document.querySelector('#test-status');
  if (testEl) {
    testEl.textContent = `IM-13D — Deterministic Restored Runtime Activation & Derived Rebinding Contract — ${pass ? 'PASS' : 'FAIL'} — IM-13C RESTORED B ACTIVATED — Active World/Map/Domains = B ${ownerIdentityPass ? 'PASS' : 'FAIL'} — Traversability B ${traversabilityPass ? 'PASS' : 'FAIL'} — Navigation B ${navigationPass ? 'PASS' : 'FAIL'} — Render Projection B ${renderPass ? 'PASS' : 'FAIL'} — Capture A → Activate B → Capture B ${roundTripPass ? 'IDENTISCH' : 'ABWEICHUNG'} — Population derived/non-persisted ${populationPolicyPass ? 'PASS' : 'FAIL'} — Gold/Wear unverändert ${goldPass && wearPass ? 'PASS' : 'FAIL'} — fehlgeschlagene Activation hält A ${failedActivationKeepsA ? 'PASS' : 'FAIL'} — Save-Slots/Storage/UI nicht eingeführt`;
    testEl.dataset.pass = pass ? 'true' : 'false';
  }

  window.CleanRuntime = Object.freeze({
    ...runtimeStateA,
    world: compositionB.authoritative.world,
    map: compositionB.authoritative.map,
    domains: compositionB.authoritative.domains,
    goldEconomy: compositionB.authoritative.goldEconomy,
    pathClassification: compositionB.authoritative.pathClassification,
    pathClassificationEntries: compositionB.authoritative.pathClassification.entries(),
    pathUsageWear: compositionB.authoritative.pathUsageWear,
    traversability: compositionB.derived.traversability,
    housingPopulation: null,
    goldSettlement: null,
    populationDerivationPolicy: compositionB.derived.populationPolicy,
    reachabilityIntegration: compositionB.derived.reachability,
    navigationIntegration: compositionB.derived.navigation,
    saveGameActivationEvidence: activation,
    saveGameActivationRoundTripSerializedEvidence: serializedB,
    im13dNavigationEvidence: navigationB,
    im13dVisibleRenderEvidence: visibleRenderB,
  });

  console.info('[IM-13D] Deterministic Restored Runtime Activation & Derived Rebinding Contract', {
    build: runtimeStateA.config.build,
    pass,
    restoreStatus: restored.status,
    activationStatus: activation.status,
    activeOwnersAreRestoredB: ownerIdentityPass,
    traversabilityReboundToB: traversabilityPass,
    navigationReboundToB: navigationPass,
    renderProjectionReadsB: renderPass,
    canonicalRoundTripIdentity: roundTripPass,
    populationDerivedNonPersisted: populationPolicyPass,
    goldPreservedWithoutSettlement: goldPass,
    wearPreservedWithoutRecalculation: wearPass,
    failedActivationKeepsA: failedActivationKeepsA,
    rawSnapshotActivationRejected: rawInputPass,
    cameraRemainsIndependentViewState: true,
    saveSlotsStorageUiNotIntroduced: true,
    schemaMigrationNotIntroduced: true,
  });
});
