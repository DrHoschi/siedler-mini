import { CoreDomainStores } from '../domain/core-domain-stores.js';
import { CarrierAssignmentService } from '../transport/carrier-assignment-service.js';
import { TransportCompletionService } from '../transport/transport-completion-service.js';

export function runCr07cSelfTest() {
  const results=[];
  const check=(name,fn)=>{try{results.push({name,pass:!!fn()});}catch(error){results.push({name,pass:false,error:String(error?.message||error)});}};
  const rejects=fn=>{try{fn();return false;}catch{return true;}};

  const setup=()=>{
    const domains=new CoreDomainStores();
    const job=domains.jobs.create({
      claimId:'claim:00000001',demandId:'demand:00000001',resourceId:'resource:00000001',definitionId:'resource-type:00000001',
      sourceLocation:{kind:'cell',refId:'cell:00000001'},targetId:'building:00000001',amount:3,status:'PENDING'
    },{id:'transport-job:00000001'});
    const carriers=new CarrierAssignmentService({carriers:[{unitId:'unit:00000001',capacity:3,state:'AVAILABLE',location:{kind:'cell',refId:'cell:00000001'}}]});
    const assignment=carriers.assign(job);
    const execution=Object.freeze({kind:'transport-execution',jobId:job.id,unitId:assignment.unitId,state:'DELIVERED'});
    const settlement=Object.freeze({kind:'delivery-settlement',jobId:job.id,executionJobId:job.id,unitId:assignment.unitId,resourceId:job.resourceId,claimId:job.claimId,demandId:job.demandId,targetId:job.targetId,amount:job.amount});
    const settlementCommit=Object.freeze({kind:'delivery-settlement-commit',settlement,claim:Object.freeze({id:job.claimId,state:'CONSUMED'}),resource:Object.freeze({id:job.resourceId,state:'CONSUMED'}),demand:Object.freeze({id:job.demandId,status:'FULFILLED'})});
    const service=new TransportCompletionService({jobStore:domains.jobs,carrierAssignments:carriers});
    return {domains,job,carriers,assignment,execution,settlementCommit,service};
  };

  check('precondition-job-pending-carrier-occupied',()=>{const s=setup();return s.domains.jobs.get(s.job.id).status==='PENDING'&&s.carriers.carrierForJob(s.job.id)?.state==='OCCUPIED';});
  check('successful-settlement-completes-job-and-releases-carrier',()=>{const s=setup();const r=s.service.complete({settlementCommit:s.settlementCommit,execution:s.execution});return r.job.status==='RELEASED'&&r.carrierRelease.released===true&&r.carrierRelease.carrier.state==='AVAILABLE'&&s.carriers.assignmentForJob(s.job.id)===null;});
  check('completion-requires-successful-cr07b-settlement-commit',()=>{const s=setup();return rejects(()=>s.service.complete({settlementCommit:{...s.settlementCommit,kind:'delivery-settlement'},execution:s.execution}))&&rejects(()=>s.service.complete({settlementCommit:{...s.settlementCommit,claim:{...s.settlementCommit.claim,state:'ACTIVE'}},execution:s.execution}));});
  check('completion-requires-delivered-matching-execution',()=>{const s=setup();return rejects(()=>s.service.complete({settlementCommit:s.settlementCommit,execution:{...s.execution,state:'TO_DROPOFF'}}))&&rejects(()=>s.service.complete({settlementCommit:s.settlementCommit,execution:{...s.execution,unitId:'unit:00000002'}}));});
  check('completion-requires-active-occupied-carrier-assignment',()=>{const s=setup();const terminal={...s.job,status:'CANCELLED'};s.carriers.release(terminal);return rejects(()=>s.service.complete({settlementCommit:s.settlementCommit,execution:s.execution}));});
  check('completion-does-not-touch-resource-claim-demand-payload',()=>{const s=setup();const before=JSON.stringify(s.settlementCommit);s.service.complete({settlementCommit:s.settlementCommit,execution:s.execution});return JSON.stringify(s.settlementCommit)===before&&s.settlementCommit.claim.state==='CONSUMED'&&s.settlementCommit.demand.status==='FULFILLED';});
  check('completion-cannot-run-twice',()=>{const s=setup();s.service.complete({settlementCommit:s.settlementCommit,execution:s.execution});return rejects(()=>s.service.complete({settlementCommit:s.settlementCommit,execution:s.execution}));});
  check('cr07c-adds-no-pathfinding-routing-or-movement',()=>{const s=setup();const r=s.service.complete({settlementCommit:s.settlementCommit,execution:s.execution});const serialized=JSON.stringify(r);return !serialized.includes('route')&&!serialized.includes('path')&&!serialized.includes('position')&&!serialized.includes('velocity')&&!serialized.includes('speed');});

  return Object.freeze({pass:results.every(r=>r.pass),results:Object.freeze(results.map(Object.freeze))});
}
