import assert from 'node:assert/strict';
import { SaveGameSnapshotContract } from '../savegame/savegame-snapshot-contract.js';
import { SaveGameValidationContract } from '../savegame/savegame-validation-contract.js';
import { PersistentStateInventorySaveGameSchemaContract as Contract } from '../savegame/persistent-state-inventory-schema-contract.js';

export function runIM20ASelfTest() {
  const schema = Contract.schema();
  const inventory = Contract.inventory();
  const persisted = Contract.persisted();
  const rebuild = Contract.rebuildDerived();

  const persistedIds = new Set(persisted.map(value => value.id));
  const rebuildIds = new Set(rebuild.map(value => value.id));
  const persistedSections = persisted.map(value => value.section);

  const requiredPersisted = [
    'capture-boundary',
    'world-store',
    'map-structure',
    'core-domain-stores',
    'gold-economy-state',
    'path-usage-wear',
    'resource-demands',
    'resource-claims',
    'construction-progress-state',
    'building-stocks',
    'building-stock-transport-reservations',
    'workforce-assignment-states',
    'resident-home-assignments',
    'production-settlement-fences',
    'gold-settlement-fences'
  ];

  const requiredRebuild = [
    'housing-capacity-occupancy-projection',
    'authoritative-population-projection',
    'operational-building-admission',
    'production-readiness-and-recipe-integration',
    'gold-flow-admission-and-last-settlement-view',
    'player-projections',
    'navigation-reachability-route-caches',
    'scheduler-registrations-and-subscriptions',
    'renderer-camera-selection-and-inspector-state'
  ];

  const checks = Object.freeze({
    schemaBoundaryDefined:
      schema.kind === 'im-20-savegame-schema-boundary'
      && schema.status === 'DEFINED_NOT_ACTIVE'
      && schema.schemaVersion === 2
      && schema.predecessorSchemaVersion === 1,
    activeIM13SchemaRemainsUntouched:
      SaveGameSnapshotContract.schemaVersion === 1
      && SaveGameValidationContract.schemaVersion === 1,
    noIM20BSnapshotActivation:
      schema.rules.snapshotCaptureExtendedByIM20A === false
      && schema.rules.restoreExecutionIntroducedByIM20A === false
      && schema.rules.browserStorageIntroducedByIM20A === false,
    allRequiredPersistedTruthInventoried:
      requiredPersisted.every(id => persistedIds.has(id)),
    allRequiredDerivedTruthExplicitlyExcludedFromPersistence:
      requiredRebuild.every(id => rebuildIds.has(id)),
    persistAndRebuildSetsDisjoint:
      [...persistedIds].every(id => !rebuildIds.has(id)),
    persistedSectionsUnique:
      new Set(persistedSections).size === persistedSections.length
      && persistedSections.every(value => typeof value === 'string' && value.length > 0),
    postIM13AssignmentsAndStocksCovered:
      persistedIds.has('building-stocks')
      && persistedIds.has('workforce-assignment-states')
      && persistedIds.has('resident-home-assignments')
      && persistedIds.has('building-stock-transport-reservations'),
    resourceReservationTruthCovered:
      persistedIds.has('resource-demands')
      && persistedIds.has('resource-claims'),
    exactlyOnceContinuityCovered:
      persistedIds.has('production-settlement-fences')
      && persistedIds.has('gold-settlement-fences')
      && schema.rules.exactlyOnceFenceContinuityRequired === true,
    derivedPopulationNotPersisted:
      !persistedIds.has('authoritative-population-projection')
      && rebuildIds.has('authoritative-population-projection'),
    uiInspectorNotGameplayPersistence:
      !persistedIds.has('player-projections')
      && !persistedIds.has('renderer-camera-selection-and-inspector-state'),
    failClosedCompatibilityBoundary:
      schema.compatibility.silentFallbackToNewGame === false
      && schema.compatibility.legacyMainSaveMigrationInScope === false,
    immutableContract:
      Object.isFrozen(schema)
      && Object.isFrozen(inventory)
      && Object.isFrozen(persisted)
      && Object.isFrozen(rebuild)
      && inventory.every(Object.isFrozen)
  });

  assert.equal(Object.values(checks).every(Boolean), true, JSON.stringify(checks, null, 2));

  return Object.freeze({
    kind: 'im-20a-self-test-result',
    pass: true,
    checks,
    evidence: Object.freeze({
      targetSchemaVersion: Contract.targetSchemaVersion,
      activeSnapshotSchemaVersion: SaveGameSnapshotContract.schemaVersion,
      activeValidationSchemaVersion: SaveGameValidationContract.schemaVersion,
      inventoryEntries: inventory.length,
      persistedEntries: persisted.length,
      rebuildDerivedEntries: rebuild.length,
      persistedSections: Object.freeze(persistedSections.slice())
    }),
    capabilities: Object.freeze({
      inventoryDefined: true,
      targetSchemaBoundaryDefined: true,
      snapshotCaptureExtended: false,
      restoreExtended: false,
      browserStorage: false,
      continueLifecycle: false,
      im20bImplementation: false
    })
  });
}
