import { DeliverySettlementContract } from '../transport/delivery-settlement-contract.js';

export function runCr07aSelfTest() {
  const results=[];
  const check=(name,fn)=>{try{results.push({name,pass:!!fn()});}catch(error){results.push({name,pass:false,error:String(error?.message||error)});}};
  const rejects=fn=>{try{fn();return false;}catch{return true;}};

  const job=Object.freeze({id:'transport-job:00000001',kind:'transport-job',claimId:'claim:00000001',demandId:'demand:00000001',resourceId:'resource:00000001',definitionId:'resource-type:00000001',targetId:'building:00000001',amount:3,status:'PENDING'});
  const execution=Object.freeze({kind:'transport-execution',jobId:job.id,unitId:'unit:00000001',state:'DELIVERED'});
  const delivery=Object.freeze({kind:'delivered-cargo',jobId:job.id,unitId:execution.unitId,resourceId:job.resourceId,amount:3,targetId:job.targetId});
  const claim=Object.freeze({id:job.claimId,kind:'claim',resourceId:job.resourceId,amount:3,consumerId:job.targetId,demandId:job.demandId,state:'ACTIVE'});
  const demand=Object.freeze({id:job.demandId,kind:'demand',consumerId:job.targetId,definitionId:job.definitionId,status:'RESERVED'});
  const resource=Object.freeze({id:job.resourceId,kind:'resource',definitionId:job.definitionId,state:'RESERVED',amount:3});
  const fixture={job,execution,delivery,claim,demand,resource};

  check('delivered-chain-produces-frozen-settlement-contract',()=>{const s=DeliverySettlementContract.fromDelivered(fixture);return Object.isFrozen(s)&&s.kind==='delivery-settlement'&&s.jobId===job.id&&s.executionJobId===job.id&&s.unitId===execution.unitId&&s.resourceId===resource.id&&s.claimId===claim.id&&s.demandId===demand.id&&s.targetId===job.targetId&&s.amount===3;});
  check('settlement-requires-delivered-execution',()=>rejects(()=>DeliverySettlementContract.fromDelivered({...fixture,execution:{...execution,state:'TO_DROPOFF'}})));
  check('settlement-requires-pending-job-and-active-claim',()=>rejects(()=>DeliverySettlementContract.fromDelivered({...fixture,job:{...job,status:'RELEASED'}}))&&rejects(()=>DeliverySettlementContract.fromDelivered({...fixture,claim:{...claim,state:'CONSUMED'}})));
  check('settlement-requires-exact-job-delivery-carrier-resource-target-and-amount-links',()=>rejects(()=>DeliverySettlementContract.fromDelivered({...fixture,delivery:{...delivery,unitId:'unit:00000002'}}))&&rejects(()=>DeliverySettlementContract.fromDelivered({...fixture,delivery:{...delivery,resourceId:'resource:00000002'}}))&&rejects(()=>DeliverySettlementContract.fromDelivered({...fixture,delivery:{...delivery,targetId:'building:00000002'}}))&&rejects(()=>DeliverySettlementContract.fromDelivered({...fixture,delivery:{...delivery,amount:2}})));
  check('settlement-requires-exact-claim-demand-links',()=>rejects(()=>DeliverySettlementContract.fromDelivered({...fixture,claim:{...claim,demandId:'demand:00000002'}}))&&rejects(()=>DeliverySettlementContract.fromDelivered({...fixture,demand:{...demand,consumerId:'building:00000002'}})));
  check('settlement-requires-reserved-matching-resource',()=>rejects(()=>DeliverySettlementContract.fromDelivered({...fixture,resource:{...resource,state:'AVAILABLE'}}))&&rejects(()=>DeliverySettlementContract.fromDelivered({...fixture,resource:{...resource,definitionId:'resource-type:00000002'}})));
  check('cr07a-does-not-consume-release-or-mutate-inputs',()=>{const before=JSON.stringify(fixture);DeliverySettlementContract.fromDelivered(fixture);return JSON.stringify(fixture)===before&&claim.state==='ACTIVE'&&resource.state==='RESERVED'&&job.status==='PENDING';});
  check('cr07a-adds-no-pathfinding-routing-or-movement',()=>{const serialized=JSON.stringify(DeliverySettlementContract.fromDelivered(fixture));return !serialized.includes('route')&&!serialized.includes('path')&&!serialized.includes('position')&&!serialized.includes('velocity')&&!serialized.includes('speed')&&!serialized.includes('progress');});

  return Object.freeze({pass:results.every(r=>r.pass),results:Object.freeze(results.map(Object.freeze))});
}
