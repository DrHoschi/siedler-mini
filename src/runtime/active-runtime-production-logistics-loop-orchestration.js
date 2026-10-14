import { StableIdAllocator } from '../world/stable-id.js';
import { ActiveRuntimeProductionSupplyOrchestration as Supply } from './active-runtime-production-supply-orchestration.js';
import { CarrierAssignmentService } from '../transport/carrier-assignment-service.js';
import { CarrierContract } from '../transport/carrier-contract.js';
import { PostContinueTransportExecutionAdapter } from '../transport/post-continue-transport-execution-adapter.js';
import { WorkforceAwareTransportDispatchIntegration as Dispatch } from '../domain/workforce-aware-transport-dispatch-integration.js';

function allocator(a) {
  const ids = new StableIdAllocator();
  for (const id of a.resourceDemands.ids()) ids.reserve(id);
  for (const item of a.buildingStockTransportReservations) ids.reserve(item.id);
  for (const item of a.workforceAssignments) if (item.assignmentId) ids.reserve(item.assignmentId);
  for (const item of a.carrierBindings) if (item.workforceAssignmentId) ids.reserve(item.workforceAssignmentId);
  // Job ids persist after completion. Their sequences also fence transient assignment allocation.
  for (const id of a.domains.jobs.ids()) ids.reserve(`assignment:${id.split(':')[1]}`);
  return ids;
}
function composition(state) { return Object.freeze({kind:'active-runtime-composition',authoritative:state}); }

