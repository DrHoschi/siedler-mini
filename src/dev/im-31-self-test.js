import assert from 'node:assert/strict';
import { ProductionBuildingStockContract } from '../domain/production-building-stock-contract.js';
import { BuildingStockContract } from '../domain/building-stock-contract.js';
import { Runtime } from '../runtime/runtime.js';
import { RuntimeConfig } from '../runtime/config.js';
import { createBaselineMiniworldScenario } from '../diagnostics/baseline-miniworld-scenario.js';
import { ProductionCycleTimeContract as Time } from '../domain/production-cycle-time-contract.js';
import { ActiveRuntimeProductionCycleTimeProgression as Progression } from '../runtime/active-runtime-production-cycle-time-progression.js';
import { ActiveRuntimeProductionCycleExecutionOrchestration as IM26 } from '../runtime/active-runtime-production-cycle-execution-orchestration.js';
import { ActiveRuntimeProductionReEvaluationOrchestration as IM29 } from '../runtime/active-runtime-production-re-evaluation-orchestration.js';
import { RuntimeEconomyExecutionIntegration as IM22 } from '../runtime/runtime-economy-execution-integration.js';
import { PostIM13ActiveRuntimeCaptureAdapter as Capture } from '../savegame/post-im13-active-runtime-capture-adapter.js';
import { PostIM13AuthoritativeSnapshotIntegration as Snapshot } from '../savegame/post-im13-authoritative-snapshot-integration.js';
import { PostIM13SaveGameValidationContract as Validation } from '../savegame/post-im13-savegame-validation-contract.js';
import { PostIM13SaveGameRestoreIntegration as Restore } from '../savegame/post-im13-savegame-restore-integration.js';
import { PostIM13DerivedStateRebindingIntegration as Rebind } from '../savegame/post-im13-derived-state-rebinding-integration.js';
import { PostIM13BrowserSaveContinueLifecycle as Continue } from '../savegame/post-im13-browser-save-continue-lifecycle.js';
import { BrowserSaveGameStorageAdapter as Storage } from '../savegame/browser-savegame-storage-adapter.js';
import { PlayerNewGameLifecycle as NewGame } from '../runtime/player-new-game-lifecycle.js';

let miniworldSnapshot = null;
function timingMiniworld() {
  if (!miniworldSnapshot) {
    // The existing IM-24 Miniworld has a World/Domain mirrored building ID that the
    // frozen SaveGame validator rejects. Keep that predecessor defect out of this fixture.
    const baseline = createBaselineMiniworldScenario({ includeSaveContinuity: true });
    const owners = baseline.authoritative, buildingId = owners.workforceBindings[0].buildingId;
    const boards = owners.resourceState.createDefinition({ technicalName: 'boards', label: 'Boards' });
    const recipe = ProductionBuildingStockContract.define({ buildingId,
      inputs: [{ resourceTypeId: 'resource-type:00000001', quantity: 3 }], outputs: [{ resourceTypeId: boards.id, quantity: 1 }] });
    const composition = { ...baseline, authoritative: { ...owners, productionRecipes: [recipe],
      productionCycleTimes: Time.definitions([{ buildingId, durationMs: 1000 }]), productionCycleProgressions: [],
      buildingStocks: [BuildingStockContract.define({ buildingId, resourceTypeId: 'resource-type:00000001', quantity: 6 }),
        BuildingStockContract.define({ buildingId, resourceTypeId: boards.id, quantity: 0 })] } };
    miniworldSnapshot = Capture.capture(composition, 0);
  }
  const restored = Restore.restore(miniworldSnapshot);
  assert.equal(restored.status, 'RESTORED');
  const state = restored.runtimeState;
  return Object.freeze({ kind: 'active-runtime-composition', authoritative: Object.freeze({ ...state,
    productionSettlementIds: Object.freeze([...state.productionSettlementIds]), goldSettlementIds: Object.freeze([...state.goldSettlementIds]) }) });
}

