import { WorldStore } from '../world/world-store.js';
import { MapStructure } from '../world/map-structure.js';
import { CoreDomainStores } from '../domain/core-domain-stores.js';
import { ResourceState } from '../resources/resource-state.js';
import { ResourceClaims } from '../resources/resource-claims.js';
import { ResourceDemands } from '../resources/resource-demands.js';
import { ResourceMatching } from '../resources/resource-matching.js';
import { ResourceAssignment } from '../resources/resource-assignment.js';

function makeFixture() {
  const world = new WorldStore();
  const map = new MapStructure(world, { width: 3, height: 2 });
  const domains = new CoreDomainStores();
  const resources = new ResourceState({ world, resourceStore: domains.resources });
  const claims = new ResourceClaims({ resourceState: resources });
  const demands = new ResourceDemands({ resourceState: resources, claims });
  const matching = new ResourceMatching({ resourceState: resources, claims, demands });
  const assignment = new ResourceAssignment({ resourceState: resources, claims, demands });

  const wood = resources.createDefinition({ technicalName: 'wood.log', label: 'Holz' });
  const stone = resources.createDefinition({ technicalName: 'stone.raw', label: 'Stein' });
  const woodA = resources.createResource({ definitionId: wood.id, amount: 4, location: { kind: 'cell', refId: map.cellIdAt(0, 0) } }, { id: 'resource:00000001' });
  const woodB = resources.createResource({ definitionId: wood.id, amount: 5, location: { kind: 'cell', refId: map.cellIdAt(1, 0) } }, { id: 'resource:00000002' });
  resources.createResource({ definitionId: stone.id, amount: 9, location: { kind: 'cell', refId: map.cellIdAt(2, 0) } }, { id: 'resource:00000003' });
  claims.reserve({ resourceId: woodA.id, amount: 1, consumerId: 'building:00000009' });
  const demandA = demands.create({ consumerId: 'building:00000001', definitionId: wood.id, amount: 6 }, { id: 'demand:00000001' });
  const demandB = demands.create({ consumerId: 'building:00000002', definitionId: wood.id, amount: 4 }, { id: 'demand:00000002' });

  return { domains, resources, claims, demands, matching, assignment, woodA, woodB, demandA, demandB };
}

export function runCr03bSelfTest() {
  const results = [];
  const check = (name, fn) => {
    try { results.push({ name, pass: !!fn() }); }
    catch (error) { results.push({ name, pass: false, error: String(error?.message || error) }); }
  };

  const fixture = makeFixture();
  const { domains, claims, demands, matching, assignment, woodA, woodB, demandA, demandB } = fixture;
  const beforeJobs = domains.jobs.size;
  const beforeUnits = domains.units.size;
  const batch = matching.matchOpenDemands();
  const result = assignment.assignBatch(batch);

  check('confirmed-match-creates-demand-linked-active-claims', () => {
    const a = demands.get(demandA.id);
    const b = demands.get(demandB.id);
    const demandAClaims = demands.claimsFor(demandA.id).filter(claim => claim.state === 'ACTIVE');
    const demandBClaims = demands.claimsFor(demandB.id).filter(claim => claim.state === 'ACTIVE');
    return result.assignmentCount === 2
      && result.claimCount === 3
      && demandAClaims.reduce((sum, claim) => sum + claim.amount, 0) === 6
      && demandBClaims.reduce((sum, claim) => sum + claim.amount, 0) === 2
      && a.status === 'RESERVED'
      && a.remainingAmount === 0
      && b.status === 'PARTIAL'
      && b.remainingAmount === 2;
  });

  check('assignment-preserves-resource-quantity-invariants', () => {
    return claims.availableAmount(woodA.id) === 0
      && claims.reservedAmount(woodA.id) === 4
      && claims.consumedAmount(woodA.id) === 0
      && claims.availableAmount(woodB.id) === 0
      && claims.reservedAmount(woodB.id) === 5
      && claims.consumedAmount(woodB.id) === 0;
  });

  check('assignment-creates-no-jobs-units-or-movement-side-effects', () => {
    return domains.jobs.size === beforeJobs && domains.units.size === beforeUnits;
  });

  check('reusing-stale-proposal-is-rejected-without-new-claims', () => {
    const before = claims.ids().length;
    let rejected = false;
    try { assignment.assignBatch(batch); }
    catch { rejected = true; }
    return rejected && claims.ids().length === before;
  });

  check('invalid-batch-is-preflight-rejected-atomically', () => {
    const isolated = makeFixture();
    const proposal = isolated.matching.matchOpenDemands();
    const broken = structuredClone(proposal);
    broken.matches[1].selections[0].amount = 999;
    const beforeClaims = isolated.claims.ids().length;
    const beforeDemands = JSON.stringify(isolated.demands.snapshot());
    let rejected = false;
    try { isolated.assignment.assignBatch(broken); }
    catch { rejected = true; }
    return rejected
      && isolated.claims.ids().length === beforeClaims
      && JSON.stringify(isolated.demands.snapshot()) === beforeDemands;
  });

  check('wrong-resource-type-proposal-is-rejected-before-write', () => {
    const isolated = makeFixture();
    const match = structuredClone(isolated.matching.matchDemand(isolated.demandA.id));
    match.selections[0].resourceId = 'resource:00000003';
    const before = isolated.claims.ids().length;
    let rejected = false;
    try { isolated.assignment.assignMatch(match); }
    catch { rejected = true; }
    return rejected && isolated.claims.ids().length === before;
  });

  const pass = results.every(result => result.pass);
  return Object.freeze({ pass, results: Object.freeze(results.map(Object.freeze)) });
}
