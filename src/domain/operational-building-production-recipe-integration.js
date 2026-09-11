import { OperationalBuildingWorkforceAssignmentIntegration } from './operational-building-workforce-assignment-integration.js';
import { ProductionBuildingStockContract } from './production-building-stock-contract.js';

function requireAssignment(value) {
  if (!value || value.kind !== 'operational-building-workforce-assignment' || value.status !== OperationalBuildingWorkforceAssignmentIntegration.status.ASSIGNED) {
    throw new TypeError('frozen IM-18C assigned workforce required');
  }
  return value;
}

function requireRecipe(value) {
  if (!value || value.kind !== 'production-building-stock') {
    throw new TypeError('existing production BuildingStock recipe required');
  }
  return value;
}

export class OperationalBuildingProductionRecipeIntegration {
  static integrate({ workforceAssignment, recipe } = {}) {
    const assignment = requireAssignment(workforceAssignment);
    const productionRecipe = requireRecipe(recipe);

    if (assignment.buildingId !== productionRecipe.buildingId) {
      throw new Error('production recipe building must match assigned operational building');
    }

    const normalizedRecipe = ProductionBuildingStockContract.define({
      buildingId: productionRecipe.buildingId,
      inputs: productionRecipe.inputs,
      outputs: productionRecipe.outputs
    });

    return Object.freeze({
      kind: 'operational-building-production-recipe-integration',
      buildingId: assignment.buildingId,
      workforceAssignment: assignment,
      recipe: normalizedRecipe,
      inputs: normalizedRecipe.inputs,
      outputs: normalizedRecipe.outputs
    });
  }
}
