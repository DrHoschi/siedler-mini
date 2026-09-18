import { StableIdAllocator } from '../world/stable-id.js';
import { CoreDomainStores } from '../domain/core-domain-stores.js';
import { SaveGameRestoreContract } from './savegame-restore-contract.js';
import { PostIM13SaveGameValidationContract } from './post-im13-savegame-validation-contract.js';
import { ResourceState } from '../resources/resource-state.js';
import { ResourceClaims } from '../resources/resource-claims.js';
import { ResourceDemands } from '../resources/resource-demands.js';
import { BuildingConstructionProgressTransitionContract } from '../domain/building-construction-progress-transition-contract.js';
import { BuildingStockContract } from '../domain/building-stock-contract.js';
import { BuildingStockTransportReservationContract } from '../domain/building-stock-transport-reservation-contract.js';
import { WorkforceAssignmentStateContract } from '../domain/workforce-assignment-state-contract.js';
import { ResidentHomeAssignmentContract } from '../domain/resident-home-assignment-contract.js';
import { PersonWorkforceProfileContract } from '../domain/person-workforce-profile-contract.js';
import { ProductionBuildingStockContract } from '../domain/production-building-stock-contract.js';
import { TransportExecutionContract } from '../transport/transport-execution-contract.js';
import { SettlementEffectReceiptContract } from './settlement-effect-receipt-contract.js';

const RESULT_KIND = 'post-im13-savegame-restore-result';

function clone(value) {
  return value == null ? value : structuredClone(value);
}

