function requireComposition(value) {
  if (value?.kind !== 'active-runtime-composition' || !value.authoritative) throw new TypeError('active runtime composition required');
  return value;
}
function requireBuildingId(value) {
  if (typeof value !== 'string' || value.length === 0) throw new TypeError('buildingId required');
  return value;
}
function triggerKey(trigger, buildingId) { return `${trigger}|${buildingId}`; }

export class ActiveRuntimeProductionReEvaluationOrchestration {
  #runtime; #get; #cycleExecution; #pending = new Map(); #unsubscribe;

  constructor({ runtime, getComposition, cycleExecution } = {}) {
    if (!runtime?.scheduler || typeof runtime.scheduler.onCompletedStep !== 'function') throw new TypeError('Runtime Scheduler completed-step boundary required');
    if (typeof getComposition !== 'function') throw new TypeError('composition read seam required');
    if (!cycleExecution || typeof cycleExecution.handoff !== 'function') throw new TypeError('IM-26 cycle execution handoff required');
    this.#runtime = runtime;
    this.#get = getComposition;
    this.#cycleExecution = cycleExecution;
    this.#unsubscribe = runtime.scheduler.onCompletedStep(() => this.flush());
  }

  request({ trigger, buildingId } = {}) {
    if (!['DELIVERED_BUILDING_STOCK','SETTLED_PRODUCTION_OUTPUT'].includes(trigger)) throw new TypeError('authoritative IM-29 trigger required');
    const id = requireBuildingId(buildingId);
    const key = triggerKey(trigger, id);
    if (this.#pending.has(key)) {
      return Object.freeze({ kind:'im29-production-re-evaluation-request', status:'ALREADY_PENDING', trigger, buildingId:id, mutation:false });
    }
    this.#pending.set(key, Object.freeze({ trigger, buildingId:id }));
    return Object.freeze({ kind:'im29-production-re-evaluation-request', status:'PENDING', trigger, buildingId:id, mutation:false });
  }

  requestDeliveredSupply({ publication } = {}) {
    if (publication?.kind !== 'im24-delivered-supply-publication' || publication.status !== 'DELIVERED_TO_BUILDING_STOCK') {
      return Object.freeze({ kind:'im29-production-re-evaluation-request', status:'NOT_REQUESTED', trigger:'DELIVERED_BUILDING_STOCK', buildingId:null, mutation:false });
    }
    const buildingId = publication.settlement?.targetStock?.buildingId ?? publication.settlement?.reservation?.targetBuildingId ?? null;
    return this.request({ trigger:'DELIVERED_BUILDING_STOCK', buildingId });
  }

  requestSettledOutput({ composition } = {}) {
    const owners = requireComposition(composition).authoritative;
    const receipts = Array.isArray(owners.productionEffectReceipts) ? owners.productionEffectReceipts : [];
    const fences = new Set(Array.isArray(owners.productionSettlementIds) ? owners.productionSettlementIds : []);
    const requests = [];
    for (const receipt of receipts) {
      if (fences.has(receipt?.settlementId) && receipt?.buildingId) {
        requests.push(this.request({ trigger:'SETTLED_PRODUCTION_OUTPUT', buildingId:receipt.buildingId }));
      }
    }
    return Object.freeze(requests);
  }

  flush() {
    const pending = [...this.#pending.values()];
    this.#pending.clear();
    const composition = requireComposition(this.#get());
    const owners = composition.authoritative;
    const recipes = Array.isArray(owners.productionRecipes) ? owners.productionRecipes : [];
    const assignments = Array.isArray(owners.workforceAssignments) ? owners.workforceAssignments : [];
    const results = pending.map(request => {
      const recipe = recipes.find(value => value?.buildingId === request.buildingId) ?? null;
      const workforceAssignment = assignments.find(value => value?.buildingId === request.buildingId && value?.status === 'ASSIGNED') ?? null;
      if (!recipe || !workforceAssignment) {
        return Object.freeze({ kind:'im29-production-re-evaluation-result', status:'NOT_EVALUATED', reason:!recipe?'RECIPE_MISSING':'WORKFORCE_ASSIGNMENT_MISSING', ...request, handoff:null, mutation:false });
      }
      const handoff = this.#cycleExecution.handoff({ buildingId:request.buildingId, workforceAssignment, recipe });
      return Object.freeze({ kind:'im29-production-re-evaluation-result', status:'EVALUATED', reason:null, ...request, handoff, mutation:false });
    });
    return Object.freeze({ kind:'im29-production-re-evaluation-flush', status:'COMPLETED', results:Object.freeze(results), mutation:false });
  }

  pendingCount() { return this.#pending.size; }
  dispose() { this.#unsubscribe?.(); this.#unsubscribe = null; this.#pending.clear(); }
}
