import { Runtime } from '../runtime/runtime.js';
import { ActiveRuntimeProductionCycleExecutionOrchestration } from '../runtime/active-runtime-production-cycle-execution-orchestration.js';

function fixture({ inputQuantity = 3 } = {}) {
  const buildingId = 'building:00000001';
  const workforceAssignment = Object.freeze({ kind: 'operational-building-workforce-assignment', status: 'ASSIGNED', buildingId });
  const recipe = Object.freeze({
    kind: 'production-building-stock', buildingId,
    inputs: Object.freeze([{ resourceTypeId: 'resource-type:00000001', quantity: 3 }]),
    outputs: Object.freeze([{ resourceTypeId: 'resource-type:00000002', quantity: 2 }]),
  });
  let composition = Object.freeze({ kind: 'active-runtime-composition', authoritative: Object.freeze({
    buildingStocks: Object.freeze([
      Object.freeze({ kind: 'building-stock', buildingId, resourceTypeId: 'resource-type:00000001', quantity: inputQuantity }),
      Object.freeze({ kind: 'building-stock', buildingId, resourceTypeId: 'resource-type:00000002', quantity: 1 }),
    ]),
    productionSettlementIds: Object.freeze([]),
    productionEffectReceipts: Object.freeze([]),
  }) });
  const makeRuntime = () => {
    const runtime = new Runtime({ simulation: { phases: ['input','world','demand','assignment','intent','movement','work','economy','recovery','events','maintenance'], fixedStepMs: 100 } });
    runtime.boot();
    return runtime;
  };
  const makeOrchestration = runtime => new ActiveRuntimeProductionCycleExecutionOrchestration({
    runtime, getComposition: () => composition, publishComposition: value => { composition = value; },
  });
  const runtime = makeRuntime();
  return { buildingId, workforceAssignment, recipe, runtime, makeRuntime, makeOrchestration, get composition(){ return composition; } };
}
function check(name, fn, results) { try { results.push(Object.freeze({ name, pass: !!fn() })); } catch (error) { results.push(Object.freeze({ name, pass: false, error: String(error?.message || error) })); } }

export function runIM26SelfTest() {
  const results = [];
  check('ready-admission-hands-off-exactly-one-im22-registration', () => {
    const f = fixture(), o = f.makeOrchestration(f.runtime);
    const first = o.handoff(f), second = o.handoff(f);
    return first.status === 'REGISTERED' && first.cycleId === 'im25-cycle-00000001' &&
      second.status === 'ALREADY_REGISTERED' && second.registration === first.registration &&
      second.duplicatePrevented && f.runtime.scheduler.systemCount() === 1;
  }, results);
  check('blocked-input-creates-no-registration', () => {
    const f = fixture({ inputQuantity: 2 }), o = f.makeOrchestration(f.runtime);
    const result = o.handoff(f);
    return result.status === 'NOT_REGISTERED' && result.reason === 'BLOCKED_INPUT' &&
      result.registration === null && f.runtime.scheduler.systemCount() === 0;
  }, results);
  check('im22-settlement-closes-cycle-and-next-handoff-uses-distinct-cycle', () => {
    const f = fixture(), o = f.makeOrchestration(f.runtime);
    const first = o.handoff(f); f.runtime.scheduler.step();
    const owners = f.composition.authoritative, receipt = owners.productionEffectReceipts[0];
    const firstSettled = first.registration.result()?.status === 'SETTLED' &&
      owners.productionSettlementIds[0] === first.registration.settlementId &&
      receipt?.settlementId === first.registration.settlementId;
    const next = o.handoff(f);
    return firstSettled && next.status === 'NOT_REGISTERED' && next.reason === 'BLOCKED_INPUT' &&
      f.runtime.scheduler.systemCount() === 0;
  }, results);
  check('settled-ready-state-admits-distinct-successor-without-replay', () => {
    const f = fixture(), o = f.makeOrchestration(f.runtime);
    const first = o.handoff(f); f.runtime.scheduler.step();
    const settled = f.composition.authoritative;
    const replenishedStocks = Object.freeze(settled.buildingStocks.map(stock =>
      stock.resourceTypeId === 'resource-type:00000001' ? Object.freeze({ ...stock, quantity: 3 }) : stock));
    const restoredComposition = Object.freeze({ ...f.composition, authoritative: Object.freeze({ ...settled, buildingStocks: replenishedStocks }) });
    const runtime2 = f.makeRuntime();
    const o2 = new ActiveRuntimeProductionCycleExecutionOrchestration({ runtime: runtime2, getComposition: () => restoredComposition, publishComposition: () => { throw new Error('must not execute during handoff'); } });
    const next = o2.handoff(f);
    return first.cycleId === 'im25-cycle-00000001' && next.status === 'REGISTERED' &&
      next.cycleId === 'im25-cycle-00000002' && runtime2.scheduler.systemCount() === 1;
  }, results);
  check('reconstructed-runtime-reuses-same-unsettled-cycle-once', () => {
    const f = fixture(), o1 = f.makeOrchestration(f.runtime), first = o1.handoff(f);
    const runtime2 = f.makeRuntime(), o2 = f.makeOrchestration(runtime2);
    const restoredFirst = o2.handoff(f), restoredSecond = o2.handoff(f);
    return first.cycleId === restoredFirst.cycleId && restoredFirst.status === 'REGISTERED' &&
      restoredSecond.status === 'ALREADY_REGISTERED' && runtime2.scheduler.systemCount() === 1;
  }, results);
  check('im26-does-not-mutate-authoritative-state-during-handoff', () => {
    const f = fixture(), before = JSON.stringify(f.composition.authoritative), o = f.makeOrchestration(f.runtime);
    const result = o.handoff(f);
    return result.status === 'REGISTERED' && result.mutation === false &&
      JSON.stringify(f.composition.authoritative) === before;
  }, results);
  check('im26-does-not-own-production-or-savegame-authority', () =>
    typeof ActiveRuntimeProductionCycleExecutionOrchestration.prototype.settle === 'undefined' &&
    typeof ActiveRuntimeProductionCycleExecutionOrchestration.prototype.save === 'undefined' &&
    typeof ActiveRuntimeProductionCycleExecutionOrchestration.prototype.restore === 'undefined', results);

  const blockerCount = results.filter(value => !value.pass).length;
  return Object.freeze({ status: blockerCount === 0 ? 'PASS' : 'FAIL', blockerCount, results: Object.freeze(results) });
}
