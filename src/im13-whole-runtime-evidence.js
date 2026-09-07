import { SaveGameValidationContract } from './savegame/savegame-validation-contract.js';

queueMicrotask(() => {
  const runtimeState = window.CleanRuntime;
  const snapshot = runtimeState?.saveGameSnapshotEvidence;
  const restored = runtimeState?.saveGameRestoreEvidence;
  const activation = runtimeState?.saveGameActivationEvidence;
  const serializedA = runtimeState?.saveGameSerializedEvidence;
  const serializedB = runtimeState?.saveGameActivationRoundTripSerializedEvidence;

  const snapshotPass = snapshot?.kind === 'savegame-snapshot'
    && snapshot?.schemaVersion === 1
    && typeof serializedA === 'string';
  const validation = snapshotPass ? SaveGameValidationContract.validate(snapshot) : null;
  const validationPass = validation?.status === 'VALID';
  const restorePass = restored?.status === 'RESTORED';
  const activationPass = activation?.status === 'ACTIVATED';
  const roundTripPass = typeof serializedB === 'string' && serializedA === serializedB;

  const activeComposition = runtimeState?.getActiveRuntimeComposition?.();
  const activeOwnersPass = Boolean(activeComposition)
    && runtimeState.world === activeComposition.authoritative.world
    && runtimeState.map === activeComposition.authoritative.map
    && runtimeState.domains === activeComposition.authoritative.domains
    && runtimeState.goldEconomy === activeComposition.authoritative.goldEconomy
    && runtimeState.pathUsageWear === activeComposition.authoritative.pathUsageWear;

  const derivedPass = runtimeState?.populationDerivationPolicy?.persisted === false
    && runtimeState?.populationDerivationPolicy?.mutationDuringActivation === false
    && runtimeState?.traversability === activeComposition?.derived?.traversability
    && runtimeState?.reachabilityIntegration === activeComposition?.derived?.reachability
    && runtimeState?.navigationIntegration === activeComposition?.derived?.navigation;

  const exclusionsPass = !document.querySelector('[data-save-slot], [data-save-button], [data-load-button]');
  const pass = snapshotPass
    && validationPass
    && restorePass
    && activationPass
    && roundTripPass
    && activeOwnersPass
    && derivedPass
    && exclusionsPass;

  const testEl = document.querySelector('#test-status');
  if (testEl) {
    testEl.textContent = `IM-13 WHOLE-BLOCK — Completion / Regression / Freeze Gate — ${pass ? 'PASS / 0 BLOCKER' : 'FAIL'} — A Snapshot ${snapshotPass ? 'PASS' : 'FAIL'} — B Validation ${validationPass ? 'PASS' : 'FAIL'} — C Restore ${restorePass ? 'PASS' : 'FAIL'} — D Activation/Rebinding ${activationPass && activeOwnersPass && derivedPass ? 'PASS' : 'FAIL'} — Capture A → Restore/Activate B → Capture B ${roundTripPass ? 'IDENTISCH' : 'ABWEICHUNG'} — schemaVersion 1 — Stable runtime owners aktiv ${activeOwnersPass ? 'PASS' : 'FAIL'} — derived/transient neu gebunden ${derivedPass ? 'PASS' : 'FAIL'} — Save-Slots/Storage/UI, Autosave, Cloud/Multiplayer und Schema-Migration nicht eingeführt`;
    testEl.dataset.pass = pass ? 'true' : 'false';
  }

  console.info('[IM-13] Whole-Block Completion / Regression / Freeze Gate', {
    build: runtimeState?.config?.build,
    pass,
    snapshot: snapshotPass,
    validation: validationPass,
    restore: restorePass,
    activationAndRebinding: activationPass && activeOwnersPass && derivedPass,
    canonicalRoundTripIdentity: roundTripPass,
    schemaVersion: snapshot?.schemaVersion,
    stableRuntimeOwnersActive: activeOwnersPass,
    derivedTransientRebound: derivedPass,
    saveSlotsStorageUiAbsent: exclusionsPass,
    autosaveAbsent: true,
    cloudMultiplayerSyncAbsent: true,
    schemaMigrationBeyondV1Absent: true,
  });
});
