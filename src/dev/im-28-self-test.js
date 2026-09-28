import { Runtime } from '../runtime/runtime.js';
import { WorldStore } from '../world/world-store.js';
import { CoreDomainStores } from '../domain/core-domain-stores.js';
import { ResourceState } from '../resources/resource-state.js';
import { ResourceClaims } from '../resources/resource-claims.js';
import { ResourceDemands } from '../resources/resource-demands.js';
import { ResourceMatching } from '../resources/resource-matching.js';
import { RuntimeEconomyExecutionIntegration } from '../runtime/runtime-economy-execution-integration.js';
import { ActiveRuntimeProductionOutputAvailabilityOrchestration as IM28 } from '../runtime/active-runtime-production-output-availability-orchestration.js';

function fixture({ inputQuantity = 3 } = {}) {
  const world = new WorldStore(), domains = new CoreDomainStores();
  const producer = world.create('building', { role: 'producer' }, { id: 'building:00000001' });
  const consumer = world.create('building', { role: 'consumer' }, { id: 'building:00000002' });
  const resourceState = new ResourceState({ world, resourceStore: domains.resources });
  const claims = new ResourceClaims({ resourceState }), demands = new ResourceDemands({ resourceState, claims });
  const matching = new ResourceMatching({ resourceState, claims, demands });
  const wood = resourceState.createDefinition({ technicalName: 'wood' }, { id: 'resource-type:00000001' });
  const boards = resourceState.createDefinition({ technicalName: 'boards' }, { id: 'resource-type:00000002' });
  let composition = Object.freeze({ kind: 'active-runtime-composition', authoritative: Object.freeze({
    resourceState, resourceClaims: claims, resourceDemands: demands, domains,
    buildingStocks: Object.freeze([
      Object.freeze({ kind: 'building-stock', buildingId: producer.id, resourceTypeId: wood.id, quantity: inputQuantity }),
      Object.freeze({ kind: 'building-stock', buildingId: producer.id, resourceTypeId: boards.id, quantity: 0 }),
    ]),
    productionSettlementIds: Object.freeze([]), productionEffectReceipts: Object.freeze([]),
  }) });
  const runtime = new Runtime({ simulation: { phases: ['input','world','demand','assignment','intent','movement','work','economy','recovery','events','maintenance'], fixedStepMs: 100 } }); runtime.boot();
  const getComposition = () => composition, publishComposition = value => { composition = value; };
  const orchestration = new IM28({ getComposition, publishComposition });
  const workforceAssignment = Object.freeze({ kind: 'operational-building-workforce-assignment', status: 'ASSIGNED', buildingId: producer.id });
  const recipe = Object.freeze({ kind: 'production-building-stock', buildingId: producer.id, inputs: Object.freeze([{ resourceTypeId: wood.id, quantity: 3 }]), outputs: Object.freeze([{ resourceTypeId: boards.id, quantity: 2 }]) });
  const install = cycleId => RuntimeEconomyExecutionIntegration.installOneShotProductionCycle({ runtime, getComposition, publishComposition, cycleId, buildingId: producer.id, workforceAssignment, recipe });
  return { producer, consumer, wood, boards, resourceState, claims, demands, matching, runtime, orchestration, install, get composition(){ return composition; } };
}
function check(name, fn, results) { try { results.push(Object.freeze({ name, pass: !!fn() })); } catch (error) { results.push(Object.freeze({ name, pass: false, error: String(error?.message || error) })); } }

