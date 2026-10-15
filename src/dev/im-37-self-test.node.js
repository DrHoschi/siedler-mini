import assert from 'node:assert/strict';
import { Runtime } from '../runtime/runtime.js';
import { RuntimeConfig } from '../runtime/config.js';
import { createBaselineMiniworldScenario } from '../diagnostics/baseline-miniworld-scenario.js';
import { ActiveRuntimeProductionOutputAvailabilityOrchestration as Output } from '../runtime/active-runtime-production-output-availability-orchestration.js';
import { ActiveRuntimeProductionCycleTimeProgression as Progression } from '../runtime/active-runtime-production-cycle-time-progression.js';
import { ActiveRuntimeProductionCycleExecutionOrchestration as Cycles } from '../runtime/active-runtime-production-cycle-execution-orchestration.js';
import { ActiveRuntimeProductionReEvaluationOrchestration as ReEvaluation } from '../runtime/active-runtime-production-re-evaluation-orchestration.js';
import { ActiveRuntimeProductionLogisticsLoopOrchestration as Loop } from '../runtime/active-runtime-production-logistics-loop-orchestration.js';
import { PostIM13ActiveRuntimeCaptureAdapter as Capture } from '../savegame/post-im13-active-runtime-capture-adapter.js';
import { PostIM13SaveGameValidationContract as Validation } from '../savegame/post-im13-savegame-validation-contract.js';
import { PostIM13BrowserSaveContinueLifecycle as Lifecycle } from '../savegame/post-im13-browser-save-continue-lifecycle.js';
import { PostIM13AuthoritativeSnapshotIntegration as Snapshot } from '../savegame/post-im13-authoritative-snapshot-integration.js';
import { BrowserSaveGameStorageAdapter } from '../savegame/browser-savegame-storage-adapter.js';
import { DeliverySettlementContract } from '../transport/delivery-settlement-contract.js';
import { DeliverySettlementService } from '../transport/delivery-settlement-service.js';
import { TransportJobService } from '../transport/transport-job-service.js';
import { TransportCompletionService } from '../transport/transport-completion-service.js';
class Memory {v=new Map();getItem(k){return this.v.get(k)??null;}setItem(k,v){this.v.set(k,v);}}
let cached;
function fixture({carrier=true,input=3,recipe=true,workforce=true}={}) {
  if(!cached) {
    const c=createBaselineMiniworldScenario({includeSaveContinuity:true,includeProductionSupply:true}),a=c.authoritative,job=a.domains.jobs.get(a.domains.jobs.ids()[0]);
    a.resourceDemands.consumeClaim(job.claimId);a.domains.jobs.update(job.id,d=>{d.status='RELEASED';});
    const producer=a.productionRecipes[0].buildingId,type=a.productionRecipes[0].inputs[0].resourceTypeId,hq=a.domains.buildings.ids().find(id=>a.domains.buildings.get(id).identity.definitionId==='HQ');
    const held=a.resourceDemands.create({consumerId:hq,definitionId:type,amount:3,metadata:{source:'TEST_UNAVAILABLE_STOCK'}});a.resourceDemands.reserve({demandId:held.id,resourceId:job.resourceId,amount:3});
    const old=a.domains.units.get(a.carrierBindings[0].unitId);a.domains.units.update(old.id,d=>{d.carrier.state='AVAILABLE';});
    const unit=a.domains.units.create({...old,identity:{...old.identity,personId:'unit:00000937'},carrier:{...old.carrier,unitId:'unit:00000937',state:'AVAILABLE',capacity:10}},{id:'unit:00000937'});
    const active={...c,authoritative:{...a,carrierBindings:[],transportExecutions:[],
      workforceProfiles:[...a.workforceProfiles,{...a.workforceProfiles[0],personId:unit.id}],
      workforceAssignments:[...a.workforceAssignments,{kind:'workforce-assignment-state',personId:unit.id,availability:'FREE',assignmentId:null}],
      productionRecipes:[{...a.productionRecipes[0],outputs:[{resourceTypeId:type,quantity:3}]}],
      productionCycleTimes:a.productionCycleTimes.map(t=>({...t,durationMs:200})),
      buildingStocks:a.buildingStocks.map(s=>s.buildingId===producer&&s.resourceTypeId===type?{...s,quantity:3}:s),
    }};
    cached={snapshot:structuredClone(Capture.capture(active,1)),producer,type,hq,carrier:unit.id};
    assert.equal(Validation.validate(cached.snapshot).status,'VALID',JSON.stringify(Validation.validate(cached.snapshot)));
  }
  const f={...cached,snapshot:structuredClone(cached.snapshot)};
  const auth=f.snapshot.authoritative;
  auth.buildingStocks.find(s=>s.buildingId===f.producer&&s.resourceTypeId===f.type).quantity=input;
  if(!carrier){auth.workforceAssignments.find(s=>s.personId===f.carrier).availability='UNAVAILABLE';}
  if(!recipe){auth.definitions.productionRecipes=[];auth.definitions.productionCycleTimes=[];}
  if(!workforce){auth.workforceAssignments.find(s=>s.personId!==f.carrier).availability='FREE';auth.workforceAssignments.find(s=>s.personId!==f.carrier).assignmentId=null;auth.workforceBindings=[];}
  return f;
}
function harness(snapshot,{start=true,failRecoveryAt=0,expectRejected=false}={}) {
  let recoveryCalls=0;
  let active=createBaselineMiniworldScenario({includeSaveContinuity:true}),loop;
  const runtime=new Runtime(RuntimeConfig);runtime.boot();
  const get=()=>active,publish=v=>{active=v;};
  const output=new Output({getComposition:get,publishComposition:publish});
  const settled=v=>loop.publishSettledComposition(v);
  const progression=new Progression({runtime,getComposition:get,publishComposition:publish,publishSettledComposition:settled});
  const cycles=new Cycles({runtime,getComposition:get,publishComposition:settled,progression});
  const reeval=new ReEvaluation({runtime,getComposition:get,cycleExecution:cycles,resolveProductionContext:(id,c)=>progression.resolve(id,c)});
  loop=new Loop({runtime,getComposition:get,publishComposition:publish,outputAvailability:output,reEvaluation:reeval,resolveProductionContext:(id,c)=>progression.resolve(id,c)});
  const storage=new BrowserSaveGameStorageAdapter({storage:new Memory()});storage.write(Snapshot.serialize(snapshot));
  const lifecycle=new Lifecycle({storage,runtime,getComposition:get,publishComposition:publish,createTransportAdapter:options=>{
    if(!failRecoveryAt)return loop.createTransportAdapter(options);
    const completion=new TransportCompletionService({jobStore:options.state.domains.jobs,carrierAssignments:options.transport.carrierAssignments});
    return loop.createTransportAdapter({...options,completionService:{complete(input){if(++recoveryCalls===failRecoveryAt)throw new Error('injected recovery completion failure');return completion.complete(input);}}});
  },prepareProductionActivation:c=>cycles.prepareActivation(c)});
  const continued=lifecycle.continueFromStorage();runtime.scheduler.pause();assert.equal(continued.status,expectRejected?'REJECTED':'CONTINUED',JSON.stringify(continued));
  if(!start)runtime.pause();
  return {continued,runtime,loop,cycles,reeval,lifecycle,storage,output,get active(){return active;},set active(v){active=v;},step(){runtime.scheduler.step(100);},capture(){const s=Capture.capture(active,runtime.scheduler.completedStepIndex);assert.equal(Validation.validate(s).status,'VALID',JSON.stringify(Validation.validate(s)));return s;},dispose(){if(runtime.state==='RUNNING')runtime.pause();loop.dispose();reeval.dispose();progression.dispose();}};
}
const phases=new Map();
const results=[];
async function check(name,fn){try{await fn();results.push({name,pass:true});console.error(name+' PASS');}catch(e){results.push({name,pass:false,error:e.stack});console.error(name+' FAIL: '+e.message);}}
await check('closed-loop-uses-real-timed-production-hq-and-return-logistics',()=>{
  const f=fixture(),h=harness(f.snapshot);
  const initialWorker=structuredClone(h.active.authoritative.workforceBindings);
  const producerWorker=h.active.authoritative.workforceAssignments.find(s=>s.assignmentId===initialWorker[0].assignmentId).personId;
  assert.equal(h.cycles.handoff({buildingId:f.producer}).status,'REGISTERED');
  const seen=new Set();let returned=false;
  for(let n=0;n<150;n++) {
    h.step();const a=h.active.authoritative;
    const snap=h.capture();
    const shipping=a.transportExecutions.find(e=>a.resourceDemands.get(a.domains.jobs.get(e.jobId).demandId)?.metadata?.source==='IM-36_SETTLED_OUTPUT_HQ_DELIVERY');
    const returning=a.transportExecutions.find(e=>a.resourceDemands.get(a.domains.jobs.get(e.jobId).demandId)?.metadata?.source==='IM-23_PRODUCTION_INPUT');
    const phase=shipping?'HQ_'+shipping.state:returning?'RETURN_'+returning.state:a.productionCycleProgressions.length?(a.productionSettlementIds.length?'NEXT_CYCLE_REGISTERED':'TIMED_CYCLE'):'IDLE';
    if(!phases.has(phase))phases.set(phase,structuredClone(snap));
    for(const id of a.resourceDemands.ids()) {const d=a.resourceDemands.get(id);if(d.metadata.source==='IM-36_SETTLED_OUTPUT_HQ_DELIVERY')seen.add('OUTPUT_HQ_DEMAND');if(d.metadata.source==='IM-23_PRODUCTION_INPUT')seen.add('INPUT_DEMAND');}
    if(a.buildingStocks.some(s=>s.buildingId===f.hq&&s.resourceTypeId===f.type&&s.quantity>0))seen.add('HQ_INTAKE');
    if(a.buildingStockTransportReservations.some(r=>r.sourceBuildingId===f.hq&&r.state==='RELEASED'))returned=true;
    assert.deepEqual(a.workforceBindings,initialWorker);
    assert.equal(a.workforceAssignments.find(s=>s.personId===producerWorker).availability,'ASSIGNED');
    if(returned&&a.productionSettlementIds.length>=2)break;
  }
  assert.deepEqual([...seen].sort(),['HQ_INTAKE','INPUT_DEMAND','OUTPUT_HQ_DEMAND'].sort());assert.equal(returned,true);assert.ok(h.active.authoritative.productionSettlementIds.length>=2);
  const a=h.active.authoritative;
  assert.equal(new Set(a.resourceDemands.ids()).size,a.resourceDemands.ids().length);assert.equal(new Set(a.buildingStockTransportReservations.map(r=>r.jobId)).size,a.buildingStockTransportReservations.length);
  h.dispose();
});
await check('duplicate-flushes-create-no-second-demand-job-reservation-or-registration',()=>{
  const f=fixture(),h=harness(phases.get('HQ_TO_PICKUP'));
  const before=h.capture();for(let i=0;i<5;i++)h.loop.flush();const after=h.capture();
  assert.deepEqual(after.authoritative.resourceDemands,before.authoritative.resourceDemands);assert.deepEqual(after.domains.jobs,before.domains.jobs);assert.deepEqual(after.authoritative.buildingStockTransportReservations,before.authoritative.buildingStockTransportReservations);assert.deepEqual(after.authoritative.carrierBindings,before.authoritative.carrierBindings);
  h.dispose();
});
await check('real-storage-reload-continues-each-in-flight-phase',async()=>{
  assert.ok(phases.has('HQ_TO_PICKUP'));assert.ok(phases.has('RETURN_TO_DROPOFF'));
  for(const [phase,snapshot] of phases) {
    if(phase==='IDLE')continue;
    const h=harness(snapshot),f=fixture();
    assert.deepEqual(h.capture().authoritative.productionCycleProgressions,snapshot.authoritative.productionCycleProgressions);
    const old=snapshot.authoritative.settlementFences.production.length;
    for(let i=0;i<120&&h.active.authoritative.productionSettlementIds.length<=old;i++)h.step();
    assert.ok(h.active.authoritative.productionSettlementIds.length>old,phase);
    h.runtime.pause();await h.lifecycle.save();const saved=JSON.parse(h.storage.read());assert.equal(Validation.validate(saved).status,'VALID',phase);const t=harness(saved);t.capture();t.dispose();h.dispose();
  }
});
await check('no-free-carrier-waits-without-using-production-worker-or-crediting-hq',()=>{
  const f=fixture({carrier:false}),h=harness(f.snapshot);h.cycles.handoff({buildingId:f.producer});
  for(let i=0;i<10;i++)h.step();const a=h.active.authoritative;
  assert.equal(a.carrierBindings.length,0);assert.equal(a.productionSettlementIds.length,1);assert.equal(a.buildingStocks.find(s=>s.buildingId===f.hq&&s.resourceTypeId===f.type)?.quantity??0,0);h.capture();h.dispose();
});
await check('partial-return-keeps-input-demand-partial-and-production-blocked',()=>{
  const f=fixture({input:0});f.snapshot.authoritative.buildingStocks.push({kind:'building-stock',buildingId:f.hq,resourceTypeId:f.type,quantity:2});
  const h=harness(f.snapshot);assert.equal(h.cycles.handoff({buildingId:f.producer}).status,'NOT_REGISTERED');
  for(let i=0;i<45;i++)h.step();const a=h.active.authoritative;
  assert.equal(a.productionSettlementIds.length,0);assert.equal(a.productionCycleProgressions.length,0);assert.equal(a.buildingStocks.find(s=>s.buildingId===f.producer&&s.resourceTypeId===f.type).quantity,2);
  const d=a.resourceDemands.ids().map(id=>a.resourceDemands.get(id)).find(d=>d.metadata.source==='IM-23_PRODUCTION_INPUT');assert.equal(d.status,'PARTIAL');assert.equal(d.remainingAmount,1);h.capture();h.dispose();
});
function missingInputStockFixture() {
  const f=fixture({input:0});
  f.snapshot.authoritative.buildingStocks=f.snapshot.authoritative.buildingStocks.filter(s=>!(s.buildingId===f.producer&&s.resourceTypeId===f.type));
  f.snapshot.authoritative.buildingStocks.push({kind:'building-stock',buildingId:f.hq,resourceTypeId:f.type,quantity:3});
  assert.equal(Validation.validate(f.snapshot).status,'VALID');
  return f;
}
function advanceToMissingStockReturn(h,f) {
  for(let i=0;i<50;i++) {
    h.step();h.capture();
    const a=h.active.authoritative,execution=a.transportExecutions.find(e=>e.state==='TO_DROPOFF'&&a.resourceDemands.get(a.domains.jobs.get(e.jobId).demandId)?.metadata?.source==='IM-23_PRODUCTION_INPUT');
    if(execution) {
      assert.equal(a.buildingStocks.some(s=>s.buildingId===f.producer&&s.resourceTypeId===f.type),false);
      return execution.jobId;
    }
  }
  assert.fail('expected production input return before target stock exists');
}
async function savedSnapshot(h) {
  h.runtime.pause();await h.lifecycle.save();
  const snapshot=JSON.parse(h.storage.read());assert.equal(Validation.validate(snapshot).status,'VALID');return snapshot;
}
// Gate-3 regression: a missing stock row is a valid zero, not a missing building.
await check('missing-target-stock-return-survives-save-reload-and-credits-once',async()=>{
  const f=missingInputStockFixture(),h=harness(f.snapshot);let t,u;
  try {
    const jobId=advanceToMissingStockReturn(h,f);
    t=harness(await savedSnapshot(h));
    for(let i=0;i<20&&t.active.authoritative.domains.jobs.get(jobId).status!=='RELEASED';i++)t.step();
    const a=t.active.authoritative;
    assert.equal(a.domains.jobs.get(jobId).status,'RELEASED');
    assert.equal(a.buildingStocks.find(s=>s.buildingId===f.producer&&s.resourceTypeId===f.type).quantity,3);
    assert.equal(a.buildingStocks.find(s=>s.buildingId===f.hq&&s.resourceTypeId===f.type).quantity,0);
    assert.equal(a.buildingStockTransportReservations.find(r=>r.jobId===jobId).state,'RELEASED');
    assert.equal(a.workforceAssignments.find(w=>w.personId===f.carrier).availability,'FREE');
    u=harness(await savedSnapshot(t));const before=u.capture();
    u.loop.flush();u.loop.flush();assert.deepEqual(u.capture().authoritative.buildingStocks,before.authoritative.buildingStocks);
    assert.equal(u.active.authoritative.domains.jobs.get(jobId).status,'RELEASED');
    for(let i=0;i<20&&!u.active.authoritative.productionSettlementIds.length;i++)u.step();
    assert.equal(u.active.authoritative.productionSettlementIds.length,1);u.capture();
  } finally {u?.dispose();t?.dispose();h.dispose();}
});
await check('missing-target-stock-delivered-window-recovers-and-reloads-without-second-credit',async()=>{
  const f=missingInputStockFixture(),h=harness(f.snapshot);let t,u;
  try {
    const jobId=advanceToMissingStockReturn(h,f);deliveredOptions(h);
    const pending=await savedSnapshot(h);
    assert.equal(pending.authoritative.transportExecutions.find(e=>e.jobId===jobId).state,'DELIVERED');
    t=harness(pending);const a=t.active.authoritative;
    assert.equal(a.domains.jobs.get(jobId).status,'RELEASED');
    assert.equal(a.buildingStocks.find(s=>s.buildingId===f.producer&&s.resourceTypeId===f.type).quantity,3);
    assert.equal(a.buildingStocks.find(s=>s.buildingId===f.hq&&s.resourceTypeId===f.type).quantity,0);
    assert.equal(a.transportExecutions.length,0);assert.equal(a.carrierBindings.length,0);
    const accepted=await savedSnapshot(t);u=harness(accepted);
    assert.deepEqual(u.capture().authoritative.buildingStocks,accepted.authoritative.buildingStocks);
    assert.equal(u.active.authoritative.domains.jobs.get(jobId).status,'RELEASED');
    u.loop.flush();assert.deepEqual(u.capture().authoritative.buildingStocks,accepted.authoritative.buildingStocks);
  } finally {u?.dispose();t?.dispose();h.dispose();}
});
await check('missing-recipe-and-workforce-register-no-cycle',()=>{
  for(const option of [{recipe:false},{workforce:false}]) {const f=fixture(option),h=harness(f.snapshot);for(let i=0;i<4;i++)h.step();assert.equal(h.active.authoritative.productionCycleProgressions.length,0);assert.equal(h.active.authoritative.productionSettlementIds.length,0);h.capture();h.dispose();}
});
await check('transport-workforce-binding-rejects-shared-or-lost-identities',()=>{
  const good=phases.get('HQ_TO_PICKUP');assert.equal(Validation.validate(good).status,'VALID');
  for(const change of [s=>{s.authoritative.carrierBindings[0].workforceAssignmentId=s.authoritative.workforceBindings[0].assignmentId;},s=>{delete s.authoritative.carrierBindings[0].workforceAssignmentId;},s=>{s.authoritative.workforceAssignments.find(w=>w.personId===s.authoritative.carrierBindings[0].unitId).availability='UNAVAILABLE';}]) {
    const bad=structuredClone(good);change(bad);assert.equal(Validation.validate(bad).status,'INVALID');
  }
});
await check('materialized-output-and-hq-type-metadata-roundtrip-and-wrong-type-rejection',()=>{
  for(const phase of ['HQ_TO_PICKUP','RETURN_TO_PICKUP']) {const s=phases.get(phase),h=harness(s);const re=h.capture();assert.deepEqual(re.domains.resources.state.items,s.domains.resources.state.items);h.dispose();}
  const bad=structuredClone(phases.get('HQ_TO_PICKUP'));const r=Object.values(bad.domains.resources.state.items).find(r=>r.metadata?.source==='IM-27_PRODUCTION_OUTPUT');r.metadata.resourceTypeId='resource-type:00000002';assert.equal(Validation.validate(bad).status,'INVALID');
});
function removeTransfer(s,source) {
  const entry=Object.entries(s.authoritative.resourceDemands.state.items).find(([id,d])=>d.metadata?.source===source);
  const demandId=entry[0],job=Object.values(s.domains.jobs.state.items).find(j=>j.demandId===demandId);
  delete s.authoritative.resourceDemands.state.items[demandId];delete s.authoritative.resourceClaims.state.items[job.claimId];delete s.domains.jobs.state.items[job.id];
  s.domains.resources.state.items[job.resourceId].state='AVAILABLE';
  s.authoritative.buildingStockTransportReservations=s.authoritative.buildingStockTransportReservations.filter(r=>r.jobId!==job.id);
  for(const b of s.authoritative.carrierBindings.filter(b=>b.jobId===job.id)) {const w=s.authoritative.workforceAssignments.find(w=>w.personId===b.unitId);w.availability='FREE';w.assignmentId=null;s.domains.units.state.items[b.unitId].carrier.state='AVAILABLE';}
  s.authoritative.carrierBindings=s.authoritative.carrierBindings.filter(b=>b.jobId!==job.id);s.authoritative.transportExecutions=s.authoritative.transportExecutions.filter(e=>e.jobId!==job.id);
  assert.equal(Validation.validate(s).status,'VALID',JSON.stringify(Validation.validate(s)));return s;
}
await check('persisted-output-before-hq-trigger-and-intake-before-reconnection-resume',()=>{
  for(const [phase,source] of [['HQ_TO_PICKUP','IM-36_SETTLED_OUTPUT_HQ_DELIVERY'],['RETURN_TO_PICKUP','IM-23_PRODUCTION_INPUT']]) {
    const s=removeTransfer(structuredClone(phases.get(phase)),source),h=harness(s);const count=s.authoritative.settlementFences.production.length;
    for(let i=0;i<120&&h.active.authoritative.productionSettlementIds.length<=count;i++)h.step();assert.ok(h.active.authoritative.productionSettlementIds.length>count);h.capture();h.dispose();
  }
});
function deliveredOptions(h) {
  const a=h.active.authoritative,execution={...a.transportExecutions[0],state:'DELIVERED'},job=a.domains.jobs.get(execution.jobId),binding=a.carrierBindings.find(b=>b.jobId===job.id),reservation=a.buildingStockTransportReservations.find(r=>r.jobId===job.id);
  const delivery={kind:'delivered-cargo',jobId:job.id,unitId:execution.unitId,resourceId:job.resourceId,targetId:job.targetId,amount:job.amount};
  const settlement=DeliverySettlementContract.fromDelivered({job,execution,delivery,claim:a.resourceClaims.get(job.claimId),demand:a.resourceDemands.get(job.demandId),resource:a.resourceState.get(job.resourceId)});
  const deliveryCommit=new DeliverySettlementService({resources:a.resourceState,claims:a.resourceClaims,demands:a.resourceDemands}).commit({settlement,job,execution,delivery});
  h.active={...h.active,authoritative:{...a,transportExecutions:a.transportExecutions.map(e=>e.jobId===job.id?execution:e)}};
  return {state:h.active.authoritative,job,execution,delivery,deliveryCommit,reservation,workforceAssignmentId:binding.workforceAssignmentId};
}
await check('persisted-delivered-hq-and-return-windows-use-existing-complete-only-recovery',()=>{
  for(const phase of ['HQ_TO_DROPOFF','RETURN_TO_DROPOFF']) {
    const h=harness(phases.get(phase));deliveredOptions(h);const snapshot=h.capture();const t=harness(snapshot);
    assert.equal(t.active.authoritative.resourceClaims.get(snapshot.domains.jobs.state.items[snapshot.authoritative.transportExecutions[0].jobId].claimId).state,'CONSUMED');
    assert.equal(t.active.authoritative.transportExecutions.length,0);assert.equal(t.active.authoritative.workforceAssignments.find(w=>w.personId===fixture().carrier).availability,'FREE');
    const count=snapshot.authoritative.settlementFences.production.length;for(let i=0;i<120&&t.active.authoritative.productionSettlementIds.length<=count;i++)t.step();assert.ok(t.active.authoritative.productionSettlementIds.length>count);t.capture();t.dispose();h.dispose();
  }
});
await check('intake-complete-before-terminal-cleanup-restores-without-second-credit',()=>{
  const f=fixture(),h=harness(phases.get('HQ_TO_DROPOFF')),options=deliveredOptions(h);
  const next=h.loop.publishDeliveredSupply(options);h.active={...h.active,authoritative:{...h.active.authoritative,buildingStocks:next.buildingStocks,buildingStockTransportReservations:next.buildingStockTransportReservations,workforceAssignments:next.workforceAssignments}};
  const snapshot=h.capture(),t=harness(snapshot);
  assert.equal(t.active.authoritative.buildingStocks.find(s=>s.buildingId===f.hq&&s.resourceTypeId===f.type).quantity,3);assert.equal(t.active.authoritative.carrierBindings.length,0);assert.equal(t.active.authoritative.transportExecutions.length,0);t.capture();t.dispose();h.dispose();
});
await check('returned-input-before-re-evaluation-restores-exact-next-cycle',()=>{
  const snapshot=structuredClone(phases.get('NEXT_CYCLE_REGISTERED'));assert.ok(snapshot);snapshot.authoritative.productionCycleProgressions=[];
  const h=harness(snapshot);h.loop.flush();const before=h.capture();assert.equal(before.authoritative.productionCycleProgressions.length,1);
  h.loop.flush();assert.deepEqual(h.capture().authoritative.productionCycleProgressions,before.authoritative.productionCycleProgressions);h.dispose();
});
await check('wrong-target-type-source-amount-and-workforce-credit-no-hq-stock',()=>{
  const changes=[o=>({...o,job:{...o.job,targetId:fixture().producer}}),o=>({...o,job:{...o.job,definitionId:'resource-type:00000002'}}),o=>({...o,reservation:{...o.reservation,sourceBuildingId:fixture().hq}}),o=>({...o,delivery:{...o.delivery,amount:o.delivery.amount+1}}),o=>({...o,workforceAssignmentId:'assignment:00000001'})];
  for(const change of changes) {const h=harness(phases.get('HQ_TO_DROPOFF')),o=deliveredOptions(h),stocks=structuredClone(h.active.authoritative.buildingStocks);assert.throws(()=>h.loop.publishDeliveredSupply(change(o)));assert.deepEqual(h.active.authoritative.buildingStocks,stocks);h.dispose();}
});
await check('missing-hq-triggers-no-delivery-or-successor-cycle',()=>{
  const f=fixture();f.snapshot.domains.buildings.state.items[f.hq].identity.definitionId='NOT_HQ';
  const h=harness(f.snapshot);h.cycles.handoff({buildingId:f.producer});for(let i=0;i<8;i++)h.step();
  const a=h.active.authoritative;assert.equal(a.productionSettlementIds.length,1);assert.equal(a.productionCycleProgressions.length,0);assert.equal(a.carrierBindings.length,0);assert.ok(!a.resourceDemands.ids().map(id=>a.resourceDemands.get(id)).some(d=>d.metadata.source==='IM-36_SETTLED_OUTPUT_HQ_DELIVERY'));h.capture();h.dispose();
});
function twoDeliveredSnapshot() {
  const c=createBaselineMiniworldScenario({includeSaveContinuity:true}),a=c.authoritative,first=a.domains.jobs.get(a.domains.jobs.ids()[0]),old=a.domains.units.get(a.carrierBindings[0].unitId),unitId='unit:00000938';
  a.domains.units.create({...old,identity:{...old.identity,personId:unitId},carrier:{...old.carrier,unitId,state:'OCCUPIED'}},{id:unitId});
  const demand=a.resourceDemands.create({consumerId:first.targetId,definitionId:first.definitionId,amount:1,metadata:{source:'TEST_GENERIC_TRANSPORT'}}),claim=a.resourceDemands.reserve({demandId:demand.id,resourceId:first.resourceId,amount:1});
  const job=new TransportJobService({jobStore:a.domains.jobs,claims:a.resourceClaims,demands:a.resourceDemands,resourceState:a.resourceState}).createFromClaimIds([claim.id]).jobs[0];
  const active={...c,authoritative:{...a,workforceProfiles:[...a.workforceProfiles,{...a.workforceProfiles[0],personId:unitId}],workforceAssignments:[...a.workforceAssignments,{kind:'workforce-assignment-state',personId:unitId,availability:'FREE',assignmentId:null}],carrierBindings:[...a.carrierBindings,{kind:'carrier-job-binding',jobId:job.id,unitId}],transportExecutions:[{...a.transportExecutions[0],state:'DELIVERED'},{kind:'transport-execution',jobId:job.id,unitId,state:'DELIVERED'}]}};
  const snapshot=Capture.capture(active,1);assert.equal(Validation.validate(snapshot).status,'VALID');return snapshot;
}
await check('multiple-delivered-transports-recover-through-existing-settlement-and-release-once',()=>{
  const s=twoDeliveredSnapshot(),h=harness(s);assert.equal(h.active.authoritative.transportExecutions.length,0);assert.equal(h.active.authoritative.carrierBindings.length,0);
  for(const b of s.authoritative.carrierBindings){const job=h.active.authoritative.domains.jobs.get(b.jobId);assert.equal(job.status,'RELEASED');assert.equal(h.active.authoritative.resourceClaims.get(job.claimId).state,'CONSUMED');assert.equal(h.active.authoritative.domains.units.get(b.unitId).carrier.state,'AVAILABLE');}
  h.capture();h.dispose();
});
await check('failure-in-second-recovery-discards-all-candidate-mutations',()=>{
  const s=twoDeliveredSnapshot(),h=harness(s,{failRecoveryAt:2,expectRejected:true});assert.equal(h.continued.reason,'RECOVERY_EXECUTION_FAILED');assert.equal(h.continued.candidateDiscarded,true);assert.equal(h.storage.read(),Snapshot.serialize(s));assert.equal(h.active.authoritative.domains.jobs.size,1);h.dispose();
});
console.log(JSON.stringify({status:results.every(r=>r.pass)?'PASS':'FAIL',results},null,2));if(results.some(r=>!r.pass))process.exitCode=1;
