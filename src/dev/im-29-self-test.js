import { Runtime } from '../runtime/runtime.js';
import { ActiveRuntimeProductionCycleExecutionOrchestration } from '../runtime/active-runtime-production-cycle-execution-orchestration.js';
import { ActiveRuntimeProductionReEvaluationOrchestration as IM29 } from '../runtime/active-runtime-production-re-evaluation-orchestration.js';

function fixture({ inputQuantity = 6 } = {}) {
  const buildingId='building:00000001';
  const workforceAssignment=Object.freeze({kind:'operational-building-workforce-assignment',status:'ASSIGNED',buildingId,personId:'unit:00000001'});
  const recipe=Object.freeze({kind:'production-building-stock',buildingId,inputs:Object.freeze([{resourceTypeId:'resource-type:00000001',quantity:3}]),outputs:Object.freeze([{resourceTypeId:'resource-type:00000002',quantity:2}])});
  let composition=Object.freeze({kind:'active-runtime-composition',authoritative:Object.freeze({
    buildingStocks:Object.freeze([
      Object.freeze({kind:'building-stock',buildingId,resourceTypeId:'resource-type:00000001',quantity:inputQuantity}),
      Object.freeze({kind:'building-stock',buildingId,resourceTypeId:'resource-type:00000002',quantity:0}),
    ]),
    productionSettlementIds:Object.freeze([]),productionEffectReceipts:Object.freeze([]),
    productionRecipes:Object.freeze([recipe]),workforceAssignments:Object.freeze([workforceAssignment]),
  })});
  const runtime=new Runtime({simulation:{phases:['input','world','demand','assignment','intent','movement','work','economy','recovery','events','maintenance'],fixedStepMs:100}});runtime.boot();
  let im29=null;
  const getComposition=()=>composition;
  const publishComposition=value=>{composition=value;im29?.requestSettledOutput({composition:value});};
  const im26=new ActiveRuntimeProductionCycleExecutionOrchestration({runtime,getComposition,publishComposition});
  im29=new IM29({runtime,getComposition,cycleExecution:im26});
  return {buildingId,workforceAssignment,recipe,runtime,im26,im29,get composition(){return composition;},set composition(value){composition=value;}};
}
function check(name,fn,results){try{results.push(Object.freeze({name,pass:!!fn()}));}catch(error){results.push(Object.freeze({name,pass:false,error:String(error?.message||error)}));}}

