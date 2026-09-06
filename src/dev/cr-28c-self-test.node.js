import assert from 'node:assert/strict';
import { WorldStore } from '../world/world-store.js';
import { MapStructure } from '../world/map-structure.js';
import { CoreDomainStores } from '../domain/core-domain-stores.js';
import { BuildingIdentityOwnershipContract } from '../domain/building-identity-ownership-contract.js';
import { BuildingLifecycleStateContract } from '../domain/building-lifecycle-state-contract.js';
import { PersonResidentIdentityContract } from '../domain/person-resident-identity-contract.js';
import {
  projectVisibleRuntimeState,
  renderLiveRuntimeToCanvas,
  snapshotVisibleRuntimeState
} from '../render/live-runtime-render-integration.js';

function fakeContext() {
  const calls = [];
  return {
    calls,
    canvas: { width: 320, height: 240 },
    clearRect: (...args) => calls.push(['clearRect', ...args]),
    fillRect: (...args) => calls.push(['fillRect', ...args]),
    strokeRect: (...args) => calls.push(['strokeRect', ...args]),
    beginPath: (...args) => calls.push(['beginPath', ...args]),
    arc: (...args) => calls.push(['arc', ...args]),
    fill: (...args) => calls.push(['fill', ...args])
  };
}

const world = new WorldStore();
const map = new MapStructure(world, { name: 'CR-28C Miniworld', width: 4, height: 3, cellSize: 1 });
const domains = new CoreDomainStores();

const hqId = domains.buildings.allocateId();
domains.buildings.create({
  identity: BuildingIdentityOwnershipContract.define({ buildingId: hqId, definitionId: 'HQ' }),
  lifecycle: BuildingLifecycleStateContract.define({ buildingId: hqId }),
  position: { x: 1, y: 1 }
}, { id: hqId });

const woodcutterId = domains.buildings.allocateId();
domains.buildings.create({
  identity: BuildingIdentityOwnershipContract.define({ buildingId: woodcutterId, definitionId: 'WOODCUTTER' }),
  lifecycle: BuildingLifecycleStateContract.define({ buildingId: woodcutterId }),
  position: { x: 2.5, y: 1.5 }
}, { id: woodcutterId });

const personId = domains.units.allocateId();
domains.units.create({
  identity: PersonResidentIdentityContract.define({ personId }),
  position: { x: 0.75, y: 2 }
}, { id: personId });

const sources = { map, domains };
const before = structuredClone(snapshotVisibleRuntimeState(sources));
const projection = projectVisibleRuntimeState(sources);
assert.equal(projection.map.id, map.mapId);
assert.deepEqual(projection.buildings.map(entry => entry.id), [hqId, woodcutterId].sort());
assert.deepEqual(projection.persons.map(entry => entry.id), [personId]);
assert.deepEqual(snapshotVisibleRuntimeState(sources), before, 'projection must not mutate current runtime owners');

const ctx = fakeContext();
const first = renderLiveRuntimeToCanvas(ctx, sources, { cellPixels: 24, offset: { x: 12, y: 12 }, width: 320, height: 240 });
assert.equal(first.commands.some(command => command.role === 'world-ground'), true);
assert.equal(first.commands.filter(command => command.role === 'building').length, 2);
assert.equal(first.commands.filter(command => command.role === 'person').length, 1);
assert.equal(ctx.calls.some(call => call[0] === 'strokeRect'), true);
assert.equal(ctx.calls.filter(call => call[0] === 'arc').length, 1);
assert.deepEqual(snapshotVisibleRuntimeState(sources), before, 'Canvas rendering must not mutate current runtime owners');

domains.units.update(personId, draft => {
  draft.position = { x: 1.75, y: 2 };
});
const ctxChanged = fakeContext();
const changed = renderLiveRuntimeToCanvas(ctxChanged, sources, { cellPixels: 24, offset: { x: 12, y: 12 }, width: 320, height: 240 });
assert.notDeepEqual(changed.commands, first.commands, 'live owner change must become visible on the next render');
assert.equal(changed.projection.persons[0].position.x, 1.75);

console.log('CR-28C PASS / 0 BLOCKER');
