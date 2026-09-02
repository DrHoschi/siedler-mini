import { WorldStore } from '../world/world-store.js';
import { CoreDomainStores } from '../domain/core-domain-stores.js';
import { ResourceState } from '../resources/resource-state.js';
import { ResourceClaims } from '../resources/resource-claims.js';
import { ResourceDemands } from '../resources/resource-demands.js';

export function runCr02FreezeGate({ domains, resources, resourceClaims, resourceDemands } = {}) {
  const results = [];
  const check = (name, fn) => {
    try { results.push({ name, pass: !!fn() }); }
    catch (error) { results.push({ name, pass: false, error: String(error?.message || error) }); }
  };

  check('productive-scope-remains-empty', () => {
    return domains
      && domains.buildings.size === 0
      && domains.units.size === 0
      && domains.jobs.size === 0
      && domains.resources.size === 0
      && resources.definitionIds().length === 0
      && resourceClaims.ids().length === 0
      && resourceDemands.ids().length === 0;
  });

  check('resource-and-demand-invariants', () => {
    const world = new WorldStore();
    const isolatedDomains = new CoreDomainStores();
    const state = new ResourceState({ world, resourceStore: isolatedDomains.resources });
    const claims = new ResourceClaims({ resourceState: state });
    const demands = new ResourceDemands({ resourceState: state, claims });

    const wood = state.createDefinition({ technicalName: 'wood.log', label: 'Wood' });
    const stock = state.createResource({ definitionId: wood.id, amount: 6 });
    const demand = demands.create({ consumerId: world.worldId, definitionId: wood.id, amount: 6 });

    const c1 = demands.reserve({ demandId: demand.id, resourceId: stock.id, amount: 4 });
    const p1 = demands.progress(demand.id);
    const r1 = claims.availableAmount(stock.id) + claims.reservedAmount(stock.id) + claims.consumedAmount(stock.id);
    if (!(p1.reservedAmount === 4 && p1.fulfilledAmount === 0 && p1.remainingAmount === 2 && r1 === 6)) return false;

    let overDemandRejected = false;
    try { demands.reserve({ demandId: demand.id, resourceId: stock.id, amount: 3 }); }
    catch { overDemandRejected = true; }
    if (!overDemandRejected) return false;

    const c2 = demands.reserve({ demandId: demand.id, resourceId: stock.id, amount: 2 });
    const p2 = demands.progress(demand.id);
    if (!(p2.reservedAmount === 6 && p2.remainingAmount === 0 && p2.status === 'RESERVED')) return false;

    demands.consumeClaim(c1.id);
    const p3 = demands.progress(demand.id);
    const r3 = claims.availableAmount(stock.id) + claims.reservedAmount(stock.id) + claims.consumedAmount(stock.id);
    if (!(p3.reservedAmount === 2 && p3.fulfilledAmount === 4 && p3.remainingAmount === 0 && r3 === 6)) return false;

    demands.releaseClaim(c2.id);
    const p4 = demands.progress(demand.id);
    const r4 = claims.availableAmount(stock.id) + claims.reservedAmount(stock.id) + claims.consumedAmount(stock.id);
    if (!(p4.reservedAmount === 0 && p4.fulfilledAmount === 4 && p4.remainingAmount === 2 && p4.status === 'PARTIAL' && r4 === 6)) return false;

    const c3 = demands.reserve({ demandId: demand.id, resourceId: stock.id, amount: 2 });
    demands.consumeClaim(c3.id);
    const p5 = demands.progress(demand.id);
    const r5 = claims.availableAmount(stock.id) + claims.reservedAmount(stock.id) + claims.consumedAmount(stock.id);
    return p5.reservedAmount === 0
      && p5.fulfilledAmount === 6
      && p5.remainingAmount === 0
      && p5.status === 'FULFILLED'
      && r5 === 6;
  });

  check('claim-demand-type-linkage', () => {
    const world = new WorldStore();
    const isolatedDomains = new CoreDomainStores();
    const state = new ResourceState({ world, resourceStore: isolatedDomains.resources });
    const claims = new ResourceClaims({ resourceState: state });
    const demands = new ResourceDemands({ resourceState: state, claims });
    const wood = state.createDefinition({ technicalName: 'wood.log' });
    const stone = state.createDefinition({ technicalName: 'stone.raw' });
    const stoneStock = state.createResource({ definitionId: stone.id, amount: 4 });
    const demand = demands.create({ consumerId: world.worldId, definitionId: wood.id, amount: 2 });
    let rejected = false;
    try { demands.reserve({ demandId: demand.id, resourceId: stoneStock.id, amount: 1 }); }
    catch { rejected = true; }
    return rejected && claims.ids().length === 0 && demands.progress(demand.id).remainingAmount === 2;
  });

  const pass = results.every(result => result.pass);
  return Object.freeze({ pass, blockers: results.filter(result => !result.pass).length, results: Object.freeze(results.map(Object.freeze)) });
}
