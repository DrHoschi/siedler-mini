import { WorldStore } from '../world/world-store.js';
import { MapStructure } from '../world/map-structure.js';
import { CoreDomainStores } from '../domain/core-domain-stores.js';
import { ResourceState } from '../resources/resource-state.js';
import { ResourceClaims } from '../resources/resource-claims.js';
import { ResourceDemands } from '../resources/resource-demands.js';
import { ResourceMatching } from '../resources/resource-matching.js';
import { ResourceAssignment } from '../resources/resource-assignment.js';
import { TransportJobService } from '../transport/transport-job-service.js';

export function runCr04bSelfTest() {
  const results = [];
  const check = (name, fn) => {
    try { results.push({ name, pass: !!fn() }); }
    catch (error) { results.push({ name, pass: false, error: String(error?.message || error) }); }
  };
  const rejects = fn => { try { fn(); return false; } catch { return true; } };

  const setup = () => {
    const world = new WorldStore();
    const map = new MapStructure(world, { width: 4, height: 2 });
    const domains = new CoreDomainStores();
    const resources = new ResourceState({ world, resourceStore: domains.resources });
    const claims = new ResourceClaims({ resourceState: resources });
    const demands = new ResourceDemands({ resourceState: resources, claims });
    const matching = new ResourceMatching({ resourceState: resources, claims, demands });
    const assignment = new ResourceAssignment({ resourceState: resources, claims, demands });
    const jobs = new TransportJobService({ jobStore: domains.jobs, claims, demands, resourceState: resources });
    return { world, map, domains, resources, claims, demands, matching, assignment, jobs };
  };

  const s = setup();
  const wood = s.resources.createDefinition({ technicalName: 'wood.log', label: 'Holz' });
  const r1 = s.resources.createResource({ definitionId: wood.id, amount: 3, location: { kind: 'cell', refId: s.map.cellIdAt(0, 0) } }, { id: 'resource:00000001' });
  const r2 = s.resources.createResource({ definitionId: wood.id, amount: 3, location: { kind: 'cell', refId: s.map.cellIdAt(1, 0) } }, { id: 'resource:00000002' });
  const demand = s.demands.create({ consumerId: 'building:00000001', definitionId: wood.id, amount: 6 }, { id: 'demand:00000001' });
  const assigned = s.assignment.assignMatch(s.matching.matchDemand(demand.id));
  const beforeResources = JSON.stringify(s.resources.snapshot());
  const beforeClaims = JSON.stringify(s.claims.snapshot());
  const beforeDemands = JSON.stringify(s.demands.snapshot());
  const created = s.jobs.createFromAssignment(assigned);

  check('one-persisted-job-per-active-claim', () => created.jobCount === assigned.claimIds.length && created.createdCount === assigned.claimIds.length && s.domains.jobs.size === assigned.claimIds.length);
  check('jobs-use-stable-transport-job-ids', () => created.jobs.every(job => /^transport-job:\d+$/.test(job.id) && job.kind === 'transport-job'));
  check('persisted-links-match-claims', () => created.jobs.every(job => {
    const claim = s.claims.get(job.claimId);
    return claim && job.demandId === claim.demandId && job.resourceId === claim.resourceId && job.targetId === claim.consumerId && job.amount === claim.amount && job.status === 'PENDING';
  }));
  check('creation-is-idempotent-per-claim', () => {
    const again = s.jobs.createFromAssignment(assigned);
    return again.createdCount === 0 && again.jobCount === created.jobCount && s.domains.jobs.size === created.jobCount && again.jobs.map(x => x.id).join('|') === created.jobs.map(x => x.id).join('|');
  });
  check('creation-does-not-mutate-resource-claim-demand-state', () => JSON.stringify(s.resources.snapshot()) === beforeResources && JSON.stringify(s.claims.snapshot()) === beforeClaims && JSON.stringify(s.demands.snapshot()) === beforeDemands);
  check('creation-does-not-create-units', () => s.domains.units.size === 0);
  check('jobs-have-no-carrier-route-path-or-movement-fields', () => created.jobs.every(job => !('carrierId' in job) && !('route' in job) && !('path' in job) && !('position' in job) && !('progress' in job)));
  check('multiple-resource-assignment-created-multiple-jobs', () => created.jobs.length === 2 && new Set(created.jobs.map(x => x.resourceId)).size === 2 && [r1.id, r2.id].every(id => created.jobs.some(job => job.resourceId === id)));

  check('released-claim-cannot-create-job', () => {
    const x = setup();
    const type = x.resources.createDefinition({ technicalName: 'stone' });
    x.resources.createResource({ definitionId: type.id, amount: 2, location: { kind: 'cell', refId: x.map.cellIdAt(0, 0) } }, { id: 'resource:00000001' });
    const d = x.demands.create({ consumerId: 'building:00000001', definitionId: type.id, amount: 2 }, { id: 'demand:00000001' });
    const a = x.assignment.assignMatch(x.matching.matchDemand(d.id));
    x.demands.releaseClaim(a.claimIds[0]);
    return rejects(() => x.jobs.createFromAssignment(a)) && x.domains.jobs.size === 0;
  });

  check('batch-preflight-prevents-partial-persistence', () => {
    const x = setup();
    const type = x.resources.createDefinition({ technicalName: 'stone' });
    x.resources.createResource({ definitionId: type.id, amount: 2, location: { kind: 'cell', refId: x.map.cellIdAt(0, 0) } }, { id: 'resource:00000001' });
    const d = x.demands.create({ consumerId: 'building:00000001', definitionId: type.id, amount: 2 }, { id: 'demand:00000001' });
    const a = x.assignment.assignMatch(x.matching.matchDemand(d.id));
    return rejects(() => x.jobs.createFromClaimIds([a.claimIds[0], 'claim:99999999'])) && x.domains.jobs.size === 0;
  });

  const pass = results.every(result => result.pass);
  return Object.freeze({ pass, results: Object.freeze(results.map(Object.freeze)) });
}
