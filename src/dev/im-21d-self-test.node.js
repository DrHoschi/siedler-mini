import assert from 'node:assert/strict';
import { CoreDomainStores } from '../domain/core-domain-stores.js';
import { BuildingIdentityOwnershipContract } from '../domain/building-identity-ownership-contract.js';
import { BuildingLifecycleStateContract } from '../domain/building-lifecycle-state-contract.js';
import { BuildingWorkAreaAuthority, BuildingWorkAreaCapabilityContract } from '../domain/building-work-area-authority.js';
import fs from 'node:fs';

function building(domains, definitionId, position) {
  const buildingId = domains.buildings.allocateId();
  domains.buildings.create({
    identity: BuildingIdentityOwnershipContract.define({ buildingId, definitionId }),
    lifecycle: BuildingLifecycleStateContract.define({ buildingId }),
    position,
  }, { id: buildingId });
  return buildingId;
}

const map = Object.freeze({ width: 12, height: 10 });
const domains = new CoreDomainStores();
const woodcutterId = building(domains, 'WOODCUTTER', { x: 5, y: 4 });
const hqId = building(domains, 'HQ', { x: 2, y: 2 });
const authority = new BuildingWorkAreaAuthority({ domains, map });

assert.equal(BuildingWorkAreaCapabilityContract.supportedDefinitionIds.includes('WOODCUTTER'), true);
assert.equal(authority.capability(woodcutterId).eligible, true);
assert.equal(authority.capability(hqId).eligible, false, 'unsupported Buildings must fail closed');

const initial = authority.project(woodcutterId);
assert.equal(initial.source, 'CAPABILITY_DEFAULT');
assert.deepEqual({ cx: initial.area.cx, cy: initial.area.cy, radius: initial.area.radius }, { cx: 5, cy: 4, radius: 2.5 });

const beforeCancel = domains.buildings.snapshot();
const draftOnly = authority.validate(woodcutterId, { shape: 'circle', cx: 6, cy: 5, radius: 2.5 });
assert.equal(draftOnly.accepted, true);
assert.deepEqual(domains.buildings.snapshot(), beforeCancel, 'validation/draft must be mutation-free');

const rejected = authority.commit(woodcutterId, { shape: 'circle', cx: 0.5, cy: 0.5, radius: 2.5 });
assert.equal(rejected.status, 'REJECTED');
assert.deepEqual(domains.buildings.snapshot(), beforeCancel, 'rejected commit must be mutation-free');

const committed = authority.commit(woodcutterId, { shape: 'circle', cx: 6, cy: 5, radius: 2.5 });
assert.equal(committed.status, 'COMMITTED');
assert.equal(authority.project(woodcutterId).source, 'AUTHORITATIVE');

const persistedDomains = domains.snapshot();
const restored = new CoreDomainStores({ restoreDomains: persistedDomains });
const restoredAuthority = new BuildingWorkAreaAuthority({ domains: restored, map });
assert.deepEqual(restoredAuthority.project(woodcutterId).area, authority.project(woodcutterId).area, 'Work Area must survive domain Save/Restore state');
assert.equal(restoredAuthority.project(woodcutterId).source, 'AUTHORITATIVE');

const workAreaUiSource = fs.readFileSync(new URL('../ui/player-work-area-integration.js', import.meta.url), 'utf8');
const catalogUiSource = fs.readFileSync(new URL('../ui/player-build-catalog-placement-integration.js', import.meta.url), 'utf8');
const indexSource = fs.readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
assert.match(workAreaUiSource, /renderResult \?\? runtime\.renderCurrentWorld\(\)/, 'overlay must reuse supplied world render result');
assert.match(workAreaUiSource, /renderOverlay\(rendered\)/, 'drag overlay must reuse the render already produced for that pointer move');
assert.match(workAreaUiSource, /setExternalSurfaceLock\?\.\('IM21D_WORK_AREA'\)/, 'Work Area entry must claim the existing IM-21C working-surface boundary');
assert.match(workAreaUiSource, /setExternalSurfaceLock\?\.\(null\)/, 'Work Area leave must release the IM-21C working-surface boundary');
assert.match(catalogUiSource, /if \(externalSurfaceLock\) return;/, 'Build entry must fail closed while an external primary surface owns the workspace');
assert.match(catalogUiSource, /if \(externalSurfaceLock\) return false;/, 'Catalog presentation must fail closed while Work Area owns the workspace');
assert.doesNotMatch(workAreaUiSource, /attempts\s*>=\s*120/, 'Work Area installer must not permanently give up before delayed browser dependencies exist');
assert.match(workAreaUiSource, /if \(installIM21DPlayerWorkArea\(\)\) window\.clearInterval\(installer\)/, 'Work Area installer may stop only after successful installation');
assert.doesNotMatch(indexSource, /\\\\n/, 'player HTML must not contain literal newline text artifacts');
assert.match(workAreaUiSource, /publishInstallerDiagnostic\('INSTALLING', dependencies\)/, 'installer diagnostics must expose INSTALLING with dependency evidence');
assert.match(workAreaUiSource, /publishInstallerDiagnostic\('INSTALLED', dependencies\)/, 'installer diagnostics must expose INSTALLED');
assert.match(workAreaUiSource, /publishInstallerDiagnostic\('INSTALL_FAILED', dependencies, error\)/, 'installer diagnostics must expose INSTALL_FAILED with exception evidence');
assert.match(workAreaUiSource, /window\.IM21DWorkAreaDiagnostic = evidence/, 'installer diagnostics must be published without becoming gameplay authority');
assert.match(workAreaUiSource, /name: error\.name/, 'installer failure evidence must include the exception name');
assert.match(workAreaUiSource, /message: error\.message/, 'installer failure evidence must include the exception message');
assert.match(workAreaUiSource, /const mapBounds = active\?\.map\?\.dimensions\?\.\(\)/, 'Work Area runtime adapter must project MapStructure dimensions into authority bounds');
assert.match(workAreaUiSource, /new BuildingWorkAreaAuthority\(\{ domains: active\?\.domains, map: mapBounds \}\)/, 'Work Area authority must receive projected map bounds rather than MapStructure');

const caps = BuildingWorkAreaAuthority.capabilities();
assert.equal(caps.legacyAuthority, false);
assert.equal(caps.domainStorePersistence, true);

console.log(JSON.stringify({
  kind: 'im-21d-self-test-result',
  pass: true,
  failClosedEligibility: true,
  explicitControlledCommit: true,
  rejectMutationFree: true,
  domainStorePersistence: true,
  transientEditorStateExcluded: true,
  nonRecursiveOverlayRendering: true,
  exclusiveWorkingSurfaceArbitration: true,
  delayedDependencyInstallation: true,
  literalNewlineArtifactsExcluded: true,
  installerDiagnosticEvidence: true,
  runtimeMapBoundsAdapter: true,
  legacyAuthority: false,
}, null, 2));
