import { BuildingConstructionProgressTransitionContract } from '../domain/building-construction-progress-transition-contract.js';
import { BuildingIdentityOwnershipContract } from '../domain/building-identity-ownership-contract.js';
import { BuildingLifecycleStateContract } from '../domain/building-lifecycle-state-contract.js';
import { ConstructionCompletionIntegration } from '../domain/construction-completion-integration.js';
import { OperationalBuildingAdmissionContract } from '../domain/operational-building-admission-contract.js';
import { OperationalBuildingWorkforceRequirementEligibilityContract } from '../domain/operational-building-workforce-requirement-eligibility-contract.js';
import { OperationalBuildingProductionRecipeIntegration } from '../domain/operational-building-production-recipe-integration.js';
import { OperationalProductionExecution } from '../domain/operational-production-execution.js';
import { ResidentialBuildingAdmissionContract } from '../domain/residential-building-admission-contract.js';
import { ResidentialHousingCapacityOccupancyIntegration } from '../domain/residential-housing-capacity-occupancy-integration.js';
import { ResidentHousingAssignmentIntegration } from '../domain/resident-housing-assignment-integration.js';
import { PersonResidentIdentityContract } from '../domain/person-resident-identity-contract.js';
import { WorkforceAssignmentStateContract } from '../domain/workforce-assignment-state-contract.js';
import { CarrierAssignmentService } from '../transport/carrier-assignment-service.js?v=im20d-1';
import { TransportExecutionContract } from '../transport/transport-execution-contract.js';
import { TransportJobContract } from '../transport/transport-job-contract.js';
import { WorldBackedPathClassificationSource } from '../transport/world-backed-path-classification-source.js';
import { WorldBackedTraversabilitySource } from '../transport/world-backed-traversability-source.js';
import { DeterministicWorldReachabilityIntegration } from '../transport/deterministic-world-reachability-integration.js';
import { RuntimeEntityNavigationValidationIntegration } from '../transport/runtime-entity-navigation-validation-integration.js';
import { ObstacleAwareRoutingIntegration } from '../transport/obstacle-aware-routing-integration.js';
import { projectVisibleRuntimeState } from '../render/live-runtime-render-integration.js';
import { projectAuthoritativePopulation } from '../ui/authoritative-population-projection.js';
import { projectPlayerOperationalState } from '../ui/player-operational-state-projection.js?v=im20d-1';
import { projectPlayerPopulationHousingGoldFromCurrentState } from '../ui/player-population-housing-gold-projection.js?v=im20d-1';
import { PostIM13SaveGameRestoreIntegration } from './post-im13-savegame-restore-integration.js';

const RESULT_KIND = 'post-im13-derived-state-rebinding-result';
const DERIVED_STATE_KIND = 'post-im13-rebound-derived-runtime-state';

function fail(code, message) {
  const error = new Error(message);
  error.code = code;
  throw error;
}

function frozenSorted(values, keyOf) {
  return Object.freeze([...values].sort((a, b) => keyOf(a).localeCompare(keyOf(b))));
}

function requireRuntimeState(value) {
  if (value?.kind !== 'restored-post-im13-authoritative-runtime-state') {
    fail('IM20C_COMMITTED_RUNTIME_STATE_REQUIRED', 'IM-20C committed post-IM13 runtime state required');
  }
  if (!value.world || typeof value.world.snapshot !== 'function') fail('WORLD_OWNER_REQUIRED', 'restored WorldStore owner required');
  if (!value.map || typeof value.map.snapshot !== 'function') fail('MAP_OWNER_REQUIRED', 'restored MapStructure owner required');
  if (!value.domains || typeof value.domains.names !== 'function') fail('DOMAIN_OWNERS_REQUIRED', 'restored CoreDomainStores owner required');
  if (!value.goldEconomy || typeof value.goldEconomy.snapshot !== 'function') fail('GOLD_OWNER_REQUIRED', 'restored GoldEconomyOwner required');

  const arrayNames = [
    'housingCapabilities',
    'workforceProfiles',
    'workforceRequirements',
    'productionRecipes',
    'constructionProgress',
    'buildingStocks',
    'workforceAssignments',
    'workforceBindings',
    'carrierBindings',
    'transportExecutions',
    'homeAssignments'
  ];
  for (const name of arrayNames) {
    if (!Array.isArray(value[name])) fail('RESTORED_SECTION_REQUIRED', `restored ${name} array required`);
  }
  if (!(value.productionSettlementIds instanceof Set) || !(value.goldSettlementIds instanceof Set)) {
    fail('SETTLEMENT_FENCES_REQUIRED', 'restored settlement fence owners required');
  }
  return value;
}

