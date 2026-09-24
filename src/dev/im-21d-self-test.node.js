import assert from 'node:assert/strict';
import { CoreDomainStores } from '../domain/core-domain-stores.js';
import { BuildingIdentityOwnershipContract } from '../domain/building-identity-ownership-contract.js';
import { BuildingLifecycleStateContract } from '../domain/building-lifecycle-state-contract.js';
import { BuildingWorkAreaAuthority, BuildingWorkAreaCapabilityContract } from '../domain/building-work-area-authority.js';

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
  legacyAuthority: false,
}, null, 2));
