import { runIM27SelfTest } from './im-27-self-test.js';
import { createBaselineMiniworldScenario } from '../diagnostics/baseline-miniworld-scenario.js';
import { ProductionOutputResourceAvailabilityIntegration as IM27 } from '../domain/production-output-resource-availability-integration.js';
import { ResourceMatching } from '../resources/resource-matching.js';
import { ResourceAssignment } from '../resources/resource-assignment.js';
import { TransportJobService } from '../transport/transport-job-service.js';
import { BuildingStockTransportReservationContract } from '../domain/building-stock-transport-reservation-contract.js';
import { BuildingStockTransportReservationService } from '../domain/building-stock-transport-reservation-service.js';
import { DeliverySettlementContract } from '../transport/delivery-settlement-contract.js';
import { DeliverySettlementService } from '../transport/delivery-settlement-service.js';
import { DeliveredTransportBuildingStockSettlement } from '../domain/delivered-transport-building-stock-settlement.js';
import { ProducedResourceLogisticsConsumptionConsistency as IM30 } from '../domain/produced-resource-logistics-consumption-consistency.js';

function check(name,fn,out){try{out.push({name,pass:!!fn()});}catch(e){out.push({name,pass:false,error:String(e?.message||e)});}}
function fixture(amount=3,claimAmount=2){
 const c=createBaselineMiniworldScenario({includeSaveContinuity:true,includeProductionSupply:true}),a=c.authoritative;
 const recipe=a.productionRecipes[0],type=recipe.inputs[0].resourceTypeId,producer='building:00000001',consumer=recipe.buildingId;
 const existingStock=a.buildingStocks.find(x=>x.buildingId===producer&&x.resourceTypeId===type);
 const stock=existingStock??{kind:'building-stock',buildingId:producer,resourceTypeId:type,quantity:amount};
 const receipt={kind:'production-effect-receipt',settlementId:'production-settlement:im30:1',buildingId:producer,inputs:[],outputs:[{resourceTypeId:type,amount}],stockBefore:[{resourceTypeId:type,quantity:0}],stockAfter:[{resourceTypeId:type,quantity:amount}]};
 const stocks=[...a.buildingStocks.filter(x=>!(x.buildingId===producer&&x.resourceTypeId===type)),{kind:'building-stock',buildingId:producer,resourceTypeId:type,quantity:amount}];
 const mat=IM27.materialize({receipt,settledIds:[receipt.settlementId],buildingStocks:stocks,resourceState:a.resourceState,claims:a.resourceClaims});
 const resource=mat.resources[0],d=a.resourceDemands.create({consumerId:consumer,definitionId:type,amount:claimAmount},{id:'demand:00000930'});
 const matching=new ResourceMatching({resourceState:a.resourceState,claims:a.resourceClaims,demands:a.resourceDemands}),match=matching.matchDemand(d.id);
 const assignment=new ResourceAssignment({resourceState:a.resourceState,claims:a.resourceClaims,demands:a.resourceDemands}).assignMatch(match);
 const job=new TransportJobService({jobStore:a.domains.jobs,claims:a.resourceClaims,demands:a.resourceDemands,resourceState:a.resourceState}).createFromAssignment(assignment).jobs[0];
 const reservation=BuildingStockTransportReservationContract.define({id:'transport-reservation:00000930',sourceBuildingId:producer,targetBuildingId:consumer,resourceTypeId:type,amount:job.amount,state:'ACTIVE'});
 BuildingStockTransportReservationService.reserve({stock:stocks.find(x=>x.buildingId===producer&&x.resourceTypeId===type),reservations:[],reservation});
 const claim=a.resourceClaims.get(job.claimId),execution={kind:'transport-execution',jobId:job.id,unitId:'unit:00000002',state:'DELIVERED'},delivery={kind:'delivered-cargo',jobId:job.id,unitId:execution.unitId,resourceId:resource.id,targetId:consumer,amount:job.amount};
 const settlement=DeliverySettlementContract.fromDelivered({job,execution,delivery,claim,demand:a.resourceDemands.get(job.demandId),resource});
 const deliveryCommit=new DeliverySettlementService({resources:a.resourceState,claims:a.resourceClaims,demands:a.resourceDemands}).commit({settlement,job,execution,delivery});
 const source=stocks.find(x=>x.buildingId===producer&&x.resourceTypeId===type),target=stocks.find(x=>x.buildingId===consumer&&x.resourceTypeId===type);
 const dispatch={kind:'workforce-aware-transport-dispatch',reservation,job,workforce:{personId:execution.unitId,assignedState:{kind:'workforce-assignment-state',personId:execution.unitId,availability:'ASSIGNED',assignmentId:'assignment:00000930'}},executionAssignment:{jobId:job.id,unitId:execution.unitId},compatibilityRefs:{assignmentId:'assignment:00000930'}};
 const physical=DeliveredTransportBuildingStockSettlement.settle({dispatch,delivery,reservation,workforceState:dispatch.workforce.assignedState,sourceStock:source,targetStock:target});
 return {a,resource,deliveryCommit,physical,amount,claimAmount};
}
export function runIM30SelfTest(){const r=[];
 check('frozen-im27-predecessor-still-passes',()=>runIM27SelfTest().status==='PASS',r);
 check('partial-produced-delivery-leaves-only-real-remainder-matchable',()=>{const f=fixture(3,2),x=IM30.verify({deliveryCommit:f.deliveryCommit,buildingStockSettlement:f.physical,resourceState:f.a.resourceState,claims:f.a.resourceClaims});return x.status==='CONSISTENT'&&x.availableAfter===1&&x.sourceQuantityAfter===1&&f.resource.state!=='CONSUMED';},r);
 check('full-produced-delivery-is-not-matchable-after-consumption',()=>{const f=fixture(2,2),x=IM30.verify({deliveryCommit:f.deliveryCommit,buildingStockSettlement:f.physical,resourceState:f.a.resourceState,claims:f.a.resourceClaims});return x.availableAfter===0&&f.a.resourceState.get(f.resource.id).state==='CONSUMED';},r);
 check('repeated-consistency-check-is-mutation-free',()=>{const f=fixture(3,2),before=JSON.stringify({rs:f.a.resourceState.snapshot(),claims:f.a.resourceClaims.snapshot()}),a=IM30.verify({deliveryCommit:f.deliveryCommit,buildingStockSettlement:f.physical,resourceState:f.a.resourceState,claims:f.a.resourceClaims}),b=IM30.verify({deliveryCommit:f.deliveryCommit,buildingStockSettlement:f.physical,resourceState:f.a.resourceState,claims:f.a.resourceClaims});return !a.mutation&&!b.mutation&&before===JSON.stringify({rs:f.a.resourceState.snapshot(),claims:f.a.resourceClaims.snapshot()});},r);
 check('mismatched-physical-source-is-rejected',()=>{const f=fixture();try{IM30.verify({deliveryCommit:f.deliveryCommit,buildingStockSettlement:{...f.physical,sourceStock:{...f.physical.sourceStock,buildingId:'building:00000099'}},resourceState:f.a.resourceState,claims:f.a.resourceClaims});return false;}catch{return true;}},r);
 check('im30-owns-no-stock-claim-transport-settlement-or-save-authority',()=>['consume','reserve','dispatch','settle','save','restore'].every(k=>typeof IM30[k]==='undefined'),r);
 const blockerCount=r.filter(x=>!x.pass).length;return {status:blockerCount?'FAIL':'PASS',blockerCount,results:r};
}