function buildingRecord(state, buildingId) {
  const record = state.domains.buildings.get(buildingId);
  if (!record) fail('MISSING_BUILDING_RECORD', `missing restored Building record: ${buildingId}`);
  return record;
}

function buildingIdentity(state, buildingId) {
  const record = buildingRecord(state, buildingId);
  const identity = record.identity?.kind === 'building-identity-ownership'
    ? BuildingIdentityOwnershipContract.define(record.identity)
    : BuildingIdentityOwnershipContract.define({ buildingId, definitionId: record.definitionId });
  if (identity.buildingId !== buildingId) {
    fail('BUILDING_IDENTITY_MISMATCH', `restored Building identity mismatch: ${buildingId}`);
  }
  return identity;
}

function buildingLifecycle(state, buildingId) {
  const record = buildingRecord(state, buildingId);
  const lifecycle = BuildingLifecycleStateContract.define(
    record.lifecycle?.kind === 'building-lifecycle-state'
      ? record.lifecycle
      : { buildingId, state: 'EXISTS' }
  );
  if (lifecycle.buildingId !== buildingId) {
    fail('BUILDING_LIFECYCLE_MISMATCH', `restored Building lifecycle mismatch: ${buildingId}`);
  }
  return lifecycle;
}

function completionEvidence(progressInput) {
  const progress = BuildingConstructionProgressTransitionContract.define(progressInput);
  const pending = BuildingConstructionProgressTransitionContract.define({
    buildingId: progress.buildingId,
    progress: 0
  });

  if (progress.progress === 0) {
    return ConstructionCompletionIntegration.complete({
      previousProgress: pending,
      transitions: [pending],
      progress: pending
    });
  }

  if (progress.progress < 1) {
    const current = BuildingConstructionProgressTransitionContract.advance(pending, progress.progress);
    return ConstructionCompletionIntegration.complete({
      previousProgress: pending,
      transitions: [current],
      progress: current
    });
  }

  const inProgress = BuildingConstructionProgressTransitionContract.advance(pending, 0.5);
  const completed = BuildingConstructionProgressTransitionContract.advance(inProgress, 1);
  return ConstructionCompletionIntegration.complete({
    previousProgress: pending,
    transitions: [inProgress, completed],
    progress: completed
  });
}

function deriveConstructionAndOperational(state) {
  const construction = frozenSorted(state.constructionProgress.map((progress) => {
    const normalized = BuildingConstructionProgressTransitionContract.define(progress);
    const completion = completionEvidence(normalized);
    return Object.freeze({
      kind: 'post-continue-construction-completion-projection',
      buildingId: normalized.buildingId,
      progress: normalized,
      completion,
      completionSideEffectReplayed: false
    });
  }), value => value.buildingId);

  const operational = Object.freeze(construction.map((value) => Object.freeze({
    kind: 'post-continue-operational-admission-projection',
    buildingId: value.buildingId,
    admission: OperationalBuildingAdmissionContract.evaluate({
      constructionCompletion: value.completion,
      lifecycle: buildingLifecycle(state, value.buildingId)
    })
  })));

  return Object.freeze({
    construction,
    operational,
    operationalByBuildingId: new Map(operational.map(value => [value.buildingId, value.admission]))
  });
}

function restoredResidentIdentities(state) {
  const identities = state.domains.units.ids().map((unitId) => {
    const unit = state.domains.units.get(unitId);
    if (unit?.identity?.kind !== 'person-resident-identity') return null;
    const identity = PersonResidentIdentityContract.define(unit.identity);
    if (identity.personId !== unitId) fail('PERSON_IDENTITY_MISMATCH', `restored Person identity mismatch: ${unitId}`);
    return identity;
  }).filter(Boolean);
  return frozenSorted(identities, value => value.personId);
}

