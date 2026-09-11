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

function operationalAdmission(buildingId) {
  const pending = BuildingConstructionProgressTransitionContract.define({ buildingId, progress: 0 });
  const inProgress = BuildingConstructionProgressTransitionContract.advance(pending, 0.5);
  const completed = BuildingConstructionProgressTransitionContract.advance(inProgress, 1);
  const completion = ConstructionCompletionIntegration.complete({ previousProgress: pending, transitions: [inProgress, completed], progress: completed });
  const lifecycle = BuildingLifecycleStateContract.define({ buildingId, state: 'EXISTS' });
  return OperationalBuildingAdmissionContract.evaluate({ constructionCompletion: completion, lifecycle });
}

export function runIM18DSelfTest() {
  const results = [];
  const check = (name, fn) => { try { results.push(Object.freeze({ name, pass: !!fn() })); } catch (error) { results.push(Object.freeze({ name, pass: false, error: String(error?.message || error) })); } };
  const rejects = fn => { try { fn(); return false; } catch { return true; } };
  const buildingId = 'building:00000001';

  const admission = operationalAdmission(buildingId);
  const requirement = OperationalBuildingWorkforceRequirementEligibilityContract.defineRequirement({
    operationalAdmission: admission,
    count: 1,
    requiredSpecialization: 'LUMBERJACK',
    requiredCapabilities: ['CAN_MOVE', 'CAN_LUMBERJACK']
  });
  const candidate = Object.freeze({
    profile: PersonWorkforceProfileContract.define({ personId: 'unit:00000001', specialization: 'LUMBERJACK', capabilities: ['CAN_MOVE', 'CAN_LUMBERJACK'] }),
    state: WorkforceAssignmentStateContract.define({ personId: 'unit:00000001', availability: 'FREE' })
  });
  const eligibility = OperationalBuildingWorkforceRequirementEligibilityContract.evaluate({ requirement, candidates: [candidate] });
  const workforceAssignment = OperationalBuildingWorkforceAssignmentIntegration.assign({ eligibility, candidates: [candidate], assignmentId: 'assignment:00000021' });
  const recipe = ProductionBuildingStockContract.define({
    buildingId,
    inputs: [{ resourceTypeId: 'resource-type:00000002', quantity: 2 }, { resourceTypeId: 'resource-type:00000001', quantity: 3 }],
    outputs: [{ resourceTypeId: 'resource-type:00000004', quantity: 1 }, { resourceTypeId: 'resource-type:00000003', quantity: 4 }]
  });

  check('integrates-frozen-assigned-workforce-with-existing-production-recipe', () => {
    const value = OperationalBuildingProductionRecipeIntegration.integrate({ workforceAssignment, recipe });
    return value.kind === 'operational-building-production-recipe-integration'
      && value.buildingId === buildingId
      && value.workforceAssignment === workforceAssignment
      && value.recipe.kind === 'production-building-stock'
      && Object.isFrozen(value)
      && Object.isFrozen(value.inputs)
      && Object.isFrozen(value.outputs);
  });

  check('preserves-existing-deterministic-input-output-order', () => {
    const value = OperationalBuildingProductionRecipeIntegration.integrate({ workforceAssignment, recipe });
    return JSON.stringify(value.inputs.map(entry => entry.resourceTypeId)) === JSON.stringify(['resource-type:00000001','resource-type:00000002'])
      && JSON.stringify(value.outputs.map(entry => entry.resourceTypeId)) === JSON.stringify(['resource-type:00000003','resource-type:00000004']);
  });

  check('rejects-building-mismatch', () => {
    const otherRecipe = ProductionBuildingStockContract.define({ buildingId: 'building:00000011', inputs: [{ resourceTypeId: 'resource-type:00000001', quantity: 1 }], outputs: [{ resourceTypeId: 'resource-type:00000003', quantity: 1 }] });
    return rejects(() => OperationalBuildingProductionRecipeIntegration.integrate({ workforceAssignment, recipe: otherRecipe }));
  });

  check('rejects-non-assigned-workforce-result', () => rejects(() => OperationalBuildingProductionRecipeIntegration.integrate({ workforceAssignment: { ...workforceAssignment, status: 'REJECTED' }, recipe })));

  check('im18d-does-not-execute-or-mutate-production', () => {
    const value = OperationalBuildingProductionRecipeIntegration.integrate({ workforceAssignment, recipe });
    const forbidden = ['stock','resultStock','consumed','produced','execution','tick','duration','interval'];
    return forbidden.every(key => !(key in value))
      && typeof OperationalBuildingProductionRecipeIntegration.execute === 'undefined'
      && typeof OperationalBuildingProductionRecipeIntegration.consume === 'undefined'
      && typeof OperationalBuildingProductionRecipeIntegration.produce === 'undefined';
  });

  const blockerCount = results.filter(result => !result.pass).length;
  return Object.freeze({ pass: blockerCount === 0, blockerCount, results: Object.freeze(results) });
}
