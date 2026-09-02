import { WorldStore } from '../world/world-store.js';
import { MapStructure } from '../world/map-structure.js';
import { CoreDomainStores } from '../domain/core-domain-stores.js';
import { ResourceState } from '../resources/resource-state.js';
import { ResourceClaims } from '../resources/resource-claims.js';
import { ResourceDemands } from '../resources/resource-demands.js';
import { ResourceMatching } from '../resources/resource-matching.js';

export function runCr03aSelfTest() {
  const results = [];
  const check = (name, fn) => {
    try { results.push({ name, pass: !!fn() }); }
    catch (error) { results.push({ name, pass: false, error: String(error?.message || error) }); }
  };

  const world = new WorldStore();
  const map = new MapStructure(world, { width: 3, height: 2 });
  const domains = new CoreDomainStores();
  const resources = new ResourceState({ world, resourceStore: domains.resources });
  const claims = new ResourceClaims({ resourceState: resources });
  const demands = new ResourceDemands({ resourceState: resources, claims });
  const matching = new ResourceMatching({ resourceState: resources, claims, demands });

  const wood = resources.createDefinition({ technicalName: 'wood.log', label: 'Holz' });
  const stone = resources.createDefinition({ technicalName: 'stone.raw', label: 'Stein' });

  const woodA = resources.createResource({ definitionId: wood.id, amount: 4, location: { kind: 'cell', refId: map.cellIdAt(0, 0) } }, { id: 'resource:00000001' });
  const woodB = resources.createResource({ definitionId: wood.id, amount: 5, location: { kind: 'cell', refId: map.cellIdAt(1, 0) } }, { id: 'resource:00000002' });
  resources.createResource({ definitionId: stone.id, amount: 9, location: { kind: 'cell', refId: map.cellIdAt(2, 0) } }, { id: 'resource:00000003' });

  claims.reserve({ resourceId: woodA.id, amount: 1, consumerId: 'building:00000009' });

  const demandA = demands.create({ consumerId: 'building:00000001', definitionId: wood.id, amount: 6 }, { id: 'demand:00000001' });
  const demandB = demands.create({ consumerId: 'building:00000002', definitionId: wood.id, amount: 4 }, { id: 'demand:00000002' });

  check('single-demand-matches-only-correct-type-and-unclaimed-amount', () => {
    const match = matching.matchDemand(demandA.id);
    return match.requestedAmount === 6
      && match.matchedAmount === 6
      && match.unmatchedAmount === 0
      && match.complete
      && match.selections.length === 2
      && match.selections[0].resourceId === woodA.id
      && match.selections[0].amount === 3
      && match.selections[1].resourceId === woodB.id
      && match.selections[1].amount === 3;
  });

  check('same-input-produces-same-selection', () => {
    const a = matching.matchDemand(demandA.id);
    const b = matching.matchDemand(demandA.id);
    return JSON.stringify(a) === JSON.stringify(b);
  });

  check('batch-matching-uses-stable-demand-order-without-double-assignment', () => {
    const batch = matching.matchOpenDemands();
    const a = batch.matches.find(match => match.demandId === demandA.id);
    const b = batch.matches.find(match => match.demandId === demandB.id);
    return batch.policy === 'DEMAND_ID_ASC_RESOURCE_ID_ASC'
      && a.matchedAmount === 6
      && b.matchedAmount === 2
      && b.unmatchedAmount === 2
      && b.selections.length === 1
      && b.selections[0].resourceId === woodB.id
      && b.selections[0].amount === 2;
  });

  const beforeClaims = claims.ids().length;
  const beforeJobs = domains.jobs.size;
  const beforeUnits = domains.units.size;
  const beforeResources = resources.snapshot();
  const beforeDemands = demands.snapshot();
  const proposal = matching.matchOpenDemands();

  check('matching-is-read-only-and-creates-no-gameplay-side-effects', () => {
    return claims.ids().length === beforeClaims
      && domains.jobs.size === beforeJobs
      && domains.units.size === beforeUnits
      && JSON.stringify(resources.snapshot()) === JSON.stringify(beforeResources)
      && JSON.stringify(demands.snapshot()) === JSON.stringify(beforeDemands)
      && Object.isFrozen(proposal)
      && Object.isFrozen(proposal.matches)
      && Object.isFrozen(proposal.matches[0].selections);
  });

  const reservedClaim = demands.reserve({ demandId: demandA.id, resourceId: woodA.id, amount: 2 });
  check('existing-demand-reservation-reduces-next-match', () => {
    const match = matching.matchDemand(demandA.id);
    return match.requestedAmount === 4
      && match.selections[0].resourceId === woodA.id
      && match.selections[0].amount === 1
      && match.selections[1].resourceId === woodB.id
      && match.selections[1].amount === 3;
  });

  demands.releaseClaim(reservedClaim.id);
  demands.cancel(demandB.id);
  check('cancelled-demand-is-not-batch-matched', () => {
    const batch = matching.matchOpenDemands();
    return !batch.matches.some(match => match.demandId === demandB.id);
  });

  const pass = results.every(result => result.pass);
  return Object.freeze({ pass, results: Object.freeze(results.map(Object.freeze)) });
}
