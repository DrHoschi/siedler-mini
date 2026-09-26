import assert from 'node:assert/strict';
import fs from 'node:fs';

const integrationSource = fs.readFileSync(new URL('../ui/player-economy-settlement-overview-integration.js', import.meta.url), 'utf8');
const projectionSource = fs.readFileSync(new URL('../ui/player-population-housing-gold-projection.js', import.meta.url), 'utf8');
const indexSource = fs.readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
const cssSource = fs.readFileSync(new URL('../ui/app.css', import.meta.url), 'utf8');

assert.match(integrationSource, /runtime\.playerPopulationHousingGoldProjection/, 'IM-21E must reuse the existing Player Population\/Housing\/Gold read model');
assert.match(integrationSource, /economyMutationAuthority:\s*false/, 'overview must own no Economy mutation authority');
assert.match(integrationSource, /populationAuthority:\s*false/, 'overview must own no Population authority');
assert.match(integrationSource, /housingAuthority:\s*false/, 'overview must own no Housing authority');
assert.match(integrationSource, /goldAuthority:\s*false/, 'overview must own no Gold authority');
assert.match(integrationSource, /setExternalSurfaceLock\('IM21E_SETTLEMENT_OVERVIEW'\)/, 'overview must claim the frozen IM-21C external working-surface boundary');
assert.match(integrationSource, /setExternalSurfaceLock\(null\)/, 'overview must release the external working-surface boundary');
assert.match(integrationSource, /placementController\.getState\(\)\?\.status === 'ACTIVE'/, 'overview must fail closed during active Placement');
assert.match(integrationSource, /workAreaIntegration\?\.getState\?\.\(\)\.editing === true/, 'overview must fail closed during active Work Area editing');
assert.match(integrationSource, /selectionController\.clear\(\)/, 'overview entry must close Selection\/Context through the frozen Selection boundary');
assert.match(indexSource, /data-player-settlement-overview hidden aria-hidden="true"/, 'overview surface must start hidden');
assert.match(indexSource, /data-player-entry="settlement"/, 'Player settlement entry must exist');
assert.match(cssSource, /\.settlement-overview-workspace\[hidden\]\{display:none!important;pointer-events:none!important\}/, 'hidden overview must not intercept touch input');
assert.match(cssSource, /orientation:portrait/, 'responsive portrait contract must remain explicit');
assert.match(cssSource, /orientation:landscape/, 'responsive landscape contract must remain explicit');

assert.match(projectionSource, /totalOccupancy !== population\.count/, 'existing read model must retain Population\/Housing consistency');
assert.match(projectionSource, /totalOccupancy \+ totalAvailableSlots !== totalCapacity/, 'existing read model must retain aggregate Housing capacity invariant');
assert.match(projectionSource, /physical:\s*false/, 'existing read model must retain non-physical Gold semantics');

console.log(JSON.stringify({
  kind: 'im-21e-self-test-result',
  pass: true,
  existingReadModelOnly: true,
  populationHousingInvariantRetained: true,
  nonPhysicalGoldRetained: true,
  economyMutationAuthority: false,
  exclusiveWorkingSurfaceArbitration: true,
  placementFailClosed: true,
  workAreaFailClosed: true,
  hiddenSurfaceTouchIsolation: true,
  responsivePortraitLandscapeContract: true,
}, null, 2));
