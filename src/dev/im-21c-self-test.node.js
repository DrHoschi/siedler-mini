import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  IM21C_V1_BUILDING_CATALOG,
  IM21C_SUPPORTED_PLACEMENT_OPTIONS,
  projectPlayerBuildingCatalog,
} from '../ui/player-building-catalog-projection.js';
import {
  IM16F_BASELINE_BUILDING_OPTIONS,
  createPlayerBuildingSelectionPlacementActivation,
} from '../ui/player-building-selection-placement-activation.js';

const catalog = projectPlayerBuildingCatalog();
assert.equal(catalog.source, 'S2D-05-V1-CONTENT');
assert.deepEqual(catalog.entries.map(entry => entry.contentId), [
  'b.hq','b.house_small','b.house_middle','b.lumberjack','b.quarry','b.fisher','b.hunter',
]);
assert.equal(catalog.entries.length, 7);
assert.deepEqual(IM21C_SUPPORTED_PLACEMENT_OPTIONS.map(entry => entry.definitionId), ['HQ', 'WOODCUTTER']);
assert.equal(catalog.entries.find(entry => entry.contentId === 'b.house_small').placementSupported, false);
assert.equal(catalog.entries.some(entry => entry.runtimeDefinitionId === 'STOREHOUSE'), false, 'legacy/transitional STOREHOUSE must not become V1 catalog authority');
assert.deepEqual(IM16F_BASELINE_BUILDING_OPTIONS.map(entry => entry.definitionId), ['HQ','WOODCUTTER','STOREHOUSE'], 'frozen IM-16F baseline evidence must remain intact');

let placementState = Object.freeze({ status: 'INACTIVE', definitionId: null });
const placementController = Object.freeze({
  activate(definitionId) {
    placementState = Object.freeze({ status: 'ACTIVE', definitionId });
    return placementState;
  },
  getState: () => placementState,
});
const selection = createPlayerBuildingSelectionPlacementActivation({
  placementController,
  options: IM21C_SUPPORTED_PLACEMENT_OPTIONS,
});
assert.equal(selection.select('HQ').status, 'ACTIVATED');
assert.equal(placementState.definitionId, 'HQ');
assert.equal(selection.select('STOREHOUSE').status, 'REJECTED');
assert.equal(selection.select('STOREHOUSE').reason, 'BUILDING_OPTION_NOT_AVAILABLE');

const [html, css, selectionSource, integrationSource, main, config, ci] = await Promise.all([
  readFile(new URL('../../index.html', import.meta.url), 'utf8'),
  readFile(new URL('../ui/app.css', import.meta.url), 'utf8'),
  readFile(new URL('../ui/player-building-selection-placement-activation.js', import.meta.url), 'utf8'),
  readFile(new URL('../ui/player-build-catalog-placement-integration.js', import.meta.url), 'utf8'),
  readFile(new URL('../main.js', import.meta.url), 'utf8'),
  readFile(new URL('../runtime/config.js', import.meta.url), 'utf8'),
  readFile(new URL('../../.github/workflows/ci.yml', import.meta.url), 'utf8'),
]);

assert.match(html, /data-player-build-catalog/);
assert.match(html, /data-player-placement-controls/);
assert.match(html, /data-ui-region="build-catalog"/);
assert.match(html, /data-ui-region="placement-controls"/);
assert.match(html, /player-build-catalog-placement-integration\.js\?v=im21c-1/);
assert.match(css, /\.build-catalog-workspace\[hidden\],\.placement-workspace\[hidden\]\{display:none!important;pointer-events:none!important\}/);
assert.match(css, /orientation:portrait/);
assert.match(css, /orientation:landscape/);
assert.match(selectionSource, /options: IM21C_SUPPORTED_PLACEMENT_OPTIONS/);
assert.match(integrationSource, /selectionController\.clear\(\)/);
assert.match(integrationSource, /placementController\.subscribe/);
assert.match(integrationSource, /inactiveDestination === 'catalog'/);
assert.match(main, /IM-21(?:C|D) · TESTBUILD 1/, 'IM-21C contract may run under the authorized IM-21D successor build identity');
assert.doesNotMatch(main, /buildWorkspace\.hidden/);
assert.match(config, /IM-21C-BUILD-CATALOG-PLACEMENT-PLAYER-UX-INTEGRATION-TESTBUILD-1/);
assert.match(ci, /im-21b-self-test\.node\.js/);
assert.match(ci, /im-21c-self-test\.node\.js/);

assert.equal(catalog.capabilities.contentAuthority, false);
assert.equal(catalog.capabilities.runtimeBuildingRegistry, false);
assert.equal(catalog.capabilities.placementAuthority, false);
assert.equal(catalog.capabilities.constructionAuthority, false);
assert.equal(catalog.capabilities.saveGameAuthority, false);

console.log(JSON.stringify({
  kind: 'im-21c-self-test-result',
  pass: true,
  v1CatalogEntries: catalog.entries.length,
  supportedPlacementDefinitions: IM21C_SUPPORTED_PLACEMENT_OPTIONS.map(entry => entry.definitionId),
  unsupportedV1EntriesFailClosed: true,
  frozenIM16FBaselinePreserved: true,
  legacyStorehouseNotPromoted: true,
  singlePrimaryWorkingSurfaceWired: true,
  noGameplayAuthorityAdded: true,
}, null, 2));
