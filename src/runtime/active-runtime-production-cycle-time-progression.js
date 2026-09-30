import { ProductionCycleTimeContract as Time } from '../domain/production-cycle-time-contract.js';
import { PostIM13DerivedStateRebindingIntegration as Rebinding } from '../savegame/post-im13-derived-state-rebinding-integration.js';
import { RuntimeEconomyExecutionIntegration } from './runtime-economy-execution-integration.js';

const key = p => `${p.buildingId}|${p.cycleId}`;
export class ActiveRuntimeProductionCycleTimeProgression {
  #runtime; #get; #publish; #settlePublish; #registrations = new Map();
  constructor({ runtime, getComposition, publishComposition, publishSettledComposition } = {}) {
    if (!runtime?.scheduler || typeof getComposition !== 'function' || typeof publishComposition !== 'function' || typeof publishSettledComposition !== 'function') throw new TypeError('IM-31 runtime composition dependencies required');
    this.#runtime = runtime; this.#get = getComposition; this.#publish = publishComposition; this.#settlePublish = publishSettledComposition;
  }
  resolve(buildingId, composition = this.#get()) {
    try { return Rebinding.productionContext(composition.authoritative, buildingId); } catch { return null; }
  }
  #replace(composition, values) {
    return Object.freeze({ ...composition, authoritative: Object.freeze({ ...composition.authoritative, productionCycleProgressions: Time.progressions(values) }) });
  }
  install({ admission }) {
    const composition = this.#get(), owners = composition.authoritative;
    const definition = Time.definitions(owners.productionCycleTimes).find(d => d.buildingId === admission.buildingId);
    if (!definition) throw new Error('explicit production cycle duration required');
    const context = this.resolve(admission.buildingId, composition);
    if (!context || context.execution.status !== 'READY') throw new Error('current production prerequisites required');
    const active = Time.progressions(owners.productionCycleProgressions);
    let p = active.find(v => v.buildingId === admission.buildingId);
    if (p && p.cycleId !== admission.cycleId) throw new Error('parallel production cycle forbidden');
    if (!p) p = Time.progression({ ...admission, assignmentId: context.workforceAssignment.assignmentId, requiredDurationMs: definition.durationMs });
    if (p.assignmentId !== context.workforceAssignment.assignmentId) throw new Error('production workforce identity mismatch');
    if (this.#registrations.has(key(p))) return this.#registrations.get(key(p));
    const registration = this.#register(p);
    try { if (!active.some(v => key(v) === key(p))) this.#publish(this.#replace(composition, [...active, p])); }
    catch (error) { registration.cancel(); this.#registrations.delete(key(p)); throw error; }
    return registration;
  }
  #register(initial) {
    let result = null, execution = null, cancelled = false;
    const schedulerId = `im31-production-progress:${key(initial)}`;
    const off = this.#runtime.scheduler.register({ id: schedulerId, phase: 'economy', tick: dtMs => {
      if (cancelled || result) return result;
      // Runtime pause also protects explicit/manual Scheduler.step calls.
      if (this.#runtime.state !== 'RUNNING') return null;
      const composition = this.#get(), owners = composition.authoritative;
      const p = owners.productionCycleProgressions?.find(v => key(v) === key(initial));
      if (!p) { registration.cancel(); return null; }
      if (p.assignmentId !== initial.assignmentId || p.requiredDurationMs !== initial.requiredDurationMs) throw new Error('active cycle immutable binding or duration changed');
      const settlementId = Time.settlementId(p);
      const fence = owners.productionSettlementIds.includes(settlementId);
      const receipt = owners.productionEffectReceipts.some(r => r.settlementId === settlementId && r.buildingId === p.buildingId);
      if (fence || receipt) {
        if (!(fence && receipt)) throw new Error('contradictory IM-31 settlement evidence');
        this.#publish(this.#replace(composition, owners.productionCycleProgressions.filter(v => key(v) !== key(p))));
        result = Object.freeze({ kind: 'im22-runtime-economy-cycle-result', status: 'ALREADY_SETTLED', buildingId: p.buildingId, cycleId: p.cycleId, settlementId, mutation: false });
        off(); this.#registrations.delete(key(p)); return result;
      }
      const next = Time.advance(p, dtMs);
      const context = this.resolve(p.buildingId, composition);
      if (!context || context.workforceAssignment.assignmentId !== p.assignmentId || context.execution.status !== 'READY') return null;
      if (next.elapsedMs !== p.elapsedMs) this.#publish(this.#replace(composition, owners.productionCycleProgressions.map(v => key(v) === key(p) ? next : v)));
      if (next.elapsedMs < next.requiredDurationMs || (execution && execution.result() == null)) return null;
      // BLOCKED_INPUT is terminal for the IM-22 attempt, never for accumulated cycle time.
      execution = RuntimeEconomyExecutionIntegration.installOneShotProductionCycle({
        runtime: this.#runtime, getComposition: this.#get,
        publishComposition: value => {
          const clean = this.#replace(value, value.authoritative.productionCycleProgressions.filter(v => key(v) !== key(p)));
          this.#settlePublish(clean);
        },
        cycleId: p.cycleId, buildingId: p.buildingId, workforceAssignment: context.workforceAssignment, recipe: context.recipe,
        resolveProductionContext: () => {
          const current = this.resolve(p.buildingId);
          return current?.workforceAssignment.assignmentId === p.assignmentId ? current : null;
        },
        onResult: value => {
          if (['SETTLED', 'ALREADY_SETTLED'].includes(value.status)) { result = value; off(); this.#registrations.delete(key(p)); }
        },
      });
      return null;
    } });
    const registration = Object.freeze({ kind: 'im31-production-cycle-registration', schedulerId, phase: 'economy',
      buildingId: initial.buildingId, cycleId: initial.cycleId, settlementId: Time.settlementId(initial), result: () => result,
      cancel: () => { if (cancelled) return false; cancelled = true; off(); execution?.cancel(); return true; } });
    this.#registrations.set(key(initial), registration);
    return registration;
  }
  prepareActivation(composition) {
    const owners = composition.authoritative;
    const values = owners.productionCycleProgressions ?? [];
    if (owners.productionCycleTimes != null || owners.productionCycleProgressions != null) Time.validate({
      times: owners.productionCycleTimes, progressions: owners.productionCycleProgressions, recipes: owners.productionRecipes,
      buildings: new Set(owners.domains.buildings.ids()), workforceBindings: owners.workforceBindings,
      productionSettlementIds: [...owners.productionSettlementIds], productionEffectReceipts: owners.productionEffectReceipts,
    });
    const previousComposition = this.#get();
    const previous = previousComposition.authoritative.productionCycleProgressions ?? [];
    this.dispose();
    const restore = () => { this.dispose(); for (const p of previous) this.#register(Time.progression(p)); };
    try { for (const p of values) this.#register(Time.progression(p)); }
    catch (error) { restore(); throw error; }
    return Object.freeze({ commit: () => {}, rollback: () => { restore(); this.#publish(previousComposition); } });
  }
  activeRegistration({ buildingId, cycleId }) {
    const r = this.#registrations.get(key({ buildingId, cycleId }));
    return r?.result() == null ? r ?? null : null;
  }
  dispose() { for (const r of this.#registrations.values()) r.cancel(); this.#registrations.clear(); }
}