function deriveHousingAndPopulation(state, operationalByBuildingId) {
  const activeAssignments = Object.freeze(state.homeAssignments
    .filter(value => value.state === 'ASSIGNED')
    .slice()
    .sort((a, b) => a.personId.localeCompare(b.personId)));
  const residentialAdmissions = [];
  const housingIntegrations = [];

  for (const capability of state.housingCapabilities) {
    const admission = operationalByBuildingId.get(capability.buildingId);
    if (!admission) {
      fail('MISSING_OPERATIONAL_ADMISSION_SOURCE', `housing Building lacks restored construction progress: ${capability.buildingId}`);
    }
    const residentialAdmission = ResidentialBuildingAdmissionContract.evaluate({
      operationalAdmission: admission,
      buildingIdentity: buildingIdentity(state, capability.buildingId),
      housingCapability: capability
    });
    residentialAdmissions.push(residentialAdmission);
    if (residentialAdmission.admitted) {
      housingIntegrations.push(ResidentialHousingCapacityOccupancyIntegration.integrate({
        residentialAdmission,
        assignments: activeAssignments
      }));
    }
  }

  const assignmentIntegration = ResidentHousingAssignmentIntegration.integrate({
    housingIntegrations,
    personIdentities: [],
    assignments: activeAssignments
  });
  if (assignmentIntegration.createdAssignments.length !== 0) {
    fail('HOME_ASSIGNMENT_REPLAY_FORBIDDEN', 'derived rebinding must not create Home assignments');
  }

  const personIdentities = restoredResidentIdentities(state);
  const population = projectAuthoritativePopulation({
    assignmentIntegration,
    personIdentities
  });

  return Object.freeze({
    kind: 'post-continue-housing-population-rebinding',
    residentialAdmissions: frozenSorted(residentialAdmissions, value => value.buildingId),
    housingIntegrations: frozenSorted(housingIntegrations, value => value.buildingId),
    assignmentIntegration,
    population,
    personIdentities,
    authoritativeHomeAssignmentsPreserved: true,
    homeAssignmentsCreated: 0
  });
}

function requirementMatchesProfile(requirement, profile) {
  return profile.specialization === requirement.requiredSpecialization
    && requirement.requiredCapabilities.every(capability => profile.capabilities.includes(capability));
}

function reboundWorkforceAssignment({ requirement, eligibility, profilesByPersonId, states, binding }) {
  const assignedStates = states
    .filter(value => value.availability === 'ASSIGNED' && value.assignmentId === binding.assignmentId)
    .sort((a, b) => a.personId.localeCompare(b.personId));
  if (assignedStates.length !== requirement.count) {
    fail(
      'WORKFORCE_COUNT_MISMATCH',
      `restored workforce count mismatch for ${requirement.buildingId}: ${assignedStates.length}/${requirement.count}`
    );
  }

  const assignments = assignedStates.map((state) => {
    const profile = profilesByPersonId.get(state.personId);
    if (!profile || !requirementMatchesProfile(requirement, profile)) {
      fail('WORKFORCE_PROFILE_MISMATCH', `restored workforce profile does not satisfy ${requirement.buildingId}: ${state.personId}`);
    }
    return Object.freeze({
      personId: state.personId,
      assignmentId: binding.assignmentId,
      profile,
      previousState: null,
      assignedState: state,
      reboundFromAuthoritativeState: true
    });
  });

  return Object.freeze({
    kind: 'operational-building-workforce-assignment',
    status: 'ASSIGNED',
    reason: 'WORKFORCE_REBOUND_AFTER_CONTINUE',
    buildingId: requirement.buildingId,
    assignmentId: binding.assignmentId,
    requiredCount: requirement.count,
    assignedCount: assignments.length,
    eligibility,
    assignments: Object.freeze(assignments),
    reboundFromAuthoritativeState: true
  });
}

