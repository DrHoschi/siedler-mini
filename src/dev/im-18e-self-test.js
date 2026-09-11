import { BuildingConstructionProgressTransitionContract } from '../domain/building-construction-progress-transition-contract.js';
import { BuildingLifecycleStateContract } from '../domain/building-lifecycle-state-contract.js';
import { ConstructionCompletionIntegration } from '../domain/construction-completion-integration.js';
import { OperationalBuildingAdmissionContract } from '../domain/operational-building-admission-contract.js';
import { OperationalBuildingWorkforceRequirementEligibilityContract } from '../domain/operational-building-workforce-requirement-eligibility-contract.js';
import { OperationalBuildingWorkforceAssignmentIntegration } from '../domain/operational-building-workforce-assignment-integration.js';
import { PersonWorkforceProfileContract } from '../domain/person-workforce-profile-contract.js';
import { WorkforceAssignmentStateContract } from '../domain/workforce-assignment-state-contract.js';
import { ProductionBuildingStockContract } from '../domain/production-building-stock-contract.js';
import { OperationalBuildingProductionRecipeIntegration } from '../domain/operational-building-production-recipe-integration.js';
import { OperationalProductionExecution } from '../domain/operational-production-execution.js';

function productionIntegration(buildingId) {
  const pending = BuildingConstructionProgressTransitionContract.define({ buildingId, progress: 0 });
  const inProgress = BuildingConstructionProgressTransitionContract.advance(pending, 0.5);
  const completed = BuildingConstructionProgressTransitionContract.advance(inProgress, 1);
  const completion = ConstructionCompletionIntegration.complete({ previousProgress: pending, transitions: [inProgress, completed], progress: completed });
  const admission = OperationalBuildingAdmissionContract.evaluate({ constructionCompletion: completion, lifecycle: BuildingLifecycleStateContract.define({ buildingId, state: 'EXISTS' }) });
  const requirement = OperationalBuildingWorkforceRequirementEligibilityContract.defineRequirement({ operationalAdmission: admission, count: 1, requiredSpecialization: 'LUMBERJACK', requiredCapabilities: ['CAN_MOVE','CAN_LUMBERJACK'] });
  const candidate = Object.freeze({ profile: PersonWorkforceProfileContract.define({ personId: 'unit:00000001', specialization: 'LUMBERJACK', capabilities: ['CAN_MOVE','CAN_LUMBERJACK'] }), state: WorkforceAssignmentStateContract.define({ personId: 'unit:00000001', availability: 'FREE' }) });
  const eligibility = OperationalBuildingWorkforceRequirementEligibilityContract.evaluate({ requirement, candidates: [candidate] });
  const workforceAssignment = OperationalBuildingWorkforceAssignmentIntegration.assign({ eligibility, candidates: [candidate], assignmentId: 'assignment:00000031' });
  const recipe = ProductionBuildingStockContract.define({ buildingId, inputs: [{resourceTypeId:'resource-type:00000001',quantity:3},{resourceTypeId:'resource-type:00000002',quantity:2}], outputs: [{resourceTypeId:'resource-type:00000003',quantity:4}] });
  return OperationalBuildingProductionRecipeIntegration.integrate({ workforceAssignment, recipe });
}

export function runIM18ESelfTest() {
  const results=[]; const check=(name,fn)=>{try{results.push(Object.freeze({name,pass:!!fn()}));}catch(error){results.push(Object.freeze({name,pass:false,error:String(error?.message||error)}));}}; const rejects=fn=>{try{fn();return false;}catch{return true;}};
  const buildingId='building:00000001'; const integration=productionIntegration(buildingId);
  const readyStocks=[{buildingId,resourceTypeId:'resource-type:00000001',quantity:3},{buildingId,resourceTypeId:'resource-type:00000002',quantity:5},{buildingId,resourceTypeId:'resource-type:00000009',quantity:7}];
  check('ready-only-with-operational-assigned-workforce-and-sufficient-inputs',()=>OperationalProductionExecution.execute({productionIntegration:integration,stocks:readyStocks}).status==='READY');
  check('blocks-insufficient-inputs-deterministically',()=>{const result=OperationalProductionExecution.evaluate({productionIntegration:integration,stocks:[{buildingId,resourceTypeId:'resource-type:00000001',quantity:2},{buildingId,resourceTypeId:'resource-type:00000002',quantity:2}]});return result.status==='BLOCKED_INPUT'&&result.missingInputs.length===1&&result.missingInputs[0].resourceTypeId==='resource-type:00000001'&&rejects(()=>OperationalProductionExecution.execute({productionIntegration:integration,stocks:[{buildingId,resourceTypeId:'resource-type:00000001',quantity:2},{buildingId,resourceTypeId:'resource-type:00000002',quantity:2}]}));});
  check('rejects-non-im18d-integration',()=>rejects(()=>OperationalProductionExecution.execute({productionIntegration:{...integration,kind:'other'},stocks:readyStocks})));
  check('rejects-workforce-that-is-no-longer-assigned',()=>rejects(()=>OperationalProductionExecution.execute({productionIntegration:{...integration,workforceAssignment:{...integration.workforceAssignment,status:'REJECTED'}},stocks:readyStocks})));
  check('im18e-does-not-consume-input-or-create-output',()=>{const before=JSON.stringify(readyStocks);const result=OperationalProductionExecution.execute({productionIntegration:integration,stocks:readyStocks});return JSON.stringify(readyStocks)===before&&JSON.stringify(result.stocks.map(s=>({resourceTypeId:s.resourceTypeId,quantity:s.quantity})))===JSON.stringify([{resourceTypeId:'resource-type:00000001',quantity:3},{resourceTypeId:'resource-type:00000002',quantity:5},{resourceTypeId:'resource-type:00000009',quantity:7}])&&typeof OperationalProductionExecution.settle==='undefined'&&typeof OperationalProductionExecution.consume==='undefined'&&typeof OperationalProductionExecution.produce==='undefined';});
  const blockerCount=results.filter(r=>!r.pass).length; return Object.freeze({pass:blockerCount===0,blockerCount,results:Object.freeze(results)});
}
