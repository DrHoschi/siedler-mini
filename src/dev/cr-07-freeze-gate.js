import { WorldStore } from '../world/world-store.js';
import { MapStructure } from '../world/map-structure.js';
import { CoreDomainStores } from '../domain/core-domain-stores.js';
import { ResourceState } from '../resources/resource-state.js';
import { ResourceClaims } from '../resources/resource-claims.js';
import { ResourceDemands } from '../resources/resource-demands.js';
import { CarrierAssignmentService } from '../transport/carrier-assignment-service.js';
import { DeliverySettlementContract } from '../transport/delivery-settlement-contract.js';
import { DeliverySettlementService } from '../transport/delivery-settlement-service.js';
import { TransportCompletionService } from '../transport/transport-completion-service.js';
import { runCr07aSelfTest } from './cr-07a-self-test.js';
import { runCr07bSelfTest } from './cr-07b-self-test.js';
import { runCr07cSelfTest } from './cr-07c-self-test.js';

export function runCr07FreezeGate() {
  const results=[];
  const check=(name,fn)=>{try{results.push({name,pass:!!fn()});}catch(error){results.push({name,pass:false,error:String(error?.message||error)});}};
  const rejects=fn=>{try{fn();return false;}catch{return true;}};

  const a=runCr07aSelfTest(), b=runCr07bSelfTest(), c=runCr07cSelfTest();
  check('cr07a-regression-pass',()=>a.pass);
  check('cr07b-regression-pass',()=>b.pass);
  check('cr07c-regression-pass',()=>c.pass);

  const setup=()=>{
    const world=new WorldStore();
    const map=new MapStructure(world,{width:2,height:2});
    const domains=new CoreDomainStores();
    const resources=new ResourceState({world,resourceStore:domains.resources});
    const claims=new ResourceClaims({resourceState:resources});
    const demands=new ResourceDemands({resourceState:resources,claims});
    const type=resources.createDefinition({technicalName:'wood.log'});
    const resource=resources.createResource({definitionId:type.id,amount:3,location:{kind:'cell',refId:map.cellIdAt(0,0)}},{id:'resource:00000001'});
    const demand=demands.create({consumerId:'building:00000001',definitionId:type.id,amount:3},{id:'demand:00000001'});
    const claim=demands.reserve({demandId:demand.id,resourceId:resource.id,amount:3});
    const job=domains.jobs.create({claimId:claim.id,demandId:demand.id,resourceId:resource.id,definitionId:type.id,sourceLocation:resource.location,targetId:demand.consumerId,amount:3,status:'PENDING'},{id:'transport-job:00000001'});
    const carriers=new CarrierAssignmentService({carriers:[{unitId:'unit:00000001',capacity:3,state:'AVAILABLE',location:{kind:'cell',refId:map.cellIdAt(0,0)}}]});
    const assignment=carriers.assign(job);
    const execution=Object.freeze({kind:'transport-execution',jobId:job.id,unitId:assignment.unitId,state:'DELIVERED'});
    const delivery=Object.freeze({kind:'delivered-cargo',jobId:job.id,unitId:assignment.unitId,resourceId:resource.id,amount:3,targetId:job.targetId});
    const settlement=DeliverySettlementContract.fromDelivered({job,execution,delivery,claim:claims.get(claim.id),demand:demands.get(demand.id),resource:resources.get(resource.id)});
    const settlementService=new DeliverySettlementService({resources,claims,demands});
    const completionService=new TransportCompletionService({jobStore:domains.jobs,carrierAssignments:carriers});
    return {domains,resources,claims,demands,job,carriers,assignment,execution,delivery,settlement,settlementService,completionService};
  };

  check('full-chain-settles-before-job-and-carrier-release',()=>{const s=setup();const commit=s.settlementService.commit({settlement:s.settlement,job:s.job,execution:s.execution,delivery:s.delivery});return commit.claim.state==='CONSUMED'&&s.domains.jobs.get(s.job.id).status==='PENDING'&&s.carriers.carrierForJob(s.job.id)?.state==='OCCUPIED';});
  check('full-chain-completes-job-then-releases-carrier',()=>{const s=setup();const commit=s.settlementService.commit({settlement:s.settlement,job:s.job,execution:s.execution,delivery:s.delivery});const done=s.completionService.complete({settlementCommit:commit,execution:s.execution});return done.job.status==='RELEASED'&&done.carrierRelease.released===true&&done.carrierRelease.carrier.state==='AVAILABLE'&&s.carriers.assignmentForJob(s.job.id)===null;});
  check('final-resource-claim-demand-invariants-hold',()=>{const s=setup();const commit=s.settlementService.commit({settlement:s.settlement,job:s.job,execution:s.execution,delivery:s.delivery});s.completionService.complete({settlementCommit:commit,execution:s.execution});const d=s.demands.get(s.job.demandId);return s.claims.get(s.job.claimId).state==='CONSUMED'&&s.resources.get(s.job.resourceId).state==='CONSUMED'&&s.claims.reservedAmount(s.job.resourceId)===0&&s.claims.consumedAmount(s.job.resourceId)===3&&d.reservedAmount===0&&d.fulfilledAmount===3&&d.remainingAmount===0&&d.status==='FULFILLED';});
  check('completion-rejected-before-cr07b-commit',()=>{const s=setup();return rejects(()=>s.completionService.complete({settlementCommit:{kind:'delivery-settlement-commit',settlement:s.settlement,claim:s.claims.get(s.job.claimId),resource:s.resources.get(s.job.resourceId),demand:s.demands.get(s.job.demandId)},execution:s.execution}));});
  check('settlement-and-completion-are-single-use',()=>{const s=setup();const commit=s.settlementService.commit({settlement:s.settlement,job:s.job,execution:s.execution,delivery:s.delivery});const first=s.completionService.complete({settlementCommit:commit,execution:s.execution});return first.job.status==='RELEASED'&&rejects(()=>s.settlementService.commit({settlement:s.settlement,job:s.job,execution:s.execution,delivery:s.delivery}))&&rejects(()=>s.completionService.complete({settlementCommit:commit,execution:s.execution}));});
  check('freeze-scope-adds-no-pathfinding-routing-or-movement',()=>{const s=setup();const commit=s.settlementService.commit({settlement:s.settlement,job:s.job,execution:s.execution,delivery:s.delivery});const done=s.completionService.complete({settlementCommit:commit,execution:s.execution});const serialized=JSON.stringify({settlement:s.settlement,commit,done});return !serialized.includes('route')&&!serialized.includes('path')&&!serialized.includes('position')&&!serialized.includes('velocity')&&!serialized.includes('speed');});

  const blockerCount=results.filter(r=>!r.pass).length;
  return Object.freeze({pass:blockerCount===0,blockerCount,results:Object.freeze(results.map(Object.freeze))});
}
