import { OperationalBuildingProductionRecipeIntegration } from '../domain/operational-building-production-recipe-integration.js';
import { DeterministicProductionCycleAdmission } from '../domain/deterministic-production-cycle-admission.js';
import { RuntimeEconomyExecutionIntegration } from './runtime-economy-execution-integration.js';

function requireComposition(value) {
  if (value?.kind !== 'active-runtime-composition' || !value.authoritative) throw new TypeError('active runtime composition required');
  return value;
}
function requireArray(value, label) {
  if (!Array.isArray(value)) throw new TypeError(`${label} array required`);
  return value;
}
function key(buildingId, cycleId) { return `${buildingId}|${cycleId}`; }

export class ActiveRuntimeProductionCycleExecutionOrchestration {
  #runtime; #get; #publish; #active = new Map();

  constructor({ runtime, getComposition, publishComposition } = {}) {
    if (!runtime?.scheduler || typeof runtime.scheduler.register !== 'function') throw new TypeError('Runtime Scheduler required');
    if (typeof getComposition !== 'function' || typeof publishComposition !== 'function') throw new TypeError('composition read/publish seam required');
    this.#runtime = runtime;
    this.#get = getComposition;
    this.#publish = publishComposition;
  }

  handoff({ buildingId, workforceAssignment, recipe } = {}) {
    const composition = requireComposition(this.#get());
    const owners = composition.authoritative;
    const productionIntegration = OperationalBuildingProductionRecipeIntegration.integrate({ workforceAssignment, recipe });
    if (productionIntegration.buildingId !== buildingId) throw new Error('IM-26 production building mismatch');

    const admission = DeterministicProductionCycleAdmission.evaluate({
      productionIntegration,
      stocks: requireArray(owners.buildingStocks, 'buildingStocks').filter(value => value.buildingId === buildingId),
      productionSettlementIds: requireArray(owners.productionSettlementIds, 'productionSettlementIds'),
      productionEffectReceipts: requireArray(owners.productionEffectReceipts, 'productionEffectReceipts'),
    });
    if (admission.status !== 'ADMITTED') {
      return Object.freeze({
        kind: 'im26-active-runtime-production-cycle-handoff',
        status: 'NOT_REGISTERED',
        reason: admission.reason,
        buildingId,
        cycleId: null,
        admission,
        registration: null,
        duplicatePrevented: false,
        mutation: false,
      });
    }

    const registrationKey = key(admission.buildingId, admission.cycleId);
    const existing = this.#active.get(registrationKey);
    if (existing && existing.result() == null) {
      return Object.freeze({
        kind: 'im26-active-runtime-production-cycle-handoff',
        status: 'ALREADY_REGISTERED',
        reason: null,
        buildingId: admission.buildingId,
        cycleId: admission.cycleId,
        admission,
        registration: existing,
        duplicatePrevented: true,
        mutation: false,
      });
    }
    if (existing) this.#active.delete(registrationKey);

    const registration = RuntimeEconomyExecutionIntegration.installOneShotProductionCycle({
      runtime: this.#runtime,
      getComposition: this.#get,
      publishComposition: this.#publish,
      cycleId: admission.cycleId,
      buildingId: admission.buildingId,
      workforceAssignment,
      recipe,
    });
    this.#active.set(registrationKey, registration);
    return Object.freeze({
      kind: 'im26-active-runtime-production-cycle-handoff',
      status: 'REGISTERED',
      reason: null,
      buildingId: admission.buildingId,
      cycleId: admission.cycleId,
      admission,
      registration,
      duplicatePrevented: false,
      mutation: false,
    });
  }

  activeRegistration({ buildingId, cycleId } = {}) {
    const registration = this.#active.get(key(buildingId, cycleId)) ?? null;
    return registration?.result() == null ? registration : null;
  }
}