function fixture({ durationMs = 1000, quantity = 6, successor = false } = {}) {
  let composition = timingMiniworld();
  const buildingId = composition.authoritative.productionRecipes[0].buildingId;
  const runtime = new Runtime(RuntimeConfig); runtime.boot();
  const publish = value => { composition = value; };
  const change = updates => publish(Object.freeze({ ...composition, authoritative: Object.freeze({ ...composition.authoritative, ...updates }) }));
  change({ productionCycleTimes: Time.definitions([{ buildingId, durationMs }]), buildingStocks: Object.freeze(composition.authoritative.buildingStocks.map(s => Object.freeze({ ...s, quantity: s.buildingId === buildingId && s.resourceTypeId === 'resource-type:00000001' ? quantity : s.quantity }))) });
  let reEvaluation = null;
  const progression = new Progression({ runtime, getComposition: () => composition, publishComposition: publish,
    publishSettledComposition: value => { publish(value); if (successor) reEvaluation?.requestSettledOutput({ composition: value }); } });
  const im26 = new IM26({ runtime, getComposition: () => composition, publishComposition: publish, progression });
  reEvaluation = new IM29({ runtime, getComposition: () => composition, cycleExecution: im26, resolveProductionContext: (id, c) => progression.resolve(id, c) });
  // Deterministic direct steps, without adding a test timer/clock. Runtime owns state transitions.
  runtime.scheduler.start = () => true;
  runtime.start();
  const handoff = () => im26.handoff({ buildingId });
  const capture = () => Capture.capture(composition, runtime.scheduler.completedStepIndex);
  return { runtime, buildingId, progression, im26, reEvaluation, handoff, change, publish, capture,
    get composition() { return composition; }, get active() { return composition.authoritative.productionCycleProgressions[0] ?? null; },
    close() { progression.dispose(); reEvaluation.dispose(); runtime.pause(); } };
}
function check(results, name, fn) {
  try { fn(); results.push(Object.freeze({ name, pass: true })); }
  catch (error) { results.push(Object.freeze({ name, pass: false, error: String(error.message) })); }
}
function memoryStorage() {
  const values = new Map();
  return new Storage({ storage: { getItem: k => values.get(k) ?? null, setItem: (k, v) => values.set(k, v), removeItem: k => values.delete(k) } });
}
function lifecycle(f, storage, overrides = {}) {
  return new Continue({ storage, runtime: f.runtime, getComposition: () => f.composition, publishComposition: f.publish,
    prepareProductionActivation: c => f.im26.prepareActivation(c), ...overrides });
}