export class ActiveRuntimeProductionLogisticsLoopOrchestration {
  #runtime; #get; #publish; #output; #reevaluate; #resolve; #adapters=new WeakMap(); #registrations=new Map(); #identity=null; #off; #flushing=false;
  constructor({runtime,getComposition,publishComposition,outputAvailability,reEvaluation,resolveProductionContext}={}) {
    if (!runtime?.scheduler?.onCompletedStep || typeof getComposition!=='function' || typeof publishComposition!=='function' || !outputAvailability?.publishSettledComposition || !reEvaluation?.requestSettledOutput || typeof resolveProductionContext!=='function') throw new TypeError('existing Runtime production/logistics seams required');
    this.#runtime=runtime;this.#get=getComposition;this.#publish=publishComposition;this.#output=outputAvailability;this.#reevaluate=reEvaluation;this.#resolve=resolveProductionContext;
    this.#off=runtime.scheduler.onCompletedStep(()=>this.flush());
  }
  #supply(get=this.#get,publish=this.#publish) { return new Supply({getComposition:get,publishComposition:publish}); }
  #triggerOutputs() {
    const a=this.#get().authoritative,ids=allocator(a),supply=this.#supply(),results=[];
    for (const id of a.resourceState.ids().slice().sort()) {
      const resource=a.resourceState.get(id);
      if (resource?.metadata?.source!=='IM-27_PRODUCTION_OUTPUT') continue;
      // IM-36 owns binding, availability, duplicate demands, claims/jobs and source reservation.
      results.push(supply.triggerSettledOutputHqDelivery({resource,reservationId:ids.next('transport-reservation')}));
    }
    return results;
  }
  publishSettledComposition(value) {
    const result=this.#output.publishSettledComposition(value);
    this.#triggerOutputs();
    return result;
  }
  publishDeliveredSupply({state,job,execution,delivery,deliveryCommit,reservation,workforceAssignmentId}) {
    const worker=state.workforceAssignments.find(value=>value.personId===execution.unitId);
    if (!workforceAssignmentId || worker?.availability!=='ASSIGNED' || worker.assignmentId!==workforceAssignmentId || reservation.jobId!==job.id) throw new Error('exact persisted transport/workforce/reservation binding required');
    const claim=state.resourceClaims.get(job.claimId),demand=state.resourceDemands.get(job.demandId),resource=state.resourceState.get(job.resourceId);
    if (claim?.state!=='CONSUMED' || claim.resourceId!==job.resourceId || claim.consumerId!==job.targetId || claim.amount!==job.amount || demand?.consumerId!==job.targetId || resource?.ownerId!==reservation.sourceBuildingId) throw new Error('contradictory delivered production logistics evidence');
    const dispatch=Object.freeze({kind:'workforce-aware-transport-dispatch',job,reservation,workforce:{personId:execution.unitId,assignedState:worker},executionAssignment:{jobId:job.id,unitId:execution.unitId},compatibilityRefs:{assignmentId:workforceAssignmentId}});
    let local=composition(state);
    const ids=allocator(state),supply=this.#supply(()=>local,value=>{local=value;});
    const stock=id=>state.buildingStocks.find(value=>value.buildingId===id&&value.resourceTypeId===job.definitionId);
    if (demand.metadata?.source==='IM-36_SETTLED_OUTPUT_HQ_DELIVERY') {
      if (demand.metadata.resourceId!==resource.id || demand.metadata.sourceBuildingId!==resource.ownerId || demand.metadata.hqBuildingId!==job.targetId || demand.metadata.resourceTypeId!==job.definitionId) throw new Error('source-bound HQ demand mismatch');
      supply.publishSourceBoundOutputToHq({dispatch,delivery,deliveryCommit,reservationId:reservation.id,workforceState:worker,hqBuildingId:job.targetId,allocateReservationId:()=>ids.next('transport-reservation')});
    } else if (demand.metadata?.source==='IM-23_PRODUCTION_INPUT') {
      if (demand.metadata.buildingId!==job.targetId || demand.metadata.resourceTypeId!==job.definitionId) throw new Error('production input demand mismatch');
      supply.publishDeliveredBuildingStock({dispatch,delivery,deliveryCommit,reservation,workforceState:worker,sourceStock:stock(reservation.sourceBuildingId),targetStock:stock(job.targetId)});
    } else throw new Error('production logistics publication requires IM-36 or IM-23 demand');
    return local.authoritative;
  }
  createTransportAdapter(options) {
    let adapter;
    adapter=new PostContinueTransportExecutionAdapter({...options,
      publishDeliveredSupply:value=>this.publishDeliveredSupply(value),
      getSupplyState:state=>this.#get().authoritative.resourceState===state.resourceState?this.#get().authoritative:null,
      publishSupplyState:state=>{
        const current=this.#get();
        if (current.authoritative.resourceState!==state.resourceState) return;
        this.#publish(Object.freeze({...current,authoritative:Object.freeze({...current.authoritative,...adapter.authoritativeSupplyState(),
          get carrierBindings(){return adapter.authoritativeTransportState().carrierBindings;},
          get transportExecutions(){return adapter.authoritativeTransportState().transportExecutions;},
        })}));
      },
    });
    this.#adapters.set(options.state.resourceState,adapter);
    return adapter;
  }
  #transport() {
    const a=this.#get().authoritative;
    let adapter=this.#adapters.get(a.resourceState);
    if (!adapter) {
      const service=new CarrierAssignmentService({carriers:a.domains.units.ids().map(id=>a.domains.units.get(id)?.carrier).filter(Boolean),assignments:a.carrierBindings});
      const active=a.carrierBindings.map(binding=>({jobId:binding.jobId,unitId:binding.unitId,workforceAssignmentId:binding.workforceAssignmentId??null,job:a.domains.jobs.get(binding.jobId),assignment:service.assignmentForJob(binding.jobId),execution:a.transportExecutions.find(value=>value.jobId===binding.jobId)}));
      adapter=this.createTransportAdapter({state:a,transport:{carrierAssignments:service,active}});
    }
    return adapter;
  }
  #registerTransports(adapter) {
    for (const execution of adapter.authoritativeTransportState().transportExecutions) {
      const id=execution.jobId;
      if (this.#registrations.has(id) || this.#runtime.scheduler.has(`transport-recovery:${id}`) || this.#runtime.scheduler.has(`transport-supply-publication:${id}`)) continue;
      // Delivered crash windows belong to IM-20F, never to a new settlement path.
      if (execution.state==='DELIVERED') continue;
      const tick=adapter.tickFor(execution);
      let off=()=>{};
      off=this.#runtime.scheduler.register({id:`im37-transport:${id}`,phase:'movement',tick:dt=>{
        if (!adapter.hasActiveExecution(id)) {off();this.#registrations.delete(id);return;}
        const result=tick(dt);
        if (!adapter.hasActiveExecution(id)) {off();this.#registrations.delete(id);}
        return result;
      }});
      this.#registrations.set(id,off);
    }
  }
  flush() {
    if (this.#flushing || this.#runtime.state!=='RUNNING') return Object.freeze({kind:'im37-logistics-loop-step',status:'NOT_RUNNING',results:[]});
    this.#flushing=true;
    const results=[];
    try {
      let a=this.#get().authoritative;
      if (this.#identity!==a.resourceState) {for(const off of this.#registrations.values())off();this.#registrations.clear();this.#identity=a.resourceState;}
      this.#output.publishSettledComposition(this.#get());
      results.push(...this.#triggerOutputs());
      let ids=allocator(this.#get().authoritative);
      const supply=this.#supply();
      for (const recipe of a.productionRecipes.slice().sort((x,y)=>x.buildingId.localeCompare(y.buildingId))) {
        const current=this.#get(),owners=current.authoritative,context=this.#resolve(recipe.buildingId,current);
        if (!context?.workforceAssignment) continue;
        const outbound=owners.buildingStockTransportReservations.some(r=>r.state==='ACTIVE'&&r.sourceBuildingId===recipe.buildingId)||owners.resourceState.ids().some(id=>{const r=owners.resourceState.get(id);return r.ownerId===recipe.buildingId&&r.metadata?.source==='IM-27_PRODUCTION_OUTPUT'&&r.state!=='CONSUMED';});
        if (context.execution.status==='BLOCKED_INPUT') {
          const fresh=context.execution.missingInputs.filter(input=>!owners.resourceDemands.ids().map(id=>owners.resourceDemands.get(id)).some(d=>d.consumerId===recipe.buildingId&&d.definitionId===input.resourceTypeId&&d.metadata?.source==='IM-23_PRODUCTION_INPUT'&&['OPEN','PARTIAL','RESERVED'].includes(d.status)));
          results.push(supply.evaluateAndConnect({buildingId:recipe.buildingId,workforceAssignment:context.workforceAssignment,recipe:context.recipe,demandIds:fresh.map(()=>ids.next('demand')),allocateReservationId:()=>ids.next('transport-reservation')}));
        } else if (context.execution.status==='READY'&&!outbound&&!owners.productionCycleProgressions?.some(p=>p.buildingId===recipe.buildingId)) {
          const returns=owners.buildingStockTransportReservations.filter(r=>r.state==='RELEASED'&&r.targetBuildingId===recipe.buildingId&&r.jobId).filter(r=>{
            const job=owners.domains.jobs.get(r.jobId),d=job?owners.resourceDemands.get(job.demandId):null;
            return job?.status==='RELEASED'&&d?.metadata?.source==='IM-23_PRODUCTION_INPUT'&&owners.resourceClaims.get(job.claimId)?.state==='CONSUMED';
          });
          if (returns.length) results.push(this.#reevaluate.requestProductionInputReturnDelivery({publication:{kind:'im24-delivered-supply-publication',status:'DELIVERED_TO_BUILDING_STOCK',settlement:{reservation:returns[0],targetStock:{buildingId:recipe.buildingId}}}}));
          else if (owners.productionEffectReceipts.some(r=>r.buildingId===recipe.buildingId&&owners.productionSettlementIds.includes(r.settlementId))) this.#reevaluate.request({trigger:'SETTLED_PRODUCTION_OUTPUT',buildingId:recipe.buildingId});
        }
      }
      // Covers Continue after HQ intake but before reconnection, without an extra receipt ledger.
      a=this.#get().authoritative;
      for (const stock of a.buildingStocks.filter(stock=>stock.quantity>0&&a.domains.buildings.get(stock.buildingId)?.identity?.definitionId==='HQ')) {
        results.push(supply.reconnectHqIntakeToProductionInputs({hqBuildingId:stock.buildingId,resourceTypeId:stock.resourceTypeId,allocateReservationId:()=>ids.next('transport-reservation')}));
      }
      const adapter=this.#transport();
      a=this.#get().authoritative;
      for (const job of a.domains.jobs.ids().slice().sort().map(id=>a.domains.jobs.get(id))) {
        if (job.status!=='PENDING'||adapter.hasActiveExecution(job.id)) continue;
        const reservations=a.buildingStockTransportReservations.filter(r=>r.jobId===job.id&&r.state==='ACTIVE');
        if (reservations.length!==1) continue;
        const candidates=a.workforceProfiles.map(profile=>({profile,state:this.#get().authoritative.workforceAssignments.find(w=>w.personId===profile.personId)})).filter(candidate=>candidate.state?.availability==='FREE'&&a.domains.units.get(candidate.profile.personId)?.carrier&&CarrierContract.isSuitableForJob(a.domains.units.get(candidate.profile.personId).carrier,job));
        if (!candidates.length) {results.push({status:'WAITING_FOR_CARRIER',jobId:job.id});continue;}
        const dispatch=Dispatch.dispatch({reservation:reservations[0],candidates,projectionRefs:{jobId:job.id,claimId:job.claimId,demandId:job.demandId,resourceId:job.resourceId,assignmentId:ids.next('assignment')},eligibility:{preconditionsPassed:true}});
        if (dispatch) adapter.installDispatch(dispatch);
      }
      this.#registerTransports(adapter);
      results.push(this.#reevaluate.flush());
      return Object.freeze({kind:'im37-logistics-loop-step',status:'COMPLETED',results:Object.freeze(results)});
    } finally {this.#flushing=false;}
  }
  dispose(){this.#off?.();for(const off of this.#registrations.values())off();this.#registrations.clear();}
}
