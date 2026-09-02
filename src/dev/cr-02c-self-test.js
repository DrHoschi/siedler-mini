import { WorldStore } from '../world/world-store.js';
import { MapStructure } from '../world/map-structure.js';
import { CoreDomainStores } from '../domain/core-domain-stores.js';
import { ResourceState } from '../resources/resource-state.js';
import { ResourceClaims } from '../resources/resource-claims.js';
import { ResourceDemands } from '../resources/resource-demands.js';

export function runCr02cSelfTest() {
  const results = [];
  const check = (name, fn) => {
    try { results.push({ name, pass: !!fn() }); }
    catch (error) { results.push({ name, pass: false, error: String(error?.message || error) }); }
  };

  const world = new WorldStore();
  const map = new MapStructure(world, { width: 2, height: 2 });
  const domains = new CoreDomainStores();
  const resources = new ResourceState({ world, resourceStore: domains.resources });
  const claims = new ResourceClaims({ resourceState: resources });
  const demands = new ResourceDemands({ resourceState: resources, claims });

  const wood = resources.createDefinition({ technicalName: 'wood.log', label: 'Holz' });
  const stone = resources.createDefinition({ technicalName: 'stone.raw', label: 'Stein' });
  const woodA = resources.createResource({ definitionId: wood.id, amount: 4, location: { kind: 'cell', refId: map.cellIdAt(0, 0) } });
  const woodB = resources.createResource({ definitionId: wood.id, amount: 4, location: { kind: 'cell', refId: map.cellIdAt(1, 0) } });
  const stoneA = resources.createResource({ definitionId: stone.id, amount: 4, location: { kind: 'cell', refId: map.cellIdAt(0, 1) } });
  const demand = demands.create({ consumerId: 'building:00000001', definitionId: wood.id, amount: 6 });

  check('demand-contract-initial-progress', () => {
    const current = demands.get(demand.id);
    return current.id.startsWith('demand:') && current.targetAmount === 6 && current.reservedAmount === 0 && current.fulfilledAmount === 0 && current.remainingAmount === 6 && current.status === 'OPEN';
  });

  const claimA = demands.reserve({ demandId: demand.id, resourceId: woodA.id, amount: 4 });
  check('claim-links-to-demand-and-reduces-remaining', () => {
    const current = demands.get(demand.id);
    return claimA.demandId === demand.id && claimA.consumerId === demand.consumerId && current.reservedAmount === 4 && current.remainingAmount === 2 && current.status === 'PARTIAL';
  });

  check('demand-overreservation-rejected', () => {
    try { demands.reserve({ demandId: demand.id, resourceId: woodB.id, amount: 3 }); return false; }
    catch { return demands.get(demand.id).remainingAmount === 2; }
  });

  check('wrong-resource-type-rejected', () => {
    try { demands.reserve({ demandId: demand.id, resourceId: stoneA.id, amount: 1 }); return false; }
    catch { return true; }
  });

  const claimB = demands.reserve({ demandId: demand.id, resourceId: woodB.id, amount: 2 });
  check('fully-covered-demand-is-reserved', () => {
    const current = demands.get(demand.id);
    return current.reservedAmount === 6 && current.fulfilledAmount === 0 && current.remainingAmount === 0 && current.status === 'RESERVED';
  });

  demands.consumeClaim(claimA.id);
  check('consumed-claim-counts-as-fulfilled-not-remaining', () => {
    const current = demands.get(demand.id);
    return current.fulfilledAmount === 4 && current.reservedAmount === 2 && current.remainingAmount === 0 && current.status === 'RESERVED';
  });

  demands.consumeClaim(claimB.id);
  check('demand-fulfills-deterministically', () => {
    const current = demands.get(demand.id);
    return current.fulfilledAmount === 6 && current.reservedAmount === 0 && current.remainingAmount === 0 && current.status === 'FULFILLED';
  });

  check('demand-snapshot-frozen-and-no-gameplay-created', () => {
    const snap = demands.snapshot();
    return Object.isFrozen(snap) && Object.isFrozen(snap.items[demand.id]) && domains.buildings.size === 0 && domains.units.size === 0 && domains.jobs.size === 0;
  });

  const pass = results.every(r => r.pass);
  return Object.freeze({ pass, results: Object.freeze(results.map(Object.freeze)) });
}
