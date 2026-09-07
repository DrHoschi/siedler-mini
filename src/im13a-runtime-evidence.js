import { SaveGameSnapshotContract } from './savegame/savegame-snapshot-contract.js';

queueMicrotask(() => {
  const runtimeState = window.CleanRuntime;
  if (!runtimeState?.world || !runtimeState?.map || !runtimeState?.domains || !runtimeState?.goldEconomy || !runtimeState?.pathUsageWear) {
    throw new Error('IM-13A requires frozen runtime owners and CR-32B wear evidence');
  }

  const boundary = SaveGameSnapshotContract.completedStepBoundary(0);
  const snapshot = SaveGameSnapshotContract.capture({
    boundary,
    world: runtimeState.world,
    map: runtimeState.map,
    domains: runtimeState.domains,
    gold: runtimeState.goldEconomy,
    wear: runtimeState.pathUsageWear,
  });
  const serialized = SaveGameSnapshotContract.serialize(snapshot);
  const serializedAgain = SaveGameSnapshotContract.serialize(SaveGameSnapshotContract.capture({
    boundary,
    world: runtimeState.world,
    map: runtimeState.map,
    domains: runtimeState.domains,
    gold: runtimeState.goldEconomy,
    wear: runtimeState.pathUsageWear,
  }));

  const pass = snapshot.kind === 'savegame-snapshot'
    && snapshot.schemaVersion === 1
    && snapshot.world.state.worldId === runtimeState.world.worldId
    && snapshot.map.mapId === runtimeState.map.mapId
    && snapshot.economy.gold.balance === runtimeState.goldEconomy.balance
    && snapshot.pathWear.entries.length === runtimeState.pathUsageWear.entries().length
    && serialized === serializedAgain;

  const testEl = document.querySelector('#test-status');
  if (testEl) {
    testEl.textContent = `IM-13A — SaveGame Snapshot Contract — ${pass ? 'PASS' : 'FAIL'} — schemaVersion 1 — World ${snapshot.world.state.worldId} / Map ${snapshot.map.mapId} — ${Object.keys(snapshot.domains).length} Domain-Stores + Allocator-State — Gold ${snapshot.economy.gold.balance} — Wear ${snapshot.pathWear.entries.length} Einträge — deterministische Serialisierung PASS — Restore/UI noch nicht eingeführt`;
    testEl.dataset.pass = pass ? 'true' : 'false';
  }

  window.CleanRuntime = Object.freeze({
    ...runtimeState,
    saveGameSnapshotEvidence: snapshot,
    saveGameSerializedEvidence: serialized,
  });

  console.info('[IM-13A] SaveGame Snapshot Contract', {
    build: runtimeState.config.build,
    pass,
    schemaVersion: snapshot.schemaVersion,
    worldId: snapshot.world.state.worldId,
    mapId: snapshot.map.mapId,
    domainNames: Object.keys(snapshot.domains),
    gold: snapshot.economy.gold.balance,
    wearEntries: snapshot.pathWear.entries.length,
    deterministicSerialization: serialized === serializedAgain,
    restoreNotIntroduced: true,
    storageUiNotIntroduced: true,
  });
});
