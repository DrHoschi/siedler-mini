import { WorldStore } from '../world/world-store.js';
import { CoreDomainStores } from '../domain/core-domain-stores.js';
import { ResourceState } from '../resources/resource-state.js';
import { ResourceClaims } from '../resources/resource-claims.js';
import { ResourceDemands } from '../resources/resource-demands.js';
import { ResourceMatching } from '../resources/resource-matching.js';
import { ResourceAssignment } from '../resources/resource-assignment.js';
import { TransportJobService } from '../transport/transport-job-service.js';
import { ProductionInputExistingLogisticsIntegration } from '../domain/production-input-existing-logistics-integration.js';

function setup({sourceAmount=5}={}){
 const world=new WorldStore();world.create('building',{}, {id:'building:00000001'});world.create('building',{}, {id:'building:00000002'});
 const domains=new CoreDomainStores(),resources=new ResourceState({world,resourceStore:domains.resources});
 const wood=resources.createDefinition({technicalName:'wood.log'},{id:'resource-type:00000001'});
 if(sourceAmount>0)resources.createResource({definitionId:wood.id,amount:sourceAmount,location:{kind:'owner',refId:'building:00000001'},ownerId:'building:00000001'},{id:'resource:00000001'});
 const claims=new ResourceClaims({resourceState:resources}),demands=new ResourceDemands({resourceState:resources,claims});
 const matching=new ResourceMatching({resourceState:resources,claims,demands}),assignment=new ResourceAssignment({resourceState:resources,claims,demands});
 const jobs=new TransportJobService({jobStore:domains.jobs,claims,demands,resourceState:resources});
 const integration=new ProductionInputExistingLogisticsIntegration({resourceState:resources,claims,demands,matching,assignment,transportJobs:jobs});
 const execution=Object.freeze({kind:'operational-production-execution',buildingId:'building:00000002',status:'BLOCKED_INPUT',missingInputs:Object.freeze([{resourceTypeId:wood.id,required:4,available:1}])});
 return {domains,resources,claims,demands,integration,execution,wood};
}
function check(name,fn,results){try{results.push(Object.freeze({name,pass:!!fn()}));}catch(error){results.push(Object.freeze({name,pass:false,error:String(error?.message||error)}));}}
export function runIM23SelfTest(){
 const results=[];
 check('blocked-input-admits-one-production-demand',()=>{const s=setup();const a=s.integration.admitBlockedInputs({execution:s.execution,demandIds:['demand:00000021']});const r=a.requirements[0],d=s.demands.get(r.demandId);return r.created&&d.targetAmount===3&&d.remainingAmount===3&&d.metadata.source==='IM-23_PRODUCTION_INPUT';},results);
 check('repeat-reuses-open-demand-without-duplicate-quantity',()=>{const s=setup();const a=s.integration.admitBlockedInputs({execution:s.execution,demandIds:['demand:00000021']});const b=s.integration.admitBlockedInputs({execution:s.execution,demandIds:[]});return !b.requirements[0].created&&a.requirements[0].demandId===b.requirements[0].demandId&&s.demands.ids().length===1&&s.demands.get(a.requirements[0].demandId).targetAmount===3;},results);
 check('active-claims-are-authoritative-bound-supply',()=>{const s=setup();const a=s.integration.admitBlockedInputs({execution:s.execution,demandIds:['demand:00000021']});const out=s.integration.connect({requirement:a.requirements[0],sourceStocks:[{buildingId:'building:00000001',resourceTypeId:s.wood.id,quantity:5}],reservationIds:['transport-reservation:00000021']});const d=s.demands.get(a.requirements[0].demandId);return out.status==='DISPATCHED_TO_EXISTING_LOGISTICS'&&d.reservedAmount===3&&d.remainingAmount===0&&d.status==='RESERVED'&&out.transportJobs.jobs.length===1;},results);
 check('consumed-claims-become-fulfilled-without-new-ledger',()=>{const s=setup();const a=s.integration.admitBlockedInputs({execution:s.execution,demandIds:['demand:00000021']});const out=s.integration.connect({requirement:a.requirements[0],sourceStocks:[{buildingId:'building:00000001',resourceTypeId:s.wood.id,quantity:5}],reservationIds:['transport-reservation:00000021']});s.demands.consumeClaim(out.assignment.claimIds[0]);const d=s.demands.get(a.requirements[0].demandId);return d.fulfilledAmount===3&&d.reservedAmount===0&&d.remainingAmount===0&&d.status==='FULFILLED';},results);
 check('no-available-resource-waits-without-claim-reservation-or-job',()=>{const s=setup({sourceAmount:0});const a=s.integration.admitBlockedInputs({execution:s.execution,demandIds:['demand:00000021']});const out=s.integration.connect({requirement:a.requirements[0]});return out.status==='WAITING_FOR_AVAILABLE_RESOURCES'&&s.claims.ids().length===0&&s.domains.jobs.size===0&&out.reservations.length===0;},results);
 check('existing-building-stock-reservation-authority-is-used',()=>{const s=setup();const a=s.integration.admitBlockedInputs({execution:s.execution,demandIds:['demand:00000021']});const out=s.integration.connect({requirement:a.requirements[0],sourceStocks:[{buildingId:'building:00000001',resourceTypeId:s.wood.id,quantity:5}],reservationIds:['transport-reservation:00000021']});const r=out.reservations[0],j=out.transportJobs.jobs[0];return r.state==='ACTIVE'&&r.amount===3&&j.claimId===out.assignment.claimIds[0]&&j.demandId===a.requirements[0].demandId&&j.targetId==='building:00000002';},results);
 check('im23-does-not-own-production-runtime-or-settlement',()=>typeof ProductionInputExistingLogisticsIntegration.prototype.settle==='undefined'&&typeof ProductionInputExistingLogisticsIntegration.prototype.produce==='undefined'&&typeof ProductionInputExistingLogisticsIntegration.prototype.schedule==='undefined'&&typeof ProductionInputExistingLogisticsIntegration.prototype.dispatch==='undefined',results);
 const blockerCount=results.filter(x=>!x.pass).length;return Object.freeze({status:blockerCount===0?'PASS':'FAIL',blockerCount,results:Object.freeze(results)});
}