function deriveWorkforceAndProduction(state, operationalByBuildingId) {
  const profilesByPersonId = new Map(state.workforceProfiles.map(value => [value.personId, value]));
  const states = frozenSorted(
    state.workforceAssignments.map(value => WorkforceAssignmentStateContract.define(value)),
    value => value.personId
  );
  const statesByPersonId = new Map(states.map(value => [value.personId, value]));
  for (const profile of state.workforceProfiles) {
    if (!statesByPersonId.has(profile.personId)) {
      fail('MISSING_WORKFORCE_STATE', `workforce profile lacks persisted assignment state: ${profile.personId}`);
    }
  }
  const candidates = Object.freeze(state.workforceProfiles.map(profile => Object.freeze({
    profile,
    state: statesByPersonId.get(profile.personId)
  })));

  const workforce = [];
  for (const definition of state.workforceRequirements) {
    const admission = operationalByBuildingId.get(definition.buildingId);
    if (!admission) {
      fail('MISSING_OPERATIONAL_ADMISSION_SOURCE', `workforce Building lacks restored construction progress: ${definition.buildingId}`);
    }
    const bindings = state.workforceBindings.filter(value => value.buildingId === definition.buildingId);
    if (!admission.admitted) {
      if (bindings.length > 0) {
        fail('WORKFORCE_BOUND_TO_NON_OPERATIONAL_BUILDING', `restored workforce is bound to non-operational Building: ${definition.buildingId}`);
      }
      workforce.push(Object.freeze({
        kind: 'post-continue-operational-workforce-projection',
        buildingId: definition.buildingId,
        active: false,
        requirementDefinition: definition,
        requirement: null,
        eligibility: null,
        workforceAssignment: null
      }));
      continue;
    }

    const requirement = OperationalBuildingWorkforceRequirementEligibilityContract.defineRequirement({
      operationalAdmission: admission,
      count: definition.count,
      requiredSpecialization: definition.requiredSpecialization,
      requiredCapabilities: definition.requiredCapabilities
    });
    const eligibility = OperationalBuildingWorkforceRequirementEligibilityContract.evaluate({
      requirement,
      candidates
    });
    if (bindings.length > 1) {
      fail('MULTIPLE_WORKFORCE_ASSIGNMENTS_FOR_BUILDING', `multiple assignmentIds bound to Building: ${definition.buildingId}`);
    }
    const workforceAssignment = bindings.length === 1
      ? reboundWorkforceAssignment({ requirement, eligibility, profilesByPersonId, states, binding: bindings[0] })
      : null;

    workforce.push(Object.freeze({
      kind: 'post-continue-operational-workforce-projection',
      buildingId: definition.buildingId,
      active: true,
      requirementDefinition: definition,
      requirement,
      eligibility,
      workforceAssignment
    }));
  }

  const workforceByBuildingId = new Map(workforce.map(value => [value.buildingId, value]));
  const production = state.productionRecipes.map((recipe) => {
    const workforceState = workforceByBuildingId.get(recipe.buildingId);
    const admission = operationalByBuildingId.get(recipe.buildingId);
    if (!admission) {
      fail('MISSING_OPERATIONAL_ADMISSION_SOURCE', `production Building lacks restored construction progress: ${recipe.buildingId}`);
    }
    if (!admission.admitted || !workforceState?.active) {
      return Object.freeze({
        kind: 'post-continue-production-readiness-projection',
        buildingId: recipe.buildingId,
        status: 'INACTIVE',
        recipe,
        productionIntegration: null,
        execution: null
      });
    }
    if (!workforceState.workforceAssignment) {
      return Object.freeze({
        kind: 'post-continue-production-readiness-projection',
        buildingId: recipe.buildingId,
        status: 'NO_WORKER',
        recipe,
        productionIntegration: null,
        execution: null
      });
    }
    const productionIntegration = OperationalBuildingProductionRecipeIntegration.integrate({
      workforceAssignment: workforceState.workforceAssignment,
      recipe
    });
    const stocks = state.buildingStocks.filter(value => value.buildingId === recipe.buildingId);
    const execution = OperationalProductionExecution.evaluate({ productionIntegration, stocks });
    return Object.freeze({
      kind: 'post-continue-production-readiness-projection',
      buildingId: recipe.buildingId,
      status: execution.status,
      recipe,
      productionIntegration,
      execution
    });
  });

  const productionByBuildingId = new Map(production.map(value => [value.buildingId, value]));
  const playerOperational = [];
  for (const [buildingId, admission] of operationalByBuildingId.entries()) {
    if (!admission.admitted) continue;
    const workforceState = workforceByBuildingId.get(buildingId);
    const productionState = productionByBuildingId.get(buildingId);
    playerOperational.push(projectPlayerOperationalState({
      operationalAdmission: admission,
      workforceAssignment: workforceState?.workforceAssignment ?? null,
      execution: productionState?.execution ?? null,
      settlement: null
    }));
  }

  return Object.freeze({
    kind: 'post-continue-operational-derived-rebinding',
    workforce: frozenSorted(workforce, value => value.buildingId),
    production: frozenSorted(production, value => value.buildingId),
    playerOperational: frozenSorted(playerOperational, value => value.buildingId),
    assignmentStateMutation: false,
    productionSettlementReplay: false
  });
}

