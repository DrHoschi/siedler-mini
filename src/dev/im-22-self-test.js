import { Runtime } from '../runtime/runtime.js';
import { RuntimeEconomyExecutionIntegration } from '../runtime/runtime-economy-execution-integration.js';
import { BuildingConstructionProgressTransitionContract } from '../domain/building-construction-progress-transition-contract.js';
import { BuildingLifecycleStateContract } from '../domain/building-lifecycle-state-contract.js';
import { ConstructionCompletionIntegration } from '../domain/construction-completion-integration.js';
import { OperationalBuildingAdmissionContract } from '../domain/operational-building-admission-contract.js';
import { OperationalBuildingWorkforceRequirementEligibilityContract } from '../domain/operational-building-workforce-requirement-eligibility-contract.js';
import { OperationalBuildingWorkforceAssignmentIntegration } from '../domain/operational-building-workforce-assignment-integration.js';
import { PersonWorkforceProfileContract } from '../domain/person-workforce-profile-contract.js';
import { WorkforceAssignmentStateContract } from '../domain/workforce-assignment-state-contract.js';
import { ProductionBuildingStockContract } from '../domain/production-building-stock-contract.js';

function fixture({ inputQuantity = 3 } = {}) {
  const buildingId='building:00000001';
  const pending=BuildingConstructionProgressTransitionContract.define({buildingId,progress:0});
  const inProgress=BuildingConstructionProgressTransitionContract.advance(pending,.5);
  const completed=BuildingConstructionProgressTransitionContract.advance(inProgress,1);
  const completion=ConstructionCompletionIntegration.complete({previousProgress:pending,transitions:[inProgress,completed],progress:completed});
  const admission=OperationalBuildingAdmissionContract.evaluate({constructionCompletion:completion,lifecycle:BuildingLifecycleStateContract.define({buildingId,state:'EXISTS'})});
  const requirement=OperationalBuildingWorkforceRequirementEligibilityContract.defineRequirement({operationalAdmission:admission,count:1,requiredSpecialization:'LUMBERJACK',requiredCapabilities:['CAN_MOVE','CAN_LUMBERJACK']});
  const candidate=Object.freeze({profile:PersonWorkforceProfileContract.define({personId:'unit:00000001',specialization:'LUMBERJACK',capabilities:['CAN_MOVE','CAN_LUMBERJACK']}),state:WorkforceAssignmentStateContract.define({personId:'unit:00000001',availability:'FREE'})});
  const eligibility=OperationalBuildingWorkforceRequirementEligibilityContract.evaluate({requirement,candidates:[candidate]});
  const workforceAssignment=OperationalBuildingWorkforceAssignmentIntegration.assign({eligibility,candidates:[candidate],assignmentId:'assignment:00000031'});
  const recipe=ProductionBuildingStockContract.define({buildingId,inputs:[{resourceTypeId:'resource-type:00000001',quantity:3}],outputs:[{resourceTypeId:'resource-type:00000002',quantity:2}]});
  let composition=Object.freeze({kind:'active-runtime-composition',authoritative:Object.freeze({
    buildingStocks:Object.freeze([
      Object.freeze({kind:'building-stock',buildingId,resourceTypeId:'resource-type:00000001',quantity:inputQuantity}),
      Object.freeze({kind:'building-stock',buildingId,resourceTypeId:'resource-type:00000002',quantity:1}),
    ]),
    productionSettlementIds:Object.freeze([]),
    productionEffectReceipts:Object.freeze([]),
  })});
  const runtime=new Runtime({simulation:{phases:['input','world','demand','assignment','intent','movement','work','economy','recovery','events','maintenance'],fixedStepMs:100}});
  runtime.boot();
  return {buildingId,workforceAssignment,recipe,runtime,getComposition:()=>composition,publishComposition:value=>{composition=value;}};
}

function quantities(composition){return Object.fromEntries(composition.authoritative.buildingStocks.map(s=>[s.resourceTypeId,s.quantity]));}
function check(name,fn,results){try{results.push(Object.freeze({name,pass:!!fn()}));}catch(error){results.push(Object.freeze({name,pass:false,error:String(error?.message||error)}));}}

export function runIM22SelfTest(){
  const results=[];
  check('ready-cycle-settles-once-in-economy-phase',()=>{
    const f=fixture();
    const registration=RuntimeEconomyExecutionIntegration.installOneShotProductionCycle({...f,cycleId:'cycle-0001'});
    f.runtime.scheduler.step();
    const q=quantities(f.getComposition()), first=JSON.stringify(f.getComposition());
    f.runtime.scheduler.step();
    return registration.phase==='economy'&&registration.result()?.status==='SETTLED'&&q['resource-type:00000001']===0&&q['resource-type:00000002']===3&&f.getComposition().authoritative.productionSettlementIds.length===1&&f.getComposition().authoritative.productionEffectReceipts.length===1&&JSON.stringify(f.getComposition())===first&&f.runtime.scheduler.systemCount()===0;
  },results);
  check('blocked-input-is-no-mutation-and-does-not-later-self-activate',()=>{
    const f=fixture({inputQuantity:2}), before=JSON.stringify(f.getComposition());
    const registration=RuntimeEconomyExecutionIntegration.installOneShotProductionCycle({...f,cycleId:'cycle-blocked'});
    f.runtime.scheduler.step();
    const after=JSON.stringify(f.getComposition());
    f.runtime.scheduler.step();
    return registration.result()?.status==='BLOCKED_INPUT'&&before===after&&JSON.stringify(f.getComposition())===after&&f.runtime.scheduler.systemCount()===0;
  },results);
  check('existing-settlement-fence-prevents-reapplication',()=>{
    const f=fixture();
    const first=RuntimeEconomyExecutionIntegration.installOneShotProductionCycle({...f,cycleId:'cycle-repeat'});
    f.runtime.scheduler.step();
    const settled=JSON.stringify(f.getComposition());
    const second=RuntimeEconomyExecutionIntegration.installOneShotProductionCycle({...f,cycleId:'cycle-repeat'});
    f.runtime.scheduler.step();
    return first.result()?.status==='SETTLED'&&second.result()?.status==='ALREADY_SETTLED'&&JSON.stringify(f.getComposition())===settled;
  },results);
  check('receipt-and-fence-identify-same-logical-effect',()=>{
    const f=fixture();
    const registration=RuntimeEconomyExecutionIntegration.installOneShotProductionCycle({...f,cycleId:'cycle-receipt'});
    f.runtime.scheduler.step();
    const owners=f.getComposition().authoritative,receipt=owners.productionEffectReceipts[0];
    return receipt.settlementId===registration.settlementId&&owners.productionSettlementIds[0]===registration.settlementId&&receipt.stockBefore.find(x=>x.resourceTypeId==='resource-type:00000001').quantity===3&&receipt.stockAfter.find(x=>x.resourceTypeId==='resource-type:00000001').quantity===0;
  },results);
  const blockerCount=results.filter(x=>!x.pass).length;
  return Object.freeze({status:blockerCount===0?'PASS':'FAIL',blockerCount,results:Object.freeze(results)});
}
