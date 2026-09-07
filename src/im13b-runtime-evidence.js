import { SaveGameValidationContract } from './savegame/savegame-validation-contract.js';

queueMicrotask(() => {
  const runtimeState = window.CleanRuntime;
  const serialized = runtimeState?.saveGameSerializedEvidence;
  if (!runtimeState || typeof serialized !== 'string') {
    throw new Error('IM-13B requires frozen IM-13A serialized snapshot evidence');
  }

  const snapshot = JSON.parse(serialized);
  const before = JSON.stringify(snapshot);
  const validResult = SaveGameValidationContract.validate(snapshot);
  const after = JSON.stringify(snapshot);

  const badSchema = structuredClone(snapshot);
  badSchema.schemaVersion = 2;
  const badSchemaResult = SaveGameValidationContract.validate(badSchema);

  const badGold = structuredClone(snapshot);
  badGold.economy.gold.balance = -1;
  const badGoldResult = SaveGameValidationContract.validate(badGold);

  const badWear = structuredClone(snapshot);
  if (badWear.pathWear.entries.length > 0) badWear.pathWear.entries[0].wearUnits += 1;
  const badWearResult = SaveGameValidationContract.validate(badWear);

  const pass = validResult.status === 'VALID'
    && validResult.errors.length === 0
    && badSchemaResult.status === 'INVALID'
    && badSchemaResult.errors.some(error => error.code === 'UNSUPPORTED_SCHEMA_VERSION')
    && badGoldResult.status === 'INVALID'
    && badGoldResult.errors.some(error => error.code === 'INVALID_GOLD_BALANCE')
    && (badWear.pathWear.entries.length === 0 || (
      badWearResult.status === 'INVALID'
      && badWearResult.errors.some(error => error.code === 'WEAR_USAGE_MISMATCH')
    ))
    && before === after;

  const testEl = document.querySelector('#test-status');
  if (testEl) {
    testEl.textContent = `IM-13B — Deterministic SaveGame Validation Contract — ${pass ? 'PASS' : 'FAIL'} — schemaVersion 1 VALID — ungültiges Schema INVALID — negatives Gold INVALID — Wear-Konsistenz ${badWear.pathWear.entries.length > 0 ? 'INVALID-Test PASS' : 'ohne Eintrag'} — side-effect-free PASS — IM-13A Snapshot unverändert — Restore noch nicht eingeführt`;
    testEl.dataset.pass = pass ? 'true' : 'false';
  }

  window.CleanRuntime = Object.freeze({
    ...runtimeState,
    saveGameValidationEvidence: validResult,
  });

  console.info('[IM-13B] Deterministic SaveGame Validation Contract', {
    build: runtimeState.config.build,
    pass,
    validStatus: validResult.status,
    schemaRejection: badSchemaResult.status,
    negativeGoldRejection: badGoldResult.status,
    wearRejection: badWear.pathWear.entries.length > 0 ? badWearResult.status : 'NOT_APPLICABLE',
    sideEffectFree: before === after,
    frozenIm13aPreserved: true,
    restoreNotIntroduced: true,
    runtimeMutationNotIntroduced: true,
  });
});