function recoveryActionFor(execution) {
  if (execution.state === 'TO_PICKUP') return 'CONTINUE_TO_PICKUP';
  if (execution.state === 'PICKED_UP') return 'BEGIN_DROPOFF_TRANSITION';
  if (execution.state === 'TO_DROPOFF') return 'CONTINUE_TO_DROPOFF';
  return 'AWAIT_IM20F_COMPLETION_RECONCILIATION';
}

function recoveryTargetFor(job, execution) {
  if (execution.state === 'TO_PICKUP') return job.sourceLocation;
  if (execution.state === 'PICKED_UP' || execution.state === 'TO_DROPOFF') {
    return Object.freeze({ kind: 'owner', refId: job.targetId });
  }
  return null;
}

function deriveTransportBindings(state) {
  const carriers = state.domains.units.ids().map(unitId => state.domains.units.get(unitId)?.carrier).filter(Boolean);
  const carrierAssignments = new CarrierAssignmentService({
    carriers,
    assignments: state.carrierBindings
  });
  const executionByJobId = new Map(state.transportExecutions.map(value => {
    const execution = TransportExecutionContract.define(value);
    return [execution.jobId, execution];
  }));

  const active = state.carrierBindings.map((binding) => {
    const assignment = carrierAssignments.assignmentForJob(binding.jobId);
    const carrier = carrierAssignments.carrierForJob(binding.jobId);
    const execution = executionByJobId.get(binding.jobId);
    const job = state.domains.jobs.get(binding.jobId);
    if (!assignment || !carrier || !execution || !job) {
      fail('INCOMPLETE_TRANSPORT_REBINDING', `incomplete restored transport continuity: ${binding.jobId}`);
    }
    const normalizedJob = TransportJobContract.define(job);
    if (execution.unitId !== assignment.unitId) {
      fail('TRANSPORT_EXECUTION_CARRIER_MISMATCH', `transport execution/carrier mismatch: ${binding.jobId}`);
    }
    return Object.freeze({
      kind: 'post-continue-transport-runtime-binding',
      jobId: normalizedJob.id,
      unitId: assignment.unitId,
      job: normalizedJob,
      carrier,
      assignment,
      execution,
      recoveryAction: recoveryActionFor(execution),
      recoveryTarget: recoveryTargetFor(normalizedJob, execution),
      route: null,
      routeRecomputed: false,
      exactlyOnceReconciliationRequired: execution.state === 'DELIVERED'
    });
  });

  const sortedActive = frozenSorted(active, value => value.jobId);
  return Object.freeze({
    kind: 'post-continue-transport-derived-rebinding',
    carrierAssignments,
    active: sortedActive,
    executionForJob(jobId) {
      return executionByJobId.get(String(jobId)) ?? null;
    },
    routeCacheEntries: Object.freeze([]),
    routesRecomputedOnDemand: true,
    executionStatePreserved: true
  });
}

