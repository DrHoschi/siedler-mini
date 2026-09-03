import { WorldStore } from '../world/world-store.js';
import { MapStructure } from '../world/map-structure.js';
import { CoreDomainStores } from '../domain/core-domain-stores.js';
import { ResourceState } from '../resources/resource-state.js';
import { ResourceClaims } from '../resources/resource-claims.js';
import { ResourceDemands } from '../resources/resource-demands.js';
import { DeliverySettlementContract } from '../transport/delivery-settlement-contract.js';
import { DeliverySettlementService } from '../transport/delivery-settlement-service.js';

export function runCr07bSelfTest() {
  const results=[];
  const check=(name,fn)=>{try{results.push({name,pass:!!fn()});}catch(error){results.push({name,pass:false,error:String(error?.message||error)});}};
  const rejects=fn=>{try{fn();return false;}catch{return true;}};

  const world=new WorldStore();
  const map=new MapStructure(world,{width:2,height:2});
  const domains=new CoreDomainStores();
  const resources=new ResourceState({world,resourceStore:domains.resources});
  const claims=new ResourceClaims({resourceState:resources});
  const demands=new ResourceDemands({resourceState:resources,claims});
  const wood=resources.createDefinition({technicalName:'wood.log'});
  const resource=resources.createResource({definitionId:wood.id,amount:3,location:{kind:'cell',refId:map.cellIdAt(0,0)}});
  const demand=demands.create({consumerId:'building:00000001',definitionId:wood.id,amount:3});
  const claim=demands.reserve({demandId:demand.id,resourceId:resource.id,amount:3});
  const job=Object.freeze({id:'transport-job:00000001',kind:'transport-job',claimId:claim.id,demandId:demand.id,resourceId:resource.id,definitionId:wood.id,targetId:demand.consumerId,amount:3,status:'PENDING'});
  const execution=Object.freeze({kind:'transport-execution',jobId:job.id,unitId:'unit:00000001',state:'DELIVERED'});
  const delivery=Object.freeze({kind:'delivered-cargo',jobId:job.id,unitId:execution.unitId,resourceId:resource.id,amount:3,targetId:job.targetId});
  const settlement=DeliverySettlementContract.fromDelivered({job,execution,delivery,claim:claims.get(claim.id),demand:demands.get(demand.id),resource:resources.get(resource.id)});
  const service=new DeliverySettlementService({resources,claims,demands});

  check('precondition-is-active-reserved-and-pending',()=>claims.get(claim.id).state==='ACTIVE'&&resources.get(resource.id).state==='RESERVED'&&demands.get(demand.id).reservedAmount===3&&job.status==='PENDING');
  const committed=service.commit({settlement,job,execution,delivery});
  check('claim-active-to-consumed',()=>committed.claim.state==='CONSUMED'&&claims.get(claim.id).state==='CONSUMED');
  check('resource-balance-updates-through-existing-claim-contract',()=>resources.get(resource.id).state==='CONSUMED'&&claims.reservedAmount(resource.id)===0&&claims.consumedAmount(resource.id)===3&&claims.availableAmount(resource.id)===0);
  check('demand-progress-updates-to-fulfilled',()=>{const d=demands.get(demand.id);return d.reservedAmount===0&&d.fulfilledAmount===3&&d.remainingAmount===0&&d.status==='FULFILLED';});
  check('transport-job-execution-delivery-remain-untouched',()=>job.status==='PENDING'&&execution.state==='DELIVERED'&&delivery.kind==='delivered-cargo');
  check('settlement-cannot-be-committed-twice',()=>rejects(()=>service.commit({settlement,job,execution,delivery})));
  check('cr07b-adds-no-job-or-carrier-release',()=>domains.jobs.size===0&&domains.units.size===0&&job.status==='PENDING');
  check('cr07b-adds-no-pathfinding-routing-or-movement',()=>{const serialized=JSON.stringify(committed);return !serialized.includes('route')&&!serialized.includes('path')&&!serialized.includes('position')&&!serialized.includes('velocity')&&!serialized.includes('speed');});

  return Object.freeze({pass:results.every(r=>r.pass),results:Object.freeze(results.map(Object.freeze))});
}
