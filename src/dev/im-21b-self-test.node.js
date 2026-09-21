import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createBaselineMiniworldScenario } from '../diagnostics/baseline-miniworld-scenario.js';
import {
  PlayerSelectionContextPanelModes,
  nextPlayerContextMode,
  projectPlayerSelectionContextPanel,
} from '../ui/player-selection-context-panel-integration.js';

const composition = createBaselineMiniworldScenario({ includeSaveContinuity: true });
const authoritative = composition.authoritative;
const beforeBuildings = JSON.stringify(authoritative.domains.buildings.snapshot());
const beforeUnits = JSON.stringify(authoritative.domains.units.snapshot());
const beforeMap = JSON.stringify(authoritative.map.snapshot());

const buildingId = authoritative.domains.buildings.ids()[0];
const building = authoritative.domains.buildings.get(buildingId);
const buildingContext = Object.freeze({
  kind: 'selection-context',
  selected: Object.freeze({
    kind: 'building',
    id: buildingId,
    definitionId: building.identity?.definitionId ?? null,
    visibleState: building.lifecycle?.state ?? building.lifecycle?.status ?? null,
  }),
});

const peek = projectPlayerSelectionContextPanel({
  selectionContext: buildingContext,
  runtimeComposition: composition,
  mode: PlayerSelectionContextPanelModes.PEEK,
});
const standard = projectPlayerSelectionContextPanel({
  selectionContext: buildingContext,
  runtimeComposition: composition,
  mode: PlayerSelectionContextPanelModes.STANDARD,
});
const expanded = projectPlayerSelectionContextPanel({
  selectionContext: buildingContext,
  runtimeComposition: composition,
  mode: PlayerSelectionContextPanelModes.EXPANDED,
});

assert.equal(peek.selected.kind, 'building');
assert.equal(peek.selected.id, buildingId);
assert.equal(peek.selected.title, 'Hauptquartier');
assert.equal(peek.selected.blockingReason, null, 'IM-21B must not invent a blocking reason');
assert.equal(standard.selected.id, peek.selected.id);
assert.equal(expanded.selected.id, peek.selected.id);
assert.deepEqual(peek.presentationActions, ['COLLAPSE', 'EXPAND', 'CLOSE']);
for (const forbidden of ['PAUSE', 'RESUME', 'DEMOLISH', 'WORK_AREA', 'BUILD']) {
  assert.equal(peek.presentationActions.includes(forbidden), false, `unsupported gameplay action leaked into context: ${forbidden}`);
}

const personId = authoritative.domains.units.ids()[0];
const person = authoritative.domains.units.get(personId);
const personContext = Object.freeze({
  kind: 'selection-context',
  selected: Object.freeze({
    kind: 'person',
    id: personId,
    visibleState: person.visibleState ?? person.state ?? person.identity?.existenceState ?? null,
  }),
});
const personProjection = projectPlayerSelectionContextPanel({
  selectionContext: personContext,
  runtimeComposition: composition,
  mode: PlayerSelectionContextPanelModes.PEEK,
});
assert.equal(personProjection.selected.kind, 'person');
assert.equal(personProjection.selected.id, personId);
assert.equal(personProjection.selected.blockingReason, null);
assert.equal(personProjection.selected.sourcePresence.selection, true);

const emptyProjection = projectPlayerSelectionContextPanel({
  selectionContext: Object.freeze({ kind: 'selection-context', selected: null }),
  runtimeComposition: composition,
});
assert.equal(emptyProjection.selected, null);

assert.equal(nextPlayerContextMode('PEEK', 'EXPAND'), 'STANDARD');
assert.equal(nextPlayerContextMode('STANDARD', 'EXPAND'), 'EXPANDED');
assert.equal(nextPlayerContextMode('EXPANDED', 'EXPAND'), 'EXPANDED');
assert.equal(nextPlayerContextMode('EXPANDED', 'COLLAPSE'), 'STANDARD');
assert.equal(nextPlayerContextMode('PEEK', 'COLLAPSE'), 'PEEK');

assert.equal(JSON.stringify(authoritative.domains.buildings.snapshot()), beforeBuildings, 'context projection must not mutate buildings');
assert.equal(JSON.stringify(authoritative.domains.units.snapshot()), beforeUnits, 'context projection must not mutate persons');
assert.equal(JSON.stringify(authoritative.map.snapshot()), beforeMap, 'context projection must not mutate map');

const [html, css, selection, placement, main, config, ci] = await Promise.all([
  readFile(new URL('../../index.html', import.meta.url), 'utf8'),
  readFile(new URL('../ui/app.css', import.meta.url), 'utf8'),
  readFile(new URL('../ui/world-selection-context-projection.js', import.meta.url), 'utf8'),
  readFile(new URL('../ui/player-placement-interaction-state-world-target.js', import.meta.url), 'utf8'),
  readFile(new URL('../main.js', import.meta.url), 'utf8'),
  readFile(new URL('../runtime/config.js', import.meta.url), 'utf8'),
  readFile(new URL('../../.github/workflows/ci.yml', import.meta.url), 'utf8'),
]);

assert.match(html, /data-player-context-panel="true"/);
assert.match(html, /data-ui-region="context"/);
assert.match(html, /data-context-mode="PEEK"/);
assert.match(html, /player-selection-context-panel-integration\.js\?v=im21b-1/);
assert.match(html, /class="projection-host" hidden aria-hidden="true"/);
assert.match(css, /\.player-context-panel\[hidden\]\{display:none!important;pointer-events:none!important\}/);
assert.match(css, /data-context-mode="PEEK"/);
assert.match(css, /orientation:portrait/);
assert.match(css, /orientation:landscape/);

assert.match(selection, /subscribe\(listener\)/);
assert.match(selection, /setWorldSelectionGuard\(guard\)/);
assert.match(selection, /if \(!worldSelectionGuard\(\)\) return;/);
assert.match(selection, /selection != null && context\.selected == null/);
assert.match(placement, /kind: 'player-placement-state-change'/);
assert.match(placement, /subscribe\(listener\)/);
assert.match(main, /IM14DWorldSelectionContext\?\.refresh\?\.\(result\)/);
assert.match(config, /IM-21B-SELECTION-CONTEXT-PANEL-INTEGRATION-TESTBUILD-1/);
assert.match(ci, /im-21a-self-test\.node\.js/);
assert.match(ci, /im-21b-self-test\.node\.js/);

console.log(JSON.stringify({
  kind: 'im-21b-self-test-result',
  pass: true,
  buildingSelection: buildingId,
  personSelection: personId,
  modes: ['PEEK', 'STANDARD', 'EXPANDED'],
  noGameplayMutation: true,
  noInventedBlockingReason: true,
  placementSelectionArbitrationWired: true,
  hiddenContextHasNoTouchSurface: true,
}, null, 2));