function deriveNavigation(state) {
  const pathClassification = new WorldBackedPathClassificationSource({
    map: state.map,
    world: state.world
  });
  const traversability = new WorldBackedTraversabilitySource({
    map: state.map,
    domains: state.domains
  });

  return Object.freeze({
    kind: 'post-continue-navigation-derived-rebinding',
    pathClassification,
    pathClassificationEntries: pathClassification.entries(),
    traversability,
    blockedStaticCells: traversability.entries(),
    reachability: Object.freeze({
      evaluate: options => DeterministicWorldReachabilityIntegration.evaluate({
        ...options,
        map: state.map,
        traversability
      })
    }),
    entityValidation: Object.freeze({
      validatePerson: options => RuntimeEntityNavigationValidationIntegration.validatePerson({
        ...options,
        domains: state.domains,
        map: state.map,
        traversability
      }),
      validateCarrierMovement: options => RuntimeEntityNavigationValidationIntegration.validateCarrierMovement({
        ...options,
        domains: state.domains,
        map: state.map,
        traversability
      })
    }),
    routing: Object.freeze({
      find: options => ObstacleAwareRoutingIntegration.find({
        ...options,
        map: state.map,
        classificationSource: pathClassification,
        blockedCellSource: traversability
      }),
      cacheEntries: Object.freeze([])
    })
  });
}

function schedulerPlan(transport) {
  const registrations = transport.active
    .filter(value => value.execution.state !== 'DELIVERED')
    .map(value => Object.freeze({
      kind: 'post-continue-scheduler-registration-descriptor',
      id: `transport-recovery:${value.jobId}`,
      phase: value.execution.state === 'PICKED_UP' ? 'work' : 'movement',
      jobId: value.jobId,
      unitId: value.unitId,
      recoveryAction: value.recoveryAction,
      installed: false
    }));
  return Object.freeze({
    kind: 'post-continue-scheduler-registration-plan',
    registrations: frozenSorted(registrations, value => value.id),
    subscriptions: Object.freeze([]),
    installed: false,
    requiresSuccessfulRuntimeActivation: true,
    exactlyOnceInstallationDeferredToIM20E: true
  });
}

function derivePresentation(state, housingPopulation, operational, navigation) {
  const goldSettlementIds = [...state.goldSettlementIds].sort((a, b) => a.localeCompare(b));
  const playerPopulationHousingGold = projectPlayerPopulationHousingGoldFromCurrentState({
    populationProjection: housingPopulation.population,
    housingAssignmentIntegration: housingPopulation.assignmentIntegration,
    currentGoldState: state.goldEconomy.snapshot(),
    goldSettlementIds
  });
  const visibleWorld = projectVisibleRuntimeState({ map: state.map, domains: state.domains });

  return Object.freeze({
    kind: 'post-continue-presentation-derived-rebinding',
    visibleWorld,
    playerPopulationHousingGold,
    playerOperational: operational.playerOperational,
    inspector: Object.freeze({
      kind: 'post-continue-inspector-read-model',
      status: 'REBIND_READY',
      captureStepIndex: state.captureStepIndex,
      buildingCount: state.domains.buildings.ids().length,
      personCount: visibleWorld.persons.length,
      population: housingPopulation.population.count,
      housingCapacity: playerPopulationHousingGold.housing.capacity,
      housingOccupancy: playerPopulationHousingGold.housing.occupancy,
      gold: playerPopulationHousingGold.gold.balance,
      workforceBindingCount: state.workforceBindings.length,
      carrierBindingCount: state.carrierBindings.length,
      transportExecutionCount: state.transportExecutions.length
    }),
    camera: Object.freeze({ persisted: false, policy: 'RESET_ON_RUNTIME_ACTIVATION', state: null }),
    selection: Object.freeze({ persisted: false, policy: 'CLEAR_ON_RUNTIME_ACTIVATION', state: null }),
    inspectorDomMutation: false,
    playerDomMutation: false,
    render: Object.freeze({
      projectVisibleState: () => projectVisibleRuntimeState({ map: state.map, domains: state.domains }),
      pathClassification: navigation.pathClassification
    })
  });
}