function deepFreeze(value) {
  if (value == null || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function allocatorFrom(snapshot) {
  return new StableIdAllocator({ seeds: clone(snapshot ?? {}) });
}

function baseSnapshotFrom(snapshot) {
  const base = clone(snapshot);
  base.schemaVersion = 1;
  delete base.authoritative;
  return base;
}

function restoreWorkforceBindings(values) {
  return Object.freeze(values.map(value => Object.freeze({
    kind: 'workforce-building-binding',
    assignmentId: String(value.assignmentId),
    buildingId: String(value.buildingId)
  })));
}

function restoreCarrierBindings(values) {
  return Object.freeze(values.map(value => Object.freeze({
    kind: 'carrier-job-binding',
    jobId: String(value.jobId),
    unitId: String(value.unitId)
  })));
}

function restoreTransportExecutions(values) {
  return Object.freeze(values.map(value => TransportExecutionContract.define(value)));
}

function restoreValidatedV2BaseState(snapshot) {
  const originalBase = baseSnapshotFrom(snapshot);
  const compatibilityBase = clone(originalBase);
  compatibilityBase.domains.jobs.state.items = {};

  const restored = SaveGameRestoreContract.restore(compatibilityBase);
  if (restored.status !== 'RESTORED') return restored;

  const restoreDomains = {};
  const allocators = {};
  for (const name of ['buildings', 'units', 'resources', 'jobs']) {
    restoreDomains[name] = clone(originalBase.domains[name].state);
    allocators[name] = allocatorFrom(originalBase.domains[name].allocator);
  }
  const domains = new CoreDomainStores({ restoreDomains, allocators });

  return Object.freeze({
    ...restored,
    runtimeState: Object.freeze({
      ...restored.runtimeState,
      domains
    })
  });
}

function freezeArray(values) {
  return Object.freeze(values.map(value => deepFreeze(clone(value))));
}

function restoreAuthoritative(snapshot, baseState) {
  const auth = snapshot.authoritative;
  const definitions = auth.definitions;

  const resourceState = new ResourceState({
    world: baseState.world,
    resourceStore: baseState.domains.resources,
    restoreDefinitions: clone(definitions.resourceTypes.state),
    definitionAllocator: allocatorFrom(definitions.resourceTypes.allocator)
  });
  const resourceClaims = new ResourceClaims({
    resourceState,
    restoreState: clone(auth.resourceClaims.state),
    allocator: allocatorFrom(auth.resourceClaims.allocator)
  });
  const resourceDemands = new ResourceDemands({
    resourceState,
    claims: resourceClaims,
    restoreState: clone(auth.resourceDemands.state),
    allocator: allocatorFrom(auth.resourceDemands.allocator)
  });

  const housingCapabilities = freezeArray(definitions.housingCapabilities);
  const workforceProfiles = Object.freeze(definitions.workforceProfiles.map(value => PersonWorkforceProfileContract.define(value)));
  const workforceRequirements = freezeArray(definitions.workforceRequirements);
  const productionRecipes = Object.freeze(definitions.productionRecipes.map(value => ProductionBuildingStockContract.define(value)));
  const constructionProgress = Object.freeze(auth.constructionProgress.map(value => BuildingConstructionProgressTransitionContract.define(value)));
  const buildingStocks = Object.freeze(auth.buildingStocks.map(value => BuildingStockContract.define(value)));
  const buildingStockTransportReservations = Object.freeze(
    auth.buildingStockTransportReservations.map(value => BuildingStockTransportReservationContract.define(value))
  );
  const workforceAssignments = Object.freeze(auth.workforceAssignments.map(value => WorkforceAssignmentStateContract.define(value)));
  const workforceBindings = restoreWorkforceBindings(auth.workforceBindings);
  const carrierBindings = restoreCarrierBindings(auth.carrierBindings);
  const transportExecutions = restoreTransportExecutions(auth.transportExecutions);
  const homeAssignments = Object.freeze(auth.homeAssignments.map(value => ResidentHomeAssignmentContract.define(value)));

  return Object.freeze({
    resourceState,
    resourceClaims,
    resourceDemands,
    housingCapabilities,
    workforceProfiles,
    workforceRequirements,
    productionRecipes,
    constructionProgress,
    buildingStocks,
    buildingStockTransportReservations,
    workforceAssignments,
    workforceBindings,
    carrierBindings,
    transportExecutions,
    homeAssignments,
    productionSettlementIds: new Set(auth.settlementFences.production),
    goldSettlementIds: new Set(auth.settlementFences.gold),
    productionEffectReceipts: SettlementEffectReceiptContract.productionList(auth.settlementEffectReceipts.production),
    goldEffectReceipts: SettlementEffectReceiptContract.goldList(auth.settlementEffectReceipts.gold)
  });
}

export class PostIM13SaveGameRestoreIntegration {
  static get resultKind() { return RESULT_KIND; }

  static prepare(snapshot) {
    const validation = PostIM13SaveGameValidationContract.validate(snapshot);
    if (validation.status !== 'VALID') {
      return Object.freeze({
        kind: RESULT_KIND,
        status: 'REJECTED',
        validation,
        prepared: null
      });
    }

    const baseRestore = restoreValidatedV2BaseState(snapshot);
    if (baseRestore.status !== 'RESTORED') {
      return Object.freeze({
        kind: RESULT_KIND,
        status: 'REJECTED',
        validation: deepFreeze({
          ...validation,
          status: 'INVALID',
          errors: Object.freeze([
            ...validation.errors,
            Object.freeze({ code: 'BASE_V1_RESTORE_REJECTED', path: '$' })
          ])
        }),
        prepared: null
      });
    }

    const authoritative = restoreAuthoritative(snapshot, baseRestore.runtimeState);
    return Object.freeze({
      kind: RESULT_KIND,
      status: 'PREPARED',
      validation,
      captureStepIndex: snapshot.capture.stepIndex,
      baseState: baseRestore.runtimeState,
      authoritative
    });
  }

  static commit(preparedResult) {
    if (preparedResult?.kind !== RESULT_KIND || preparedResult?.status !== 'PREPARED') {
      throw new TypeError('IM-20C PREPARED restore result required');
    }
    const base = preparedResult.baseState;
    const auth = preparedResult.authoritative;
    return Object.freeze({
      kind: 'restored-post-im13-authoritative-runtime-state',
      captureStepIndex: preparedResult.captureStepIndex,
      world: base.world,
      map: base.map,
      domains: base.domains,
      goldEconomy: base.goldEconomy,
      pathClassification: base.pathClassification,
      pathUsageWear: base.pathUsageWear,
      resourceState: auth.resourceState,
      resourceClaims: auth.resourceClaims,
      resourceDemands: auth.resourceDemands,
      housingCapabilities: auth.housingCapabilities,
      workforceProfiles: auth.workforceProfiles,
      workforceRequirements: auth.workforceRequirements,
      productionRecipes: auth.productionRecipes,
      constructionProgress: auth.constructionProgress,
      buildingStocks: auth.buildingStocks,
      buildingStockTransportReservations: auth.buildingStockTransportReservations,
      workforceAssignments: auth.workforceAssignments,
      workforceBindings: auth.workforceBindings,
      carrierBindings: auth.carrierBindings,
      transportExecutions: auth.transportExecutions,
      homeAssignments: auth.homeAssignments,
      productionSettlementIds: auth.productionSettlementIds,
      goldSettlementIds: auth.goldSettlementIds,
      productionEffectReceipts: auth.productionEffectReceipts,
      goldEffectReceipts: auth.goldEffectReceipts
    });
  }

  static restore(snapshot) {
    const prepared = this.prepare(snapshot);
    if (prepared.status !== 'PREPARED') return prepared;
    return Object.freeze({
      kind: RESULT_KIND,
      status: 'RESTORED',
      validation: prepared.validation,
      captureStepIndex: prepared.captureStepIndex,
      runtimeState: this.commit(prepared)
    });
  }

  static capabilities() {
    return Object.freeze({
      v2Validation: true,
      v2Restore: true,
      failClosedBeforeCommit: true,
      derivedStateRebinding: false,
      runtimeActivation: false,
      browserStorage: false,
      continueLifecycle: false
    });
  }
}