export function runIM31SelfTest() {
  const results = [];
  check(results, 'explicit-duration-zero-start-current-workforce-and-duplicate-boundary', () => {
    const f = fixture(); try {
      const first = f.handoff(), duplicate = f.handoff();
      assert.equal(first.status, 'REGISTERED'); assert.equal(first.cycleId, 'im25-cycle-00000001');
      assert.equal(f.active.elapsedMs, 0); assert.equal(f.active.requiredDurationMs, 1000);
      assert.equal(f.active.assignmentId, f.composition.authoritative.workforceBindings[0].assignmentId);
      assert.equal(duplicate.status, 'ALREADY_REGISTERED'); assert.equal(first.registration, duplicate.registration);
      assert.equal(f.runtime.scheduler.systemCount(), 1);
    } finally { f.close(); }
  });
  check(results, 'no-settlement-or-output-before-duration-same-identity-at-completion', () => {
    const f = fixture(); try {
      const r = f.handoff().registration, before = JSON.stringify(f.composition.authoritative.buildingStocks);
      f.runtime.scheduler.step(999); assert.equal(f.active.elapsedMs, 999);
      assert.equal(JSON.stringify(f.composition.authoritative.buildingStocks), before);
      assert.equal(f.composition.authoritative.productionEffectReceipts.length, 0);
      assert.equal(f.composition.authoritative.productionSettlementIds.length, 0);
      f.runtime.scheduler.step(1); assert.equal(r.result().status, 'SETTLED'); assert.equal(f.active, null);
      assert.equal(r.result().cycleId, 'im25-cycle-00000001'); assert.equal(f.composition.authoritative.productionEffectReceipts.length, 1);
      f.runtime.scheduler.step(9000); assert.equal(f.composition.authoritative.productionEffectReceipts.length, 1);
    } finally { f.close(); }
  });
  check(results, 'equal-elapsed-time-across-step-partitions-and-clamped-boundary', () => {
    const a = fixture(), b = fixture(); try {
      a.handoff(); b.handoff(); for (const dt of [100, 200, 300]) a.runtime.scheduler.step(dt); b.runtime.scheduler.step(600);
      assert.deepEqual(a.active, b.active); assert.equal(Time.ratio(a.active), 0.6);
      a.runtime.scheduler.step(400); b.runtime.scheduler.step(10000);
      assert.deepEqual(a.composition.authoritative.productionEffectReceipts, b.composition.authoritative.productionEffectReceipts);
    } finally { a.close(); b.close(); }
  });
  check(results, 'pause-and-resume-preserve-exact-elapsed-time', () => {
    const f = fixture(); try { f.handoff(); f.runtime.scheduler.step(200); f.runtime.pause(); f.runtime.scheduler.step(500); assert.equal(f.active.elapsedMs, 200); f.runtime.start(); f.runtime.scheduler.step(100); assert.equal(f.active.elapsedMs, 300); } finally { f.close(); }
  });
  check(results, 'invalid-dt-duration-and-overflow-fail-closed', () => {
    for (const durationMs of [0, -1, NaN, Infinity, 1.5]) assert.throws(() => Time.definition({ buildingId: 'building:00000001', durationMs }));
    const f = fixture(); try { f.handoff(); const before = JSON.stringify(f.active); for (const dt of [-1, NaN, Infinity, 0.5]) assert.throws(() => f.runtime.scheduler.step(dt)); assert.equal(JSON.stringify(f.active), before); f.runtime.scheduler.step(0); assert.equal(JSON.stringify(f.active), before); } finally { f.close(); }
  });
  check(results, 'missing-duration-does-not-fall-back-to-instant-production', () => {
    const f = fixture(); try { f.change({ productionCycleTimes: [] }); assert.throws(() => f.handoff()); assert.equal(f.active, null); assert.equal(f.runtime.scheduler.systemCount(), 0); } finally { f.close(); }
  });
  check(results, 'current-input-readiness-stops-time-without-settlement', () => {
    const f = fixture(); try { f.handoff(); f.runtime.scheduler.step(200); const stocks = f.composition.authoritative.buildingStocks;
      f.change({ buildingStocks: stocks.map(s => s.buildingId === f.buildingId && s.resourceTypeId === 'resource-type:00000001' ? Object.freeze({ ...s, quantity: 0 }) : s) });
      f.runtime.scheduler.step(900); assert.equal(f.active.elapsedMs, 200); assert.equal(f.composition.authoritative.productionEffectReceipts.length, 0);
      f.change({ buildingStocks: stocks }); f.runtime.scheduler.step(300); assert.equal(f.active.elapsedMs, 500);
    } finally { f.close(); }
  });
  check(results, 'stale-assignment-does-not-advance-or-settle', () => {
    const f = fixture(); try { f.handoff(); const bindings = f.composition.authoritative.workforceBindings; f.change({ workforceBindings: [] }); f.runtime.scheduler.step(1000); assert.equal(f.active.elapsedMs, 0); assert.equal(f.composition.authoritative.productionSettlementIds.length, 0); f.change({ workforceBindings: bindings }); f.runtime.scheduler.step(300); assert.equal(f.active.elapsedMs, 300); } finally { f.close(); }
  });
  check(results, 'retired-building-stops-time-without-using-captured-readiness', () => {
    const f = fixture(); try { f.handoff(); f.composition.authoritative.domains.buildings.update(f.buildingId, draft => { draft.lifecycle.state = 'RETIRED'; }); f.runtime.scheduler.step(1000); assert.equal(f.active.elapsedMs, 0); assert.equal(f.composition.authoritative.productionSettlementIds.length, 0); } finally { f.close(); }
  });
  check(results, 'duration-is-captured-immutably-for-the-concrete-cycle', () => {
    const f = fixture(); try { f.handoff(); f.change({ productionCycleTimes: Time.definitions([{ buildingId: f.buildingId, durationMs: 5000 }]) }); f.runtime.scheduler.step(500); assert.equal(f.active.requiredDurationMs, 1000); f.runtime.scheduler.step(500); assert.equal(f.active, null); } finally { f.close(); }
  });
  check(results, 'time-complete-blocked-cycle-retries-without-repeating-duration', () => {
    const f = fixture(); let block = true;
    // Registered ahead of the one-shot added at the completion boundary.
    const off = f.runtime.scheduler.register({ id: 'test-completion-window', phase: 'economy', tick: () => {
      if (block && f.active?.elapsedMs === 1000) f.change({ buildingStocks: f.composition.authoritative.buildingStocks.map(s => s.buildingId === f.buildingId && s.resourceTypeId === 'resource-type:00000001' ? Object.freeze({ ...s, quantity: 0 }) : s) });
    } });
    // Reinsert after progression registration, so completion occurs before this mutation.
    off(); f.handoff();
    const off2 = f.runtime.scheduler.register({ id: 'test-completion-window', phase: 'economy', tick: () => {
      if (block && f.active?.elapsedMs === 1000) f.change({ buildingStocks: f.composition.authoritative.buildingStocks.map(s => s.buildingId === f.buildingId && s.resourceTypeId === 'resource-type:00000001' ? Object.freeze({ ...s, quantity: 0 }) : s) });
    } });
    try { f.runtime.scheduler.step(1000); assert.equal(f.active.elapsedMs, 1000); assert.equal(f.composition.authoritative.productionEffectReceipts.length, 0);
      const id = f.active.cycleId; block = false;
      f.change({ buildingStocks: f.composition.authoritative.buildingStocks.map(s => s.buildingId === f.buildingId && s.resourceTypeId === 'resource-type:00000001' ? Object.freeze({ ...s, quantity: 3 }) : s) });
      f.runtime.scheduler.step(0); assert.equal(f.active, null); assert.equal(f.composition.authoritative.productionEffectReceipts[0].settlementId, `production-settlement:im22:${f.buildingId}:${id}`);
    } finally { off2(); f.close(); }
  });
  check(results, 'settlement-only-trigger-admits-successor-at-zero', () => {
    const f = fixture({ successor: true }); try { f.handoff(); f.runtime.scheduler.step(500); assert.equal(f.reEvaluation.pendingCount(), 0); f.runtime.scheduler.step(500); assert.equal(f.active.cycleId, 'im25-cycle-00000002'); assert.equal(f.active.elapsedMs, 0); assert.equal(f.composition.authoritative.productionEffectReceipts.length, 1); } finally { f.close(); }
  });
  check(results, 'scheduler-step-alone-does-not-admit-production', () => {
    const f = fixture(); try { f.runtime.scheduler.step(1000); assert.equal(f.active, null); assert.equal(f.runtime.scheduler.systemCount(), 0); } finally { f.close(); }
  });
  check(results, 'direct-im22-entry-cannot-bypass-timed-production', () => {
    const f = fixture(); try { assert.throws(() => IM22.installOneShotProductionCycle({ runtime: f.runtime, getComposition: () => f.composition, publishComposition: f.publish, buildingId: f.buildingId, cycleId: 'im25-cycle-00000001' })); assert.equal(f.runtime.scheduler.systemCount(), 0); } finally { f.close(); }
  });
  check(results, 'capture-restore-rebind-capture-exact-progress-roundtrip', () => {
    const f = fixture(); try { f.handoff(); f.runtime.scheduler.step(400); const snapshot = f.capture(); assert.equal(Validation.validate(snapshot).status, 'VALID');
      const restored = Restore.restore(snapshot); assert.equal(restored.status, 'RESTORED');
      const rebound = Rebind.rebind(restored); assert.equal(rebound.status, 'REBOUND');
      assert.equal(rebound.derivedState.scheduler.registrations.filter(d => d.kind === 'post-continue-production-registration-descriptor').length, 1);
      const state = restored.runtimeState;
      const c = { kind: 'active-runtime-composition', authoritative: { ...state, productionSettlementIds: [...state.productionSettlementIds], goldSettlementIds: [...state.goldSettlementIds] } };
      assert.equal(Snapshot.serialize(Capture.capture(c, snapshot.capture.stepIndex)), Snapshot.serialize(snapshot));
    } finally { f.close(); }
  });
  check(results, 'real-storage-continue-preserves-time-and-replaces-old-registration', () => {
    const f = fixture(), storage = memoryStorage(); try { f.handoff(); f.runtime.scheduler.step(400); storage.write(Snapshot.serialize(f.capture())); f.runtime.pause();
      const continued = lifecycle(f, storage).continueFromStorage(); assert.equal(continued.status, 'CONTINUED'); assert.equal(f.active.elapsedMs, 400);
      assert.equal(f.runtime.scheduler.has(`im31-production-progress:${f.buildingId}|${f.active.cycleId}`), true);
      assert.equal(f.handoff().status, 'ALREADY_REGISTERED'); f.runtime.scheduler.step(600); assert.equal(f.active, null); assert.equal(f.composition.authoritative.productionEffectReceipts.length, 1);
    } finally { f.close(); }
  });
  check(results, 'time-complete-unsettled-save-restores-without-offline-time', () => {
    const f = fixture(), storage = memoryStorage(); try { f.handoff(); f.change({ productionCycleProgressions: f.composition.authoritative.productionCycleProgressions.map(p => Time.progression({ ...p, elapsedMs: p.requiredDurationMs })) }); storage.write(Snapshot.serialize(f.capture())); f.runtime.pause(); const continued = lifecycle(f, storage).continueFromStorage(); assert.equal(continued.status, 'CONTINUED'); assert.equal(f.active.elapsedMs, 1000); f.runtime.scheduler.step(0); assert.equal(f.active, null); } finally { f.close(); }
  });
  check(results, 'invalid-persistence-identities-times-and-settlement-evidence-rejected', () => {
    const f = fixture(); try { f.handoff(); const valid = f.capture(); const p = valid.authoritative.productionCycleProgressions[0];
      for (const patch of [{ elapsedMs: -1 }, { elapsedMs: 1001 }, { requiredDurationMs: 0 }, { cycleId: 'im25-cycle-00000002' }, { assignmentId: 'assignment:00000009' }]) {
        const s = structuredClone(valid); s.authoritative.productionCycleProgressions[0] = { ...p, ...patch }; assert.equal(Restore.restore(s).status, 'REJECTED');
      }
      const duplicate = structuredClone(valid); duplicate.authoritative.productionCycleProgressions.push(p); assert.equal(Validation.validate(duplicate).status, 'INVALID');
      const partial = structuredClone(valid); delete partial.authoritative.definitions.productionCycleTimes; assert.equal(Validation.validate(partial).status, 'INVALID');
      f.runtime.scheduler.step(1000); const settled = f.capture(); assert.equal(settled.authoritative.productionCycleProgressions.length, 0); const contradiction = structuredClone(settled); contradiction.authoritative.productionCycleProgressions.push(p); assert.equal(Restore.restore(contradiction).status, 'REJECTED');
    } finally { f.close(); }
  });
  check(results, 'failed-activation-restores-previous-production-state-and-registration', () => {
    const f = fixture(), storage = memoryStorage(); try { f.handoff(); f.runtime.scheduler.step(300); const before = f.composition; storage.write(Snapshot.serialize(f.capture())); f.runtime.pause();
      const result = lifecycle(f, storage, { resetCamera: () => { throw new Error('injected activation failure'); } }).continueFromStorage();
      assert.equal(result.status, 'REJECTED'); assert.equal(f.composition, before); assert.equal(f.active.elapsedMs, 300); assert.equal(f.runtime.state, 'PAUSED');
      f.runtime.start(); f.runtime.scheduler.step(700); assert.equal(f.active, null);
    } finally { f.close(); }
  });
  check(results, 'new-game-retires-old-cycle-and-installs-no-old-progress', () => {
    const f = fixture(); try { f.handoff(); f.runtime.scheduler.step(300); f.runtime.pause();
      const next = new NewGame({ runtime: f.runtime, createComposition: timingMiniworld, publishComposition: f.publish, prepareProductionActivation: c => f.im26.prepareActivation(c) });
      assert.equal(next.startFresh().status, 'STARTED'); assert.equal(f.active, null); assert.equal(f.runtime.scheduler.systemCount(), 0); f.runtime.scheduler.step(1000); assert.equal(f.composition.authoritative.productionEffectReceipts.length, 0);
    } finally { f.close(); }
  });
  check(results, 'missing-worker-record-stops-current-production', () => {
    const f = fixture(); try { f.handoff(); f.composition.authoritative.domains.units.remove('unit:00000001'); f.runtime.scheduler.step(1000); assert.equal(f.active.elapsedMs, 0); assert.equal(f.composition.authoritative.productionEffectReceipts.length, 0); } finally { f.close(); }
  });
  check(results, 'running-save-captures-only-completed-step-progress', () => {
    const f = fixture(), storage = memoryStorage(); try { f.handoff(); const saving = lifecycle(f, storage).save(); assert.equal(storage.read(), null); f.runtime.scheduler.step(400);
      const saved = JSON.parse(storage.read()); assert.equal(saved.capture.stepIndex, 1); assert.equal(saved.authoritative.productionCycleProgressions[0].elapsedMs, 400); assert.equal(saving instanceof Promise, true);
    } finally { f.close(); }
  });
  check(results, 'failed-new-game-restores-old-cycle-and-owned-registration', () => {
    const f = fixture(); try { f.handoff(); f.runtime.scheduler.step(300); f.runtime.pause(); const previous = f.composition;
      const next = new NewGame({ runtime: f.runtime, createComposition: timingMiniworld, publishComposition: f.publish, prepareProductionActivation: c => f.im26.prepareActivation(c), resetCamera: () => { throw new Error('injected new-game failure'); } });
      assert.throws(() => next.startFresh()); assert.equal(f.composition, previous); assert.equal(f.active.elapsedMs, 300); f.runtime.start(); f.runtime.scheduler.step(700); assert.equal(f.active, null);
    } finally { f.close(); }
  });
  check(results, 'legacy-v2-without-timing-keeps-canonical-shape', () => {
    const composition = createBaselineMiniworldScenario({ includeSaveContinuity: true }); const original = Capture.capture(composition, 0);
    assert.equal(Object.hasOwn(original.authoritative, 'productionCycleProgressions'), false); assert.equal(Validation.validate(original).status, 'VALID');
    const restored = Restore.restore(original); assert.equal(restored.status, 'RESTORED'); const state = restored.runtimeState;
    const c = { kind: 'active-runtime-composition', authoritative: { ...state, productionSettlementIds: [...state.productionSettlementIds], goldSettlementIds: [...state.goldSettlementIds] } };
    assert.equal(Snapshot.serialize(Capture.capture(c, 0)), Snapshot.serialize(original));
  });
  const blockerCount = results.filter(r => !r.pass).length;
  return Object.freeze({ status: blockerCount ? 'FAIL' : 'PASS', blockerCount, results: Object.freeze(results) });
}