export function runIM29SelfTest(){
 const results=[];
 check('delivered-input-trigger-waits-for-completed-step-then-registers',()=>{
  const f=fixture({inputQuantity:3});
  const request=f.im29.requestDeliveredSupply({publication:Object.freeze({kind:'im24-delivered-supply-publication',status:'DELIVERED_TO_BUILDING_STOCK',settlement:Object.freeze({targetStock:Object.freeze({buildingId:f.buildingId})})})});
  const before=f.runtime.scheduler.systemCount();f.runtime.scheduler.step();
  return request.status==='PENDING'&&before===0&&f.runtime.scheduler.systemCount()===1&&f.im26.activeRegistration({buildingId:f.buildingId,cycleId:'im25-cycle-00000001'})!==null;
 },results);
 check('delivered-state-still-blocked-registers-nothing',()=>{
  const f=fixture({inputQuantity:2});f.im29.request({trigger:'DELIVERED_BUILDING_STOCK',buildingId:f.buildingId});f.runtime.scheduler.step();
  return f.runtime.scheduler.systemCount()===0;
 },results);
 check('unchanged-ready-state-does-not-create-parallel-duplicate-registration',()=>{
  const f=fixture({inputQuantity:3});f.im29.request({trigger:'DELIVERED_BUILDING_STOCK',buildingId:f.buildingId});f.im29.request({trigger:'DELIVERED_BUILDING_STOCK',buildingId:f.buildingId});
  f.runtime.scheduler.step();const count=f.runtime.scheduler.systemCount();
  f.im29.request({trigger:'DELIVERED_BUILDING_STOCK',buildingId:f.buildingId});f.runtime.scheduler.step();
  return count===1&&f.runtime.scheduler.systemCount()===1&&f.im26.activeRegistration({buildingId:f.buildingId,cycleId:'im25-cycle-00000001'})!==null;
 },results);
 check('settlement-trigger-admits-deterministic-successor-only-after-settlement-publish',()=>{
  const f=fixture({inputQuantity:6});f.im29.request({trigger:'DELIVERED_BUILDING_STOCK',buildingId:f.buildingId});f.runtime.scheduler.step();
  const first=f.im26.activeRegistration({buildingId:f.buildingId,cycleId:'im25-cycle-00000001'});f.runtime.scheduler.step();
  const second=f.im26.activeRegistration({buildingId:f.buildingId,cycleId:'im25-cycle-00000002'});
  return first!==null&&first.result()?.status==='SETTLED'&&second!==null&&f.composition.authoritative.productionSettlementIds.length===1;
 },results);
 check('settlement-trigger-with-consumed-input-does-not-admit-successor',()=>{
  const f=fixture({inputQuantity:3});f.im29.request({trigger:'DELIVERED_BUILDING_STOCK',buildingId:f.buildingId});f.runtime.scheduler.step();
  const first=f.im26.activeRegistration({buildingId:f.buildingId,cycleId:'im25-cycle-00000001'});f.runtime.scheduler.step();
  return first.result()?.status==='SETTLED'&&f.im26.activeRegistration({buildingId:f.buildingId,cycleId:'im25-cycle-00000002'})===null&&f.runtime.scheduler.systemCount()===0;
 },results);
 check('scheduler-step-alone-is-not-admission-authority',()=>{
  const f=fixture({inputQuantity:6});f.runtime.scheduler.step();f.runtime.scheduler.step();return f.runtime.scheduler.systemCount()===0&&f.composition.authoritative.productionSettlementIds.length===0;
 },results);
 check('reconstructed-equivalent-state-reuses-frozen-im25-im26-boundaries',()=>{
  const f=fixture({inputQuantity:3});f.im29.request({trigger:'DELIVERED_BUILDING_STOCK',buildingId:f.buildingId});f.runtime.scheduler.step();
  const runtime2=new Runtime({simulation:{phases:['input','world','demand','assignment','intent','movement','work','economy','recovery','events','maintenance'],fixedStepMs:100}});runtime2.boot();
  const im26b=new ActiveRuntimeProductionCycleExecutionOrchestration({runtime:runtime2,getComposition:()=>f.composition,publishComposition:()=>{throw new Error('handoff must not execute');}});
  const im29b=new IM29({runtime:runtime2,getComposition:()=>f.composition,cycleExecution:im26b});
  im29b.request({trigger:'DELIVERED_BUILDING_STOCK',buildingId:f.buildingId});runtime2.scheduler.step();
  im29b.request({trigger:'DELIVERED_BUILDING_STOCK',buildingId:f.buildingId});runtime2.scheduler.step();
  return runtime2.scheduler.systemCount()===1&&im26b.activeRegistration({buildingId:f.buildingId,cycleId:'im25-cycle-00000001'})!==null;
 },results);
 check('im29-does-not-own-production-settlement-stock-demand-transport-or-savegame-authority',()=>typeof IM29.prototype.produce==='undefined'&&typeof IM29.prototype.settle==='undefined'&&typeof IM29.prototype.createStock==='undefined'&&typeof IM29.prototype.createDemand==='undefined'&&typeof IM29.prototype.dispatch==='undefined'&&typeof IM29.prototype.save==='undefined'&&typeof IM29.prototype.restore==='undefined',results);
 const blockerCount=results.filter(value=>!value.pass).length;
 return Object.freeze({status:blockerCount===0?'PASS':'FAIL',blockerCount,results:Object.freeze(results)});
}
