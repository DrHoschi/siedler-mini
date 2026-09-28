import { WorldStore } from '../world/world-store.js';
import { CoreDomainStores } from '../domain/core-domain-stores.js';
import { ResourceState } from '../resources/resource-state.js';
import { ResourceClaims } from '../resources/resource-claims.js';
import { ResourceDemands } from '../resources/resource-demands.js';
import { ResourceMatching } from '../resources/resource-matching.js';
import { ProductionOutputResourceAvailabilityIntegration as IM27 } from '../domain/production-output-resource-availability-integration.js';

function fixture(){
  const world=new WorldStore(),domains=new CoreDomainStores();
  world.create('building',{role:'producer'},{id:'building:00000001'});
  world.create('building',{role:'consumer'},{id:'building:00000002'});
  const resourceState=new ResourceState({world,resourceStore:domains.resources});
  const claims=new ResourceClaims({resourceState});
  const demands=new ResourceDemands({resourceState,claims});
  const matching=new ResourceMatching({resourceState,claims,demands});
  const boards=resourceState.createDefinition({technicalName:'boards'},{id:'resource-type:00000001'});
  const stone=resourceState.createDefinition({technicalName:'stone'},{id:'resource-type:00000002'});
  const receipt=Object.freeze({kind:'production-effect-receipt',settlementId:'production-settlement:test:1',buildingId:'building:00000001',
    inputs:Object.freeze([]),outputs:Object.freeze([{resourceTypeId:boards.id,amount:2}]),
    stockBefore:Object.freeze([{resourceTypeId:boards.id,quantity:0}]),stockAfter:Object.freeze([{resourceTypeId:boards.id,quantity:2}])});
  return {world,domains,resourceState,claims,demands,matching,boards,stone,receipt,
    settledIds:Object.freeze([receipt.settlementId]),
    buildingStocks:Object.freeze([{kind:'building-stock',buildingId:'building:00000001',resourceTypeId:boards.id,quantity:2}])};
}
function check(name,fn,results){try{results.push(Object.freeze({name,pass:!!fn()}));}catch(error){results.push(Object.freeze({name,pass:false,error:String(error?.message||error)}));}}
function rejects(fn){try{fn();return false;}catch{return true;}}

export function runIM27SelfTest(){
  const results=[];
  check('settled-production-output-materializes-once',()=>{const f=fixture();const a=IM27.materialize(f),b=IM27.materialize(f);return a.status==='MATERIALIZED'&&a.mutation&&a.resources[0].amount===2&&a.resources[0].ownerId==='building:00000001'&&b.status==='ALREADY_MATERIALIZED'&&!b.mutation&&f.resourceState.ids().length===1;},results);
  check('missing-settlement-fence-materializes-nothing',()=>{const f=fixture();const r=IM27.materialize({...f,settledIds:[]});return r.status==='NOT_MATERIALIZED'&&!r.mutation&&f.resourceState.ids().length===0;},results);
  check('representation-cannot-exceed-authoritative-building-stock',()=>{const f=fixture();return rejects(()=>IM27.materialize({...f,buildingStocks:[{kind:'building-stock',buildingId:'building:00000001',resourceTypeId:f.boards.id,quantity:1}]}))&&f.resourceState.ids().length===0;},results);
  check('multiple-output-types-remain-separated',()=>{const f=fixture();const receipt={...f.receipt,outputs:[{resourceTypeId:f.boards.id,amount:2},{resourceTypeId:f.stone.id,amount:1}],stockBefore:[{resourceTypeId:f.boards.id,quantity:0},{resourceTypeId:f.stone.id,quantity:0}],stockAfter:[{resourceTypeId:f.boards.id,quantity:2},{resourceTypeId:f.stone.id,quantity:1}]};const stocks=[...f.buildingStocks,{kind:'building-stock',buildingId:'building:00000001',resourceTypeId:f.stone.id,quantity:1}];const r=IM27.materialize({...f,receipt,settledIds:[receipt.settlementId],buildingStocks:stocks});return r.resources.length===2&&new Set(r.resources.map(x=>x.definitionId)).size===2&&r.resources.every(x=>x.ownerId==='building:00000001');},results);
  check('existing-demand-discovers-produced-resource-through-frozen-matching',()=>{const f=fixture();const r=IM27.materialize(f);const d=f.demands.create({consumerId:'building:00000002',definitionId:f.boards.id,amount:2},{id:'demand:00000001'});const m=f.matching.matchDemand(d.id);return r.status==='MATERIALIZED'&&m.matchedAmount===2&&m.selections[0].resourceId===r.resources[0].id&&m.selections[0].ownerId==='building:00000001';},results);
  check('restored-equivalent-existing-effect-is-not-rematerialized',()=>{const f=fixture();f.resourceState.createResource({definitionId:f.boards.id,amount:2,state:'AVAILABLE',location:{kind:'owner',refId:'building:00000001'},ownerId:'building:00000001',metadata:{source:'IM-27_PRODUCTION_OUTPUT',effectKey:`${f.receipt.settlementId}|${f.boards.id}`,settlementId:f.receipt.settlementId,buildingId:'building:00000001',resourceTypeId:f.boards.id}},{id:'resource:00000077'});const r=IM27.materialize(f);return r.status==='ALREADY_MATERIALIZED'&&!r.mutation&&f.resourceState.ids().length===1&&r.resources[0].id==='resource:00000077';},results);
  check('im27-does-not-own-demand-transport-production-or-savegame-authority',()=>typeof IM27.createDemand==='undefined'&&typeof IM27.dispatch==='undefined'&&typeof IM27.produce==='undefined'&&typeof IM27.save==='undefined'&&typeof IM27.restore==='undefined',results);
  const blockerCount=results.filter(x=>!x.pass).length;
  return Object.freeze({status:blockerCount===0?'PASS':'FAIL',blockerCount,results:Object.freeze(results)});
}
