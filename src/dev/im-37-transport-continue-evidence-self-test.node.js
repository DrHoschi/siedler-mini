import assert from 'node:assert/strict';
import { Runtime } from '../runtime/runtime.js';
import { RuntimeConfig } from '../runtime/config.js';
import { createBaselineMiniworldScenario } from '../diagnostics/baseline-miniworld-scenario.js';
import { BrowserSaveGameStorageAdapter } from '../savegame/browser-savegame-storage-adapter.js';
import { PostIM13ActiveRuntimeCaptureAdapter as Capture } from '../savegame/post-im13-active-runtime-capture-adapter.js';
import { PostIM13AuthoritativeSnapshotIntegration as Snapshot } from '../savegame/post-im13-authoritative-snapshot-integration.js';
import { PostIM13SaveGameValidationContract as Validation } from '../savegame/post-im13-savegame-validation-contract.js';
import { PostIM13BrowserSaveContinueLifecycle as Lifecycle } from '../savegame/post-im13-browser-save-continue-lifecycle.js';
import { ActiveRuntimeProductionSupplyOrchestration as Supply } from '../runtime/active-runtime-production-supply-orchestration.js';
import { PostContinueTransportExecutionAdapter as Adapter } from '../transport/post-continue-transport-execution-adapter.js';
import { TransportCompletionService } from '../transport/transport-completion-service.js';
class Memory { values = new Map(); getItem(k) { return this.values.get(k) ?? null; } setItem(k,v) { this.values.set(k,String(v)); } }
let cachedFixture;
function fixture() {
  if(cachedFixture)return {...cachedFixture,snapshot:structuredClone(cachedFixture.snapshot)};
  const initial = createBaselineMiniworldScenario({includeSaveContinuity:true,includeProductionSupply:true});
  const a = initial.authoritative, job = a.domains.jobs.get(a.domains.jobs.ids()[0]);
  const reservation = Object.freeze({kind:'building-stock-transport-reservation',id:'transport-reservation:00000937',jobId:job.id,sourceBuildingId:job.sourceLocation.refId,targetBuildingId:job.targetId,resourceTypeId:job.definitionId,amount:job.amount,state:'ACTIVE'});
  // This transport-only scenario has no production worker bound to its carrier.
  const active = {...initial,authoritative:{...a,buildingStockTransportReservations:[reservation],workforceRequirements:[],productionRecipes:[],productionCycleTimes:[]}};
  const snapshot = structuredClone(Capture.capture(active,1));
  assert.equal(Validation.validate(snapshot).status,'VALID');
  cachedFixture={active,snapshot,job,reservation};
  return {...cachedFixture,snapshot:structuredClone(snapshot)};
}
function session(snapshot, publishDeliveredSupply = null, failFirstCompletion = false) {
  const memory = new Memory(), storage = new BrowserSaveGameStorageAdapter({storage:memory});
  storage.write(Snapshot.serialize(snapshot));
  const runtime = new Runtime(RuntimeConfig); runtime.boot();
  let active = fixture().active;
  let completionFailed=false;
  const lifecycle = new Lifecycle({storage,runtime,getComposition:()=>active,publishComposition:v=>{active=v;},publishDeliveredSupply,
    ...(failFirstCompletion?{createTransportAdapter:options=>{
      const completion=new TransportCompletionService({jobStore:options.state.domains.jobs,carrierAssignments:options.transport.carrierAssignments});
      return new Adapter({...options,publishDeliveredSupply,completionService:{complete(input){if(!completionFailed){completionFailed=true;throw new Error('completion interrupted after intake');}return completion.complete(input);}}});
    }}:{})});
  const result = lifecycle.continueFromStorage(); runtime.pause();
  return {runtime,lifecycle,storage,result,get active(){return active;},set active(value){active=value;}};
}
function advance(s) { for(let i=0;i<200&&s.active.authoritative.transportExecutions[0]?.state!=='DELIVERED';i++) s.runtime.scheduler.step(100); }
function publish({state,job,execution,delivery,deliveryCommit,reservation}) {
  let composition = {kind:'active-runtime-composition',authoritative:state};
  const workforceState = state.workforceAssignments.find(v=>v.personId===execution.unitId);
  const dispatch = {kind:'workforce-aware-transport-dispatch',reservation,job,workforce:{personId:execution.unitId,assignedState:workforceState},executionAssignment:{jobId:job.id,unitId:execution.unitId},compatibilityRefs:{assignmentId:workforceState.assignmentId}};
  const supply = new Supply({getComposition:()=>composition,publishComposition:v=>{composition=v;}});
  const stock = id=>state.buildingStocks.find(v=>v.buildingId===id&&v.resourceTypeId===job.definitionId);
  supply.publishDeliveredBuildingStock({dispatch,delivery,reservation,workforceState,sourceStock:stock(reservation.sourceBuildingId),targetStock:stock(job.targetId),deliveryCommit});
  return {...composition.authoritative,workforceBindings:[]};
}
const results=[];
async function check(name,fn) { try { await fn(); results.push({name,pass:true}); } catch(error) { results.push({name,pass:false,error:error.stack}); } }
await check('normal-delivery-without-publication-keeps-valid-persisted-evidence',async()=>{
  const f=fixture(),s=session(f.snapshot);assert.equal(s.result.status,'CONTINUED');advance(s);
  const a=s.active.authoritative;
  assert.equal(a.transportExecutions[0].state,'DELIVERED');assert.equal(a.domains.jobs.get(f.job.id).status,'PENDING');assert.equal(a.resourceClaims.get(f.job.claimId).state,'CONSUMED');
  assert.equal(a.carrierBindings.length,1);assert.equal(a.domains.units.get(a.carrierBindings[0].unitId).carrier.state,'OCCUPIED');
  s.runtime.scheduler.step();s.runtime.scheduler.step();await s.lifecycle.save();
  const saved=JSON.parse(s.storage.read());assert.equal(Validation.validate(saved).status,'VALID',JSON.stringify(Validation.validate(saved)));
  assert.equal(saved.authoritative.transportExecutions[0].state,'DELIVERED');assert.equal(saved.authoritative.buildingStockTransportReservations[0].state,'ACTIVE');
});
await check('reload-retries-intake-once-without-delivery-settlement-replay',async()=>{
  const f=fixture(),s=session(f.snapshot);advance(s);await s.lifecycle.save();
  let calls=0,replayed;
  const t=session(JSON.parse(s.storage.read()),options=>{calls++;replayed=options.deliveryCommit.recoveredWithoutSettlementReplay;return publish(options);});
  assert.equal(t.result.status,'CONTINUED',JSON.stringify(t.result));assert.equal(calls,1);assert.equal(replayed,true);
  assert.equal(t.active.authoritative.domains.jobs.get(f.job.id).status,'RELEASED');assert.equal(t.active.authoritative.transportExecutions.length,0);assert.equal(t.active.authoritative.carrierBindings.length,0);
  assert.equal(t.active.authoritative.buildingStockTransportReservations[0].state,'RELEASED');
  const qty=(a,id)=>a.buildingStocks.find(v=>v.buildingId===id&&v.resourceTypeId===f.job.definitionId).quantity;
  assert.equal(qty(t.active.authoritative,f.job.sourceLocation.refId),3);assert.equal(qty(t.active.authoritative,f.job.targetId),1);
  t.runtime.scheduler.step();await t.lifecycle.save();const saved=JSON.parse(t.storage.read());assert.equal(Validation.validate(saved).status,'VALID',JSON.stringify(Validation.validate(saved)));
  const u=session(saved,()=>{throw new Error('terminal intake must not replay');});assert.equal(u.result.status,'CONTINUED');assert.equal(calls,1);
});
await check('reload-without-handler-preserves-pending-evidence-and-valid-save',async()=>{
  const f=fixture(),s=session(f.snapshot);advance(s);await s.lifecycle.save();
  const t=session(JSON.parse(s.storage.read()));assert.equal(t.result.status,'CONTINUED',JSON.stringify(t.result));assert.equal(t.result.schedulerRegistrationCount,1);
  t.runtime.scheduler.step();await t.lifecycle.save();assert.equal(Validation.validate(JSON.parse(t.storage.read())).status,'VALID');assert.equal(t.active.authoritative.transportExecutions[0].state,'DELIVERED');
});
await check('invalid-publication-does-not-release-carrier-or-drop-evidence',async()=>{
  const f=fixture(),s=session(f.snapshot,()=>({buildingStocks:[],buildingStockTransportReservations:[],workforceAssignments:[]}));
  assert.throws(()=>advance(s),/release the exact/);assert.equal(s.active.authoritative.transportExecutions[0].state,'DELIVERED');assert.equal(s.active.authoritative.domains.jobs.get(f.job.id).status,'PENDING');assert.equal(s.active.authoritative.carrierBindings.length,1);
  await s.lifecycle.save();assert.equal(Validation.validate(JSON.parse(s.storage.read())).status,'VALID',JSON.stringify(Validation.validate(JSON.parse(s.storage.read()))));
});
await check('failed-continue-publication-discards-candidate-and-preserves-storage',async()=>{
  const f=fixture(),s=session(f.snapshot);advance(s);await s.lifecycle.save();
  const saved=JSON.parse(s.storage.read());const t=session(saved,()=>{throw new Error('intake failure');});
  assert.equal(t.result.status,'REJECTED');assert.equal(t.result.reason,'RECOVERY_EXECUTION_FAILED');assert.equal(t.result.candidateDiscarded,true);assert.deepEqual(JSON.parse(t.storage.read()),saved);
});
await check('ambiguous-reservations-fail-closed',async()=>{
  const f=fixture();f.snapshot.authoritative.buildingStockTransportReservations.push({...f.reservation,id:'transport-reservation:00000938'});
  assert.equal(Validation.validate(f.snapshot).status,'INVALID');
  const s=session(f.snapshot,publish);assert.equal(s.result.status,'REJECTED');assert.equal(s.result.reason,'RESTORE_REJECTED');
});
await check('intake-complete-terminal-cleanup-interruption-restores-without-second-credit',async()=>{
  const f=fixture();let calls=0;const s=session(f.snapshot,options=>{calls++;return publish(options);},true);
  assert.throws(()=>advance(s),/completion interrupted/);assert.equal(calls,1);await s.lifecycle.save();
  const saved=JSON.parse(s.storage.read());assert.equal(Validation.validate(saved).status,'VALID');assert.equal(saved.authoritative.buildingStockTransportReservations[0].state,'RELEASED');
  const t=session(saved,()=>{throw new Error('already published stock must not replay');});assert.equal(t.result.status,'CONTINUED');assert.equal(t.active.authoritative.domains.jobs.get(f.job.id).status,'RELEASED');assert.equal(calls,1);
});
await check('live-intake-reads-current-stock-owner-after-intervening-publication',async()=>{
  const f=fixture(),s=session(f.snapshot,publish);assert.equal(s.result.status,'CONTINUED');
  const old=s.active;const stocks=old.authoritative.buildingStocks.map(value=>value.buildingId===f.job.sourceLocation.refId&&value.resourceTypeId===f.job.definitionId?{...value,quantity:5}:value);
  s.active={...old,authoritative:{...old.authoritative,buildingStocks:stocks}};
  advance(s);assert.equal(s.active.authoritative.domains.jobs.get(f.job.id).status,'RELEASED');assert.equal(s.active.authoritative.transportExecutions.length,0);
  assert.equal(s.active.authoritative.buildingStocks.find(value=>value.buildingId===f.job.sourceLocation.refId&&value.resourceTypeId===f.job.definitionId).quantity,4);
  await s.lifecycle.save();assert.equal(Validation.validate(JSON.parse(s.storage.read())).status,'VALID');
});
await check('old-v2-reservations-without-job-binding-remain-readable',async()=>{
  const f=fixture();delete f.snapshot.authoritative.buildingStockTransportReservations[0].jobId;
  const s=session(f.snapshot);assert.equal(s.result.status,'CONTINUED');advance(s);await s.lifecycle.save();
  const saved=JSON.parse(s.storage.read());assert.equal(Validation.validate(saved).status,'VALID');
  const t=session(saved,publish);assert.equal(t.result.status,'CONTINUED');assert.equal(t.active.authoritative.domains.jobs.get(f.job.id).status,'RELEASED');
});
await check('consumed-pending-claim-requires-delivered-and-matching-identities',async()=>{
  const f=fixture(),s=session(f.snapshot);advance(s);await s.lifecycle.save();const saved=JSON.parse(s.storage.read());
  assert.equal(saved.authoritative.buildingStockTransportReservations[0].jobId,f.job.id);
  for(const corrupt of [v=>{v.authoritative.transportExecutions[0].state='TO_DROPOFF';},v=>{v.domains.jobs.state.items[f.job.id].amount=2;},v=>{v.authoritative.buildingStockTransportReservations[0].targetBuildingId=f.job.sourceLocation.refId;}]) {
    const bad=structuredClone(saved);corrupt(bad);assert.equal(Validation.validate(bad).status,'INVALID');
    const t=session(bad,publish);assert.equal(t.result.status,'REJECTED');
  }
});
console.log(JSON.stringify({status:results.every(r=>r.pass)?'PASS':'FAIL',results},null,2));
if(results.some(r=>!r.pass))process.exitCode=1;
