const POLICY = Object.freeze({
  PERSIST: 'PERSIST',
  REBUILD_DERIVE: 'REBUILD_DERIVE'
});

const TARGET_SCHEMA_VERSION = 2;
const PREDECESSOR_SCHEMA_VERSION = 1;

function deepFreeze(value) {
  if (value == null || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function entry({
  id,
  policy,
  authority,
  section = null,
  source,
  rationale,
  continuity = null
}) {
  if (!id || typeof id !== 'string') throw new TypeError('inventory id required');
  if (!Object.values(POLICY).includes(policy)) throw new TypeError(`invalid persistence policy: ${policy}`);
  if (!authority || typeof authority !== 'string') throw new TypeError(`authority required for ${id}`);
  if (policy === POLICY.PERSIST && (!section || typeof section !== 'string')) {
    throw new TypeError(`persisted inventory entry requires schema section: ${id}`);
  }
  if (policy === POLICY.REBUILD_DERIVE && section != null) {
    throw new TypeError(`rebuild/derive inventory entry must not own a persisted section: ${id}`);
  }
  return deepFreeze({
    id,
    policy,
    authority,
    section,
    source,
    rationale,
    continuity
  });
}

const INVENTORY = deepFreeze([
  // Existing IM-13 authoritative SaveGame truth.
  entry({
    id: 'capture-boundary',
    policy: POLICY.PERSIST,
    authority: 'SaveGame completed-step capture metadata',
    section: 'capture',
    source: 'IM-13A',
    rationale: 'A SaveGame must be tied to an allowed completed simulation-step boundary.',
    continuity: 'stepIndex must round-trip unchanged'
  }),
  entry({
    id: 'world-store',
    policy: POLICY.PERSIST,
    authority: 'WorldStore',
    section: 'world',
    source: 'CR-01 / IM-13',
    rationale: 'World identity, world entities and world stable-ID allocator are authoritative.',
    continuity: 'world stable IDs and allocator continuity'
  }),
  entry({
    id: 'map-structure',
    policy: POLICY.PERSIST,
    authority: 'MapStructure',
    section: 'map',
    source: 'CR-01 / IM-13',
    rationale: 'Map identity, dimensions, cells and tile references are authoritative world structure.',
    continuity: 'map/cell/tile identity must remain stable'
  }),
  entry({
    id: 'core-domain-stores',
    policy: POLICY.PERSIST,
    authority: 'CoreDomainStores: buildings, units, resources, jobs',
    section: 'domains',
    source: 'CR-01C / IM-13',
    rationale: 'The four core domain stores contain authoritative entity state and stable allocators.',
    continuity: 'all store revisions, items and allocators must round-trip'
  }),
  entry({
    id: 'gold-economy-state',
    policy: POLICY.PERSIST,
    authority: 'GoldEconomyOwner',
    section: 'economy.gold',
    source: 'CR-30C / IM-19F',
    rationale: 'Current non-physical Gold balance is authoritative and must not be recomputed by replaying income.',
    continuity: 'balance is restored directly; no settlement replay'
  }),
  entry({
    id: 'path-usage-wear',
    policy: POLICY.PERSIST,
    authority: 'DeterministicPathUsageWearIntegration',
    section: 'pathWear',
    source: 'CR-32B / IM-13',
    rationale: 'Path/Road usage and wear are authoritative simulation state rather than render stamps.',
    continuity: 'usageCount/wearUnits and cell linkage must round-trip'
  }),

  // Stateful authorities introduced or made gameplay-effective beyond the original IM-13 snapshot boundary.
  entry({
    id: 'resource-demands',
    policy: POLICY.PERSIST,
    authority: 'ResourceDemands',
    section: 'authoritative.resourceDemands',
    source: 'CR-02C / IM-17',
    rationale: 'Open/partial/reserved/fulfilled demand truth controls real outstanding material need.',
    continuity: 'demand records plus demand stable-ID allocator continuity'
  }),
  entry({
    id: 'resource-claims',
    policy: POLICY.PERSIST,
    authority: 'ResourceClaims',
    section: 'authoritative.resourceClaims',
    source: 'CR-02B / IM-17',
    rationale: 'Claim state prevents duplicated reservation/consumption of physical Resources.',
    continuity: 'claim records plus claim stable-ID allocator continuity'
  }),
  entry({
    id: 'construction-progress-state',
    policy: POLICY.PERSIST,
    authority: 'BuildingConstructionProgressTransitionContract state held by active construction integration',
    section: 'authoritative.constructionProgress',
    source: 'IM-17E/IM-17F',
    rationale: 'In-progress/completed construction must resume from the same authoritative progress without replaying completion.',
    continuity: 'buildingId, state and progress; restored COMPLETE must not emit completion again'
  }),
  entry({
    id: 'building-stocks',
    policy: POLICY.PERSIST,
    authority: 'BuildingStockContract state',
    section: 'authoritative.buildingStocks',
    source: 'CR-25 / IM-18',
    rationale: 'Local physical BuildingStock is gameplay truth and cannot be reconstructed from global resources.',
    continuity: 'buildingId/resourceTypeId/quantity conservation'
  }),
  entry({
    id: 'building-stock-transport-reservations',
    policy: POLICY.PERSIST,
    authority: 'BuildingStockTransportReservationContract state',
    section: 'authoritative.buildingStockTransportReservations',
    source: 'CR-27 / IM-17',
    rationale: 'Reservation state is required to prevent double dispatch/settlement of local physical stock.',
    continuity: 'reservation identity and ACTIVE/RELEASED state for nonterminal recovery'
  }),
  entry({
    id: 'workforce-assignment-states',
    policy: POLICY.PERSIST,
    authority: 'WorkforceAssignmentStateContract state',
    section: 'authoritative.workforceAssignments',
    source: 'CR-26 / IM-18C',
    rationale: 'FREE/ASSIGNED/UNAVAILABLE workforce truth must survive Continue without reassigning a different Person.',
    continuity: 'personId, availability and assignmentId'
  }),
  entry({
    id: 'resident-home-assignments',
    policy: POLICY.PERSIST,
    authority: 'ResidentHomeAssignmentContract state',
    section: 'authoritative.homeAssignments',
    source: 'CR-30A / IM-19C',
    rationale: 'Resident→Home identity is authoritative social state; recomputing it could silently move residents.',
    continuity: 'personId and homeBuildingId'
  }),
  entry({
    id: 'production-settlement-fences',
    policy: POLICY.PERSIST,
    authority: 'InputConsumptionOutputSettlement settledIds',
    section: 'authoritative.settlementFences.production',
    source: 'IM-18F',
    rationale: 'Exactly-once production settlement IDs prevent consumed inputs/output production from replaying after Continue.',
    continuity: 'all effective production settlement IDs'
  }),
  entry({
    id: 'gold-settlement-fences',
    policy: POLICY.PERSIST,
    authority: 'OperationalEconomyGoldSettlement settledIds',
    section: 'authoritative.settlementFences.gold',
    source: 'IM-19F',
    rationale: 'Exactly-once Gold settlement IDs prevent already-booked population income from being applied again.',
    continuity: 'all effective Gold settlement IDs'
  }),

  // Derived/transient state: never persisted as a second gameplay truth in the IM-20 schema.
  entry({
    id: 'housing-capacity-occupancy-projection',
    policy: POLICY.REBUILD_DERIVE,
    authority: 'ResidentialHousingCapacityOccupancyIntegration',
    source: 'IM-19B',
    rationale: 'Occupancy/availableSlots/status derive from restored Housing capability plus authoritative Home assignments.'
  }),
  entry({
    id: 'authoritative-population-projection',
    policy: POLICY.REBUILD_DERIVE,
    authority: 'authoritative-population-projection',
    source: 'IM-19D',
    rationale: 'Population is derived from restored existing Persons and authoritative Home assignments.'
  }),
  entry({
    id: 'operational-building-admission',
    policy: POLICY.REBUILD_DERIVE,
    authority: 'OperationalBuildingAdmissionContract',
    source: 'IM-18A',
    rationale: 'Operational admission derives from restored Building/construction truth.'
  }),
  entry({
    id: 'workforce-eligibility-and-operational-assignment-projection',
    policy: POLICY.REBUILD_DERIVE,
    authority: 'OperationalBuildingWorkforceRequirementEligibilityContract / assignment integration projection',
    source: 'IM-18B/IM-18C',
    rationale: 'Eligibility/read models are recomputed from restored Person profiles and persisted workforce assignment states.'
  }),
  entry({
    id: 'production-readiness-and-recipe-integration',
    policy: POLICY.REBUILD_DERIVE,
    authority: 'OperationalProductionExecution / ProductionBuildingStockContract integration',
    source: 'IM-18D/IM-18E',
    rationale: 'Recipe integration and READY/BLOCKED_INPUT derive from restored Building, workforce and stock truth.'
  }),
  entry({
    id: 'construction-completion-projection',
    policy: POLICY.REBUILD_DERIVE,
    authority: 'ConstructionCompletionIntegration',
    source: 'IM-17G',
    rationale: 'Completion read/evidence derives from restored progress; restore must not replay the completion side effect.'
  }),
  entry({
    id: 'gold-flow-admission-and-last-settlement-view',
    policy: POLICY.REBUILD_DERIVE,
    authority: 'GoldEconomyAdmissionFlowIntegration / Gold settlement read model',
    source: 'IM-19E/IM-19F',
    rationale: 'Current balance and settlement fences persist; admissions/read models are rebuilt without applying income.'
  }),
  entry({
    id: 'player-projections',
    policy: POLICY.REBUILD_DERIVE,
    authority: 'Player UI read-only projections',
    source: 'IM-16G/IM-17G/IM-18G/IM-19G',
    rationale: 'Player UI is a consumer of restored authoritative state and owns no persisted gameplay truth.'
  }),
  entry({
    id: 'transport-execution-recovery-projections',
    policy: POLICY.REBUILD_DERIVE,
    authority: 'Transport execution/assignment/recovery integrations',
    source: 'CR-05..CR-27',
    rationale: 'Core transport jobs/resources persist in domain stores; transient execution bindings are reconstructed under recovery rules.'
  }),
  entry({
    id: 'navigation-reachability-route-caches',
    policy: POLICY.REBUILD_DERIVE,
    authority: 'Navigation/reachability/pathfinding derived runtime state',
    source: 'CR-09..CR-32',
    rationale: 'Routes, reachability results and caches are transient derivatives of restored world/domain state.'
  }),
  entry({
    id: 'path-classification-and-traversability-projections',
    policy: POLICY.REBUILD_DERIVE,
    authority: 'WorldBackedPathClassificationSource / WorldBackedTraversabilitySource',
    source: 'CR-32A / IM-13D',
    rationale: 'Classification/traversability derive from restored map/world/domain state; only wear itself persists.'
  }),
  entry({
    id: 'scheduler-registrations-and-subscriptions',
    policy: POLICY.REBUILD_DERIVE,
    authority: 'Scheduler/runtime lifecycle registration',
    source: 'CR-00 / IM-13D',
    rationale: 'Runtime registrations are reconstructed exactly once after successful activation and must never be serialized as owner truth.'
  }),
  entry({
    id: 'renderer-camera-selection-and-inspector-state',
    policy: POLICY.REBUILD_DERIVE,
    authority: 'Renderer / Camera / Selection / Inspector runtime projections',
    source: 'IM-14/IM-15',
    rationale: 'These are presentation/debug runtime state and do not own gameplay truth in the IM-20 SaveGame schema.'
  })
]);

function assertInventory() {
  const ids = new Set();
  const sections = new Set();
  for (const value of INVENTORY) {
    if (ids.has(value.id)) throw new Error(`duplicate persistence inventory id: ${value.id}`);
    ids.add(value.id);
    if (value.policy === POLICY.PERSIST) {
      if (sections.has(value.section)) throw new Error(`duplicate persisted schema section: ${value.section}`);
      sections.add(value.section);
    }
  }
}
assertInventory();

const SCHEMA = deepFreeze({
  kind: 'im-20-savegame-schema-boundary',
  status: 'DEFINED_NOT_ACTIVE',
  schemaVersion: TARGET_SCHEMA_VERSION,
  predecessorSchemaVersion: PREDECESSOR_SCHEMA_VERSION,
  savegameKind: 'savegame-snapshot',
  compatibility: Object.freeze({
    predecessorRead: 'EXPLICIT_MIGRATION_OR_COMPATIBILITY_STEP_REQUIRED',
    silentFallbackToNewGame: false,
    legacyMainSaveMigrationInScope: false
  }),
  persistedSections: Object.freeze(INVENTORY
    .filter(value => value.policy === POLICY.PERSIST)
    .map(value => value.section)),
  rebuildDeriveIds: Object.freeze(INVENTORY
    .filter(value => value.policy === POLICY.REBUILD_DERIVE)
    .map(value => value.id)),
  rules: Object.freeze({
    authoritativeTruthOnly: true,
    derivedSecondTruthForbidden: true,
    completedStepCaptureRequired: true,
    stableIdAllocatorContinuityRequired: true,
    exactlyOnceFenceContinuityRequired: true,
    invalidPayloadFailsClosed: true,
    restoreExecutionIntroducedByIM20A: false,
    snapshotCaptureExtendedByIM20A: false,
    browserStorageIntroducedByIM20A: false
  })
});

export class PersistentStateInventorySaveGameSchemaContract {
  static get policies() {
    return POLICY;
  }

  static get targetSchemaVersion() {
    return TARGET_SCHEMA_VERSION;
  }

  static get predecessorSchemaVersion() {
    return PREDECESSOR_SCHEMA_VERSION;
  }

  static inventory() {
    return INVENTORY;
  }

  static persisted() {
    return Object.freeze(INVENTORY.filter(value => value.policy === POLICY.PERSIST));
  }

  static rebuildDerived() {
    return Object.freeze(INVENTORY.filter(value => value.policy === POLICY.REBUILD_DERIVE));
  }

  static schema() {
    return SCHEMA;
  }

  static entry(id) {
    const found = INVENTORY.find(value => value.id === id);
    return found ?? null;
  }
}
