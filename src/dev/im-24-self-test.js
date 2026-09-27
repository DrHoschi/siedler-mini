import { createBaselineMiniworldScenario } from '../diagnostics/baseline-miniworld-scenario.js';
import { ActiveRuntimeProductionSupplyOrchestration } from '../runtime/active-runtime-production-supply-orchestration.js';
import { BuildingConstructionProgressTransitionContract } from '../domain/building-construction-progress-transition-contract.js';
import { ConstructionCompletionIntegration } from '../domain/construction-completion-integration.js';
import { OperationalBuildingAdmissionContract } from '../domain/operational-building-admission-contract.js';
import { OperationalBuildingWorkforceRequirementEligibilityContract } from '../domain/operational-building-workforce-requirement-eligibility-contract.js';
import { OperationalBuildingWorkforceAssignmentIntegration } from '../domain/operational-building-workforce-assignment-integration.js';
import { PersonWorkforceProfileContract } from '../domain/person-workforce-profile-contract.js';
import { WorkforceAssignmentStateContract } from '../domain/workforce-assignment-state-contract.js';
import { WorkforceAwareTransportDispatchIntegration } from '../domain/workforce-aware-transport-dispatch-integration.js';
import { DeliverySettlementContract } from '../transport/delivery-settlement-contract.js';
import { DeliverySettlementService } from '../transport/delivery-settlement-service.js';
import { TransportExecutionContract } from '../transport/transport-execution-contract.js';

function fixture(){
 let composition=createBaselineMiniworldScenario({includeSaveContinuity:true,includeProductionSupply:true});
 const owners=composition.authoritative,recipe=owners.productionRecipes[0],building=owners.domains.buildings.get(recipe.buildingId);
 const pending=BuildingConstructionProgressTransitionContract.define({buildingId:building.id,progress:0});
 const completed=BuildingConstructionProgressTransitionContract.advance(pending,1);
 const completion=ConstructionCompletionIntegration.complete({previousProgress:pending,transitions:[completed],progress:completed});
 const admission=OperationalBuildingAdmissionContract.evaluate({constructionCompletion:completion,lifecycle:building.lifecycle});
 const profile=PersonWorkforceProfileContract.define({personId:'unit:00000003',specialization:'LUMBERJACK',capabilities:['CAN_MOVE','CAN_LUMBERJACK']});
 const candidate=Object.freeze({profile,state:WorkforceAssignmentStateContract.define({personId:profile.personId,availability:'FREE'})});
 const requirement=OperationalBuildingWorkforceRequirementEligibilityContract.defineRequirement({operationalAdmission:admission,count:1,requiredSpecialization:'LUMBERJACK',requiredCapabilities:['CAN_MOVE','CAN_LUMBERJACK']});
 const eligibility=OperationalBuildingWorkforceRequirementEligibilityContract.evaluate({requirement,candidates:[candidate]});
 const workforceAssignment=OperationalBuildingWorkforceAssignmentIntegration.assign({eligibility,candidates:[candidate],assignmentId:'assignment:00000031'});
 const orchestration=new ActiveRuntimeProductionSupplyOrchestration({getComposition:()=>composition,publishComposition:value=>{composition=value;}});
 return {get composition(){return composition;},owners:()=>composition.authoritative,recipe,buildingId:recipe.buildingId,workforceAssignment,orchestration};
}
function check(name,fn,results){try{results.push(Object.freeze({name,pass:!!fn()}));}catch(error){results.push(Object.freeze({name,pass:false,error:String(error?.message||error)}));}}