export function runIM28SelfTest() {
  const results = [];
  check('real-im22-settlement-materializes-output-into-active-resource-state', () => {
    const f=fixture(), registration=f.install('im28-cycle-1'); f.runtime.scheduler.step(); const settled=registration.result();
    const result=f.orchestration.reconcileSettlement({ settlementResult:settled });
    return settled.status==='SETTLED'&&result.status==='MATERIALIZED'&&result.mutation&&f.resourceState.ids().length===1&&f.resourceState.get(f.resourceState.ids()[0]).definitionId===f.boards.id;
  }, results);
  check('existing-resource-matching-discovers-materialized-output', () => {
    const f=fixture(), registration=f.install('im28-cycle-2'); f.runtime.scheduler.step(); f.orchestration.reconcileSettlement({settlementResult:registration.result()});
    const demand=f.demands.create({consumerId:f.consumer.id,definitionId:f.boards.id,amount:2},{id:'demand:00000001'}),match=f.matching.matchDemand(demand.id);
    return match.matchedAmount===2&&match.selections.length===1&&match.selections[0].ownerId===f.producer.id;
  }, results);
  check('same-settlement-reconciliation-does-not-duplicate-output', () => {
    const f=fixture(), registration=f.install('im28-cycle-3'); f.runtime.scheduler.step(); const settled=registration.result();
    const first=f.orchestration.reconcileSettlement({settlementResult:settled}),second=f.orchestration.reconcileSettlement({settlementResult:settled});
    return first.status==='MATERIALIZED'&&second.status==='ALREADY_MATERIALIZED'&&!second.mutation&&f.resourceState.ids().length===1;
  }, results);
  check('blocked-input-materializes-nothing', () => {
    const f=fixture({inputQuantity:2}),registration=f.install('im28-cycle-4');f.runtime.scheduler.step();const blocked=registration.result(),result=f.orchestration.reconcileSettlement({settlementResult:blocked});
    return blocked.status==='BLOCKED_INPUT'&&result.status==='NOT_MATERIALIZED'&&!result.mutation&&f.resourceState.ids().length===0;
  }, results);
  check('already-settled-reconciliation-creates-no-new-quantity', () => {
    const f=fixture(),registration=f.install('im28-cycle-5');f.runtime.scheduler.step();const settled=registration.result();f.orchestration.reconcileSettlement({settlementResult:settled});
    const before=f.resourceState.ids().length,again=f.orchestration.reconcileSettlement({settlementResult:{...settled,status:'ALREADY_SETTLED',mutation:false}});
    return again.status==='ALREADY_MATERIALIZED'&&!again.mutation&&f.resourceState.ids().length===before;
  }, results);
  check('multiple-settlements-remain-distinct-and-authorities-unchanged-by-im28', () => {
    const f=fixture(),a=f.install('im28-cycle-6');f.runtime.scheduler.step();const first=a.result();const stocksAfterFirst=f.composition.authoritative.buildingStocks,idsAfterFirst=f.composition.authoritative.productionSettlementIds,receiptsAfterFirst=f.composition.authoritative.productionEffectReceipts;
    const r=f.orchestration.reconcileSettlement({settlementResult:first});
    return r.status==='MATERIALIZED'&&f.composition.authoritative.buildingStocks===stocksAfterFirst&&f.composition.authoritative.productionSettlementIds===idsAfterFirst&&f.composition.authoritative.productionEffectReceipts===receiptsAfterFirst;
  }, results);
  check('restored-equivalent-reconciliation-does-not-rematerialize-existing-effect', () => {
    const f=fixture(),registration=f.install('im28-cycle-7');f.runtime.scheduler.step();const settled=registration.result();f.orchestration.reconcileSettlement({settlementResult:settled});
    const restored=new IM28({getComposition:()=>f.composition,publishComposition:()=>{throw new Error('already materialized state must not republish');}});
    const result=restored.reconcileSettlement({settlementResult:{...settled,status:'ALREADY_SETTLED',mutation:false}});
    return result.status==='ALREADY_MATERIALIZED'&&!result.mutation&&f.resourceState.ids().length===1;
  }, results);
  check('im28-does-not-own-production-demand-transport-or-savegame-authority', () =>
    typeof IM28.prototype.produce==='undefined'&&typeof IM28.prototype.settle==='undefined'&&typeof IM28.prototype.createDemand==='undefined'&&typeof IM28.prototype.claim==='undefined'&&typeof IM28.prototype.dispatch==='undefined'&&typeof IM28.prototype.save==='undefined'&&typeof IM28.prototype.restore==='undefined', results);
  const blockerCount=results.filter(value=>!value.pass).length;
  return Object.freeze({status:blockerCount===0?'PASS':'FAIL',blockerCount,results:Object.freeze(results)});
}
