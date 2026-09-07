import { SaveGameSnapshotContract } from './savegame/savegame-snapshot-contract.js';
import { SaveGameRestoreContract } from './savegame/savegame-restore-contract.js';

queueMicrotask(() => {
  const runtimeState = window.CleanRuntime;
  const serializedA = runtimeState?.saveGameSerializedEvidence;
  if (!runtimeState || typeof serializedA !== 'string') {
    throw new Error('IM-13C requires frozen IM-13A serialized snapshot evidence');
  }

  const snapshotA = JSON.parse(serializedA);
  const originalWorldBefore = JSON.stringify(runtimeState.world.snapshot());
  const originalDomainsBefore = JSON.stringify(runtimeState.domains.snapshot());
  const originalGoldBefore = JSON.stringify(runtimeState.goldEconomy.snapshot());

  const restored = SaveGameRestoreContract.restore(snapshotA);
  let serializedB = null;
  let roundTripPass = false;
  let stableIdentityPass = false;
  let wearPass = false;

  if (restored.status === 'RESTORED') {
    const stateB = restored.runtimeState;
    const snapshotB = SaveGameSnapshotContract.capture({
      boundary: SaveGameSnapshotContract.completedStepBoundary(restored.captureStepIndex),
      world: stateB.world,
      map: stateB.map,
      domains: stateB.domains,
      gold: stateB.goldEconomy,
      wear: stateB.pathUsageWear,
    });
    serializedB = SaveGameSnapshotContract.serialize(snapshotB);
    roundTripPass = serializedA === serializedB;
    stableIdentityPass = snapshotB.world.state.worldId === snapshotA.world.state.worldId
      && snapshotB.map.mapId === snapshotA.map.mapId
      && JSON.stringify(snapshotB.map.cellIds) === JSON.stringify(snapshotA.map.cellIds)
      && JSON.stringify(snapshotB.world.allocator) === JSON.stringify(snapshotA.world.allocator);
    wearPass = JSON.stringify(snapshotB.pathWear.entries) === JSON.stringify(snapshotA.pathWear.entries);
  }

  const invalid = structuredClone(snapshotA);
  invalid.economy.gold.balance = -1;
  const rejected = SaveGameRestoreContract.restore(invalid);
  const originalUnchanged = originalWorldBefore === JSON.stringify(runtimeState.world.snapshot())
    && originalDomainsBefore === JSON.stringify(runtimeState.domains.snapshot())
    && originalGoldBefore === JSON.stringify(runtimeState.goldEconomy.snapshot());

  const pass = restored.status === 'RESTORED'
    && restored.validation.status === 'VALID'
    && roundTripPass
    && stableIdentityPass
    && wearPass
    && rejected.status === 'REJECTED'
    && rejected.validation.status === 'INVALID'
    && originalUnchanged;

  const testEl = document.querySelector('#test-status');
  if (testEl) {
    testEl.textContent = `IM-13C — Deterministic SaveGame Restore Contract — ${pass ? 'PASS' : 'FAIL'} — IM-13B VALID vor Restore — Capture A → Restore B → Capture B ${roundTripPass ? 'IDENTISCH' : 'ABWEICHUNG'} — Stable IDs/Allocator ${stableIdentityPass ? 'PASS' : 'FAIL'} — Gold ${restored.status === 'RESTORED' ? restored.runtimeState.goldEconomy.balance : 'n/a'} — Wear ${wearPass ? 'PASS' : 'FAIL'} — ungültiger Restore REJECTED — bisheriger Runtime-State unverändert ${originalUnchanged ? 'PASS' : 'FAIL'} — Save-Slots/UI nicht eingeführt`;
    testEl.dataset.pass = pass ? 'true' : 'false';
  }

  window.CleanRuntime = Object.freeze({
    ...runtimeState,
    saveGameRestoreEvidence: restored,
    saveGameRestoreRoundTripSerializedEvidence: serializedB,
  });

  console.info('[IM-13C] Deterministic SaveGame Restore Contract', {
    build: runtimeState.config.build,
    pass,
    validationBeforeRestore: restored.validation?.status,
    restoreStatus: restored.status,
    canonicalRoundTripIdentity: roundTripPass,
    stableIdentityAndAllocatorPreserved: stableIdentityPass,
    wearPreserved: wearPass,
    invalidRestoreStatus: rejected.status,
    originalRuntimeUnchanged: originalUnchanged,
    saveSlotsUiNotIntroduced: true,
    schemaMigrationNotIntroduced: true,
  });
});