function derive(state) {
  const constructionOperational = deriveConstructionAndOperational(state);
  const housingPopulation = deriveHousingAndPopulation(state, constructionOperational.operationalByBuildingId);
  const operational = deriveWorkforceAndProduction(state, constructionOperational.operationalByBuildingId);
  const transport = deriveTransportBindings(state);
  const navigation = deriveNavigation(state);
  const scheduler = schedulerPlan(transport);
  const presentation = derivePresentation(state, housingPopulation, operational, navigation);
  const goldSettlementIds = Object.freeze([...state.goldSettlementIds].sort((a, b) => a.localeCompare(b)));

  return Object.freeze({
    kind: DERIVED_STATE_KIND,
    captureStepIndex: state.captureStepIndex,
    construction: constructionOperational.construction,
    operationalAdmissions: constructionOperational.operational,
    housing: Object.freeze({
      residentialAdmissions: housingPopulation.residentialAdmissions,
      housingIntegrations: housingPopulation.housingIntegrations,
      assignmentIntegration: housingPopulation.assignmentIntegration
    }),
    population: housingPopulation.population,
    operational,
    gold: Object.freeze({
      kind: 'post-continue-gold-settlement-fence-view',
      currentState: state.goldEconomy.snapshot(),
      settlementIds: goldSettlementIds,
      historicalLastSettlementNotDerived: true,
      settlementReplay: false
    }),
    transport,
    navigation,
    scheduler,
    presentation,
    sourceRuntimeState: state,
    policies: Object.freeze({
      authoritativeSecondTruthCreated: false,
      authoritativeMutation: false,
      completionSideEffectReplay: false,
      productionSettlementReplay: false,
      goldSettlementReplay: false,
      routeCacheRestored: false,
      runtimeActivation: false,
      schedulerInstallation: false,
      browserStorage: false,
      continueLifecycle: false,
      exactlyOnceRecoveryReconciliation: false
    })
  });
}

function rejected(reason, error = null) {
  return Object.freeze({
    kind: RESULT_KIND,
    status: 'REJECTED',
    reason,
    error: error == null ? null : Object.freeze({
      code: String(error.code ?? 'DERIVED_REBIND_FAILED'),
      message: String(error.message ?? error)
    }),
    derivedState: null
  });
}

export class PostIM13DerivedStateRebindingIntegration {
  static get resultKind() { return RESULT_KIND; }
  static get derivedStateKind() { return DERIVED_STATE_KIND; }

  static rebind(restoredResult) {
    if (restoredResult?.kind !== PostIM13SaveGameRestoreIntegration.resultKind
      || restoredResult?.status !== 'RESTORED') {
      return rejected('IM20C_RESTORED_RESULT_REQUIRED');
    }

    try {
      const runtimeState = requireRuntimeState(restoredResult.runtimeState);
      const derivedState = derive(runtimeState);
      return Object.freeze({
        kind: RESULT_KIND,
        status: 'REBOUND',
        reason: 'DERIVED_STATE_REBOUND',
        captureStepIndex: restoredResult.captureStepIndex,
        runtimeState,
        derivedState
      });
    } catch (error) {
      return rejected('DERIVED_REBIND_FAILED', error);
    }
  }

  static capabilities() {
    return Object.freeze({
      consumesIM20CRestoredResult: true,
      housingPopulationRebinding: true,
      operationalReadinessRebinding: true,
      playerProjectionRebinding: true,
      workforceBuildingRebinding: true,
      carrierJobRebinding: true,
      transportExecutionRebinding: true,
      navigationRuntimeRebinding: true,
      schedulerRegistrationPlan: true,
      presentationReadModelRebinding: true,
      derivedStateRebinding: true,
      authoritativeMutation: false,
      runtimeActivation: false,
      schedulerInstallation: false,
      browserStorage: false,
      continueLifecycle: false,
      exactlyOnceRecoveryReconciliation: false
    });
  }
}

if (typeof window !== 'undefined') {
  window.IM20DDerivedStateRebindingIntegration = PostIM13DerivedStateRebindingIntegration;
}
