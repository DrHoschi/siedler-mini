import { SaveGameSnapshotContract } from './savegame-snapshot-contract.js';
import { PostIM13AuthoritativeSnapshotIntegration } from './post-im13-authoritative-snapshot-integration.js';

const REQUIRED = Object.freeze([
  'world', 'map', 'domains', 'goldEconomy', 'pathUsageWear', 'resourceState', 'resourceDemands', 'resourceClaims',
  'housingCapabilities', 'workforceProfiles', 'workforceRequirements', 'productionRecipes', 'constructionProgress',
  'buildingStocks', 'buildingStockTransportReservations', 'workforceAssignments', 'workforceBindings',
  'carrierBindings', 'transportExecutions', 'homeAssignments', 'productionSettlementIds', 'goldSettlementIds',
]);

export class PostIM13ActiveRuntimeCaptureAdapter {
  static capture(composition, stepIndex) {
    const owners = composition?.authoritative;
    if (composition?.kind !== 'active-runtime-composition' || !owners) {
      throw new TypeError('active runtime composition required');
    }
    for (const name of REQUIRED) {
      if (owners[name] == null) throw new Error(`IM-20E capture owner missing: ${name}`);
    }
    return PostIM13AuthoritativeSnapshotIntegration.capture({
      boundary: SaveGameSnapshotContract.completedStepBoundary(stepIndex),
      world: owners.world,
      map: owners.map,
      domains: owners.domains,
      gold: owners.goldEconomy,
      wear: owners.pathUsageWear,
      resourceState: owners.resourceState,
      resourceDemands: owners.resourceDemands,
      resourceClaims: owners.resourceClaims,
      housingCapabilities: owners.housingCapabilities,
      workforceProfiles: owners.workforceProfiles,
      workforceRequirements: owners.workforceRequirements,
      productionRecipes: owners.productionRecipes,
      constructionProgress: owners.constructionProgress,
      buildingStocks: owners.buildingStocks,
      buildingStockTransportReservations: owners.buildingStockTransportReservations,
      workforceAssignments: owners.workforceAssignments,
      workforceBindings: owners.workforceBindings,
      carrierBindings: owners.carrierBindings,
      transportExecutions: owners.transportExecutions,
      homeAssignments: owners.homeAssignments,
      productionSettlementIds: owners.productionSettlementIds,
      goldSettlementIds: owners.goldSettlementIds,
    });
  }
}
