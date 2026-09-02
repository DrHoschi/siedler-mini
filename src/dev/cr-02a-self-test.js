import { WorldStore } from '../world/world-store.js';
import { MapStructure } from '../world/map-structure.js';
import { CoreDomainStores } from '../domain/core-domain-stores.js';
import { ResourceState } from '../resources/resource-state.js';

export function runCr02aSelfTest() {
  const results = [];
  const check = (name, fn) => {
    try { results.push({ name, pass: !!fn() }); }
    catch (error) { results.push({ name, pass: false, error: String(error?.message || error) }); }
  };

  const world = new WorldStore();
  const map = new MapStructure(world, { width: 2, height: 2 });
  const domains = new CoreDomainStores();
  const resources = new ResourceState({ world, resourceStore: domains.resources });

  let woodType;
  let stack;

  check('resource-definition-stable-id', () => {
    woodType = resources.createDefinition({ technicalName: 'wood.log', label: 'Wood Log' });
    return woodType.id === 'resource-type:00000001' && woodType.kind === 'resource-type';
  });

  check('resource-instance-contract', () => {
    stack = resources.createResource({
      definitionId: woodType.id,
      amount: 6,
      state: 'AVAILABLE',
      location: { kind: 'cell', refId: map.cellIdAt(0, 0) },
      ownerId: world.worldId
    });
    return stack.id === 'resource:00000001' && stack.definitionId === woodType.id && stack.amount === 6;
  });

  check('location-owner-reference-validation', () => {
    let rejected = false;
    try {
      resources.createResource({ definitionId: woodType.id, location: { kind: 'cell', refId: 'cell:99999999' } });
    } catch { rejected = true; }
    return rejected && stack.location.refId === map.cellIdAt(0, 0) && stack.ownerId === world.worldId;
  });

  check('controlled-state-and-amount-mutations', () => {
    resources.setState(stack.id, 'RESERVED');
    resources.setAmount(stack.id, 3);
    resources.relocate(stack.id, { kind: 'cell', refId: map.cellIdAt(1, 1) });
    const next = resources.get(stack.id);
    return next.state === 'RESERVED' && next.amount === 3 && next.location.refId === map.cellIdAt(1, 1);
  });

  check('snapshots-frozen-and-detached', () => {
    const snap = resources.snapshot();
    const before = snap.resources.items[stack.id].amount;
    resources.setAmount(stack.id, 2);
    return before === 3 && snap.resources.items[stack.id].amount === 3 && Object.isFrozen(snap) && Object.isFrozen(snap.resources);
  });

  check('no-transport-production-or-jobs-created', () => {
    return domains.jobs.size === 0 && domains.units.size === 0 && domains.buildings.size === 0;
  });

  const pass = results.every(result => result.pass);
  return Object.freeze({ pass, results: Object.freeze(results.map(Object.freeze)) });
}