export function runIM24SelfTest(){
 const results=[];
 check('blocked-runtime-production-connects-once-to-im23',()=>{
  const f=fixture(),beforeFences=f.owners().productionSettlementIds.length,beforeReceipts=f.owners().productionEffectReceipts.length;
  const first=f.orchestration.evaluateAndConnect({buildingId:f.buildingId,workforceAssignment:f.workforceAssignment,recipe:f.recipe,demandIds:['demand:00000021'],reservationIds:['transport-reservation:00000021']});
  const second=f.orchestration.evaluateAndConnect({buildingId:f.buildingId,workforceAssignment:f.workforceAssignment,recipe:f.recipe,demandIds:[],reservationIds:[]});
  return first.status==='BLOCKED_INPUT'&&first.connections[0].status==='DISPATCHED_TO_EXISTING_LOGISTICS'&&second.connections[0].status==='EXISTING_BOUND_SUPPLY'&&f.owners().resourceDemands.ids().filter(id=>f.owners().resourceDemands.get(id)?.metadata?.source==='IM-23_PRODUCTION_INPUT').length===1&&f.owners().buildingStockTransportReservations.length===1&&f.owners().productionSettlementIds.length===beforeFences&&f.owners().productionEffectReceipts.length===beforeReceipts;
 },results);
 check('existing-delivery-settlement-publishes-stock-and-readiness-without-production',()=>{
  const f=fixture(),connected=f.orchestration.evaluateAndConnect({buildingId:f.buildingId,workforceAssignment:f.workforceAssignment,recipe:f.recipe,demandIds:['demand:00000021'],reservationIds:['transport-reservation:00000021']});
  const link=connected.connections[0],job=link.transportJobs.jobs[0],claim=f.owners().resourceClaims.get(job.claimId),reservation=link.reservations[0];
  const transportCandidate=Object.freeze({profile:PersonWorkforceProfileContract.define({personId:'unit:00000002',specialization:'CARRIER',capabilities:['CAN_MOVE','CAN_SIMPLE_TRANSPORT']}),state:WorkforceAssignmentStateContract.define({personId:'unit:00000002',availability:'FREE'})});
  const dispatch=WorkforceAwareTransportDispatchIntegration.dispatch({reservation,candidates:[transportCandidate],projectionRefs:{jobId:job.id,claimId:job.claimId,demandId:job.demandId,resourceId:job.resourceId,assignmentId:'assignment:00000041'},eligibility:{preconditionsPassed:true}});
  const deliveredExecution=TransportExecutionContract.define({jobId:job.id,unitId:dispatch.workforce.personId,state:'DELIVERED'});
  const delivery=Object.freeze({kind:'delivered-cargo',jobId:job.id,unitId:dispatch.workforce.personId,resourceId:job.resourceId,targetId:job.targetId,amount:job.amount});
  const settlement=DeliverySettlementContract.fromDelivered({job,execution:deliveredExecution,delivery,claim,demand:f.owners().resourceDemands.get(job.demandId),resource:f.owners().resourceState.get(job.resourceId)});
  new DeliverySettlementService({resources:f.owners().resourceState,claims:f.owners().resourceClaims,demands:f.owners().resourceDemands}).commit({settlement,job,execution:deliveredExecution,delivery});
  const source=f.owners().buildingStocks.find(x=>x.buildingId===reservation.sourceBuildingId&&x.resourceTypeId===reservation.resourceTypeId);
  const target=f.owners().buildingStocks.find(x=>x.buildingId===reservation.targetBuildingId&&x.resourceTypeId===reservation.resourceTypeId);
  const fences=JSON.stringify(f.owners().productionSettlementIds),receipts=JSON.stringify(f.owners().productionEffectReceipts);
  const published=f.orchestration.publishDeliveredBuildingStock({dispatch,delivery,reservation,workforceState:dispatch.workforce.assignedState,sourceStock:source,targetStock:target});
  const ready=f.orchestration.evaluateAndConnect({buildingId:f.buildingId,workforceAssignment:f.workforceAssignment,recipe:f.recipe});
  const targetAfter=f.owners().buildingStocks.find(x=>x.buildingId===f.buildingId&&x.resourceTypeId===reservation.resourceTypeId);
  return published.status==='DELIVERED_TO_BUILDING_STOCK'&&targetAfter.quantity===3&&ready.status==='READY'&&!ready.productionTriggered&&JSON.stringify(f.owners().productionSettlementIds)===fences&&JSON.stringify(f.owners().productionEffectReceipts)===receipts;
 },results);
 check('composition-rebind-reuses-existing-open-supply',()=>{
  const f=fixture();f.orchestration.evaluateAndConnect({buildingId:f.buildingId,workforceAssignment:f.workforceAssignment,recipe:f.recipe,demandIds:['demand:00000021'],reservationIds:['transport-reservation:00000021']});
  const beforeDemandCount=f.owners().resourceDemands.ids().length,beforeJobs=f.owners().domains.jobs.size,beforeReservations=f.owners().buildingStockTransportReservations.length;
  const rebound=new ActiveRuntimeProductionSupplyOrchestration({getComposition:()=>f.composition,publishComposition:()=>{throw new Error('existing bound supply must not republish');}});
  const result=rebound.evaluateAndConnect({buildingId:f.buildingId,workforceAssignment:f.workforceAssignment,recipe:f.recipe,demandIds:[],reservationIds:[]});
  return result.connections[0].status==='EXISTING_BOUND_SUPPLY'&&f.owners().resourceDemands.ids().length===beforeDemandCount&&f.owners().domains.jobs.size===beforeJobs&&f.owners().buildingStockTransportReservations.length===beforeReservations;
 },results);
 check('im24-does-not-own-production-cycle-or-scheduler',()=>typeof ActiveRuntimeProductionSupplyOrchestration.prototype.produce==='undefined'&&typeof ActiveRuntimeProductionSupplyOrchestration.prototype.schedule==='undefined'&&typeof ActiveRuntimeProductionSupplyOrchestration.prototype.installOneShotProductionCycle==='undefined',results);
 const blockerCount=results.filter(x=>!x.pass).length;
 return Object.freeze({status:blockerCount===0?'PASS':'FAIL',blockerCount,results:Object.freeze(results)});
}
