import { WorldStore } from '../world/world-store.js';
import { MapStructure } from '../world/map-structure.js';
import { CoreDomainStores } from '../domain/core-domain-stores.js';
import { ResourceState } from '../resources/resource-state.js';
import { ResourceClaims } from '../resources/resource-claims.js';
import { ResourceDemands } from '../resources/resource-demands.js';
import { ResourceMatching } from '../resources/resource-matching.js';
import { ResourceAssignment } from '../resources/resource-assignment.js';
import { TransportJobContract } from '../transport/transport-job-contract.js?v=cr04c-2';
import { TransportJobService } from '../transport/transport-job-service.js?v=cr04c-2';

export function runCr04cSelfTest() {
  const results = [];
  const check = (name, fn) => {
    try { results.push({ name, pass: !!fn() }); }
    catch (error) { results.push({ name, pass: false, error: String(error?.message || error) }); }
  };
  const rejects = fn => { try { fn(); return false; } catch { return true; } };

  const setup = () => {
    const world = new WorldStore();
    const map = new MapStructure(world, { width: 3, height: 2 });
    const domains = new CoreDomainStores();
    const resources = new ResourceState({ world, resourceStore: domains.resources });
    const claims = new ResourceClaims({ resourceState: resources });
    const demands = new ResourceDemands({ resourceState: resources, claims });
    const matching = new ResourceMatching({ resourceState: resources, claims, demands });
    const assignment = new ResourceAssignment({ resourceState: resources, claims, demands });
    const jobs = new TransportJobService({ jobStore: domains.jobs, claims, demands, resourceState: resources });
    const type = resources.createDefinition({ technicalName: 'wood.log' });
    const resource = resources.createResource({ definitionId: type.id, amount: 4, location: { kind: 'cell', refId: map.cellIdAt(0, 0) } }, { id: 'resource:00000001' });
    const demand = demands.create({ consumerId: 'building:00000001', definitionId: type.id, amount: 4 }, { id: 'demand:00000001' });
    const assigned = assignment.assignMatch(matching.matchDemand(demand.id));
    const created = jobs.createFromAssignment(assigned);
    return { world, map, domains, resources, claims, demands, matching, assignment, jobs, type, resource, demand, assigned, job: created.jobs[0] };
  };

  check('lifecycle-states-and-transition-table-are-explicit', () => TransportJobContract.states.join(',') === 'PENDING,CANCELLED,RELEASED' && TransportJobContract.canTransition('PENDING', 'CANCELLED') && TransportJobContract.canTransition('PENDING', 'RELEASED') && TransportJobContract.canTransition('CANCELLED', 'RELEASED') && !TransportJobContract.canTransition('CANCELLED', 'PENDING') && !TransportJobContract.canTransition('RELEASED', 'PENDING'));
  check('cancel-is-idempotent-and-keeps-reservation-active', () => { const s=setup(); const a=s.jobs.cancel(s.job.id); const b=s.jobs.cancel(s.job.id); return a.status==='CANCELLED' && b.status==='CANCELLED' && s.claims.get(s.job.claimId).state==='ACTIVE' && s.resources.get(s.job.resourceId).state==='RESERVED' && s.demands.get(s.job.demandId).status==='RESERVED'; });
  check('cancel-then-release-frees-claim-and-resource', () => { const s=setup(); s.jobs.cancel(s.job.id); const j=s.jobs.release(s.job.id); const d=s.demands.get(s.job.demandId); return j.status==='RELEASED' && s.claims.get(s.job.claimId).state==='RELEASED' && s.resources.get(s.job.resourceId).state==='AVAILABLE' && d.status==='OPEN' && d.remainingAmount===d.targetAmount; });
  check('direct-release-from-pending-is-controlled-and-idempotent', () => { const s=setup(); const a=s.jobs.release(s.job.id); const b=s.jobs.release(s.job.id); return a.status==='RELEASED' && b.status==='RELEASED' && s.claims.get(s.job.claimId).state==='RELEASED' && s.domains.jobs.size===1; });
  check('released-job-cannot-return-to-cancelled-or-pending', () => { const s=setup(); s.jobs.release(s.job.id); return rejects(()=>s.jobs.cancel(s.job.id)) && rejects(()=>TransportJobContract.assertTransition('RELEASED','PENDING')); });
  check('cancel-does-not-silently-release-claim', () => { const s=setup(); const before=JSON.stringify(s.claims.snapshot()); s.jobs.cancel(s.job.id); return JSON.stringify(s.claims.snapshot())===before; });
  check('lifecycle-does-not-create-carrier-route-path-or-movement-data', () => { const s=setup(); s.jobs.cancel(s.job.id); const j=s.jobs.release(s.job.id); return s.domains.units.size===0 && !('carrierId' in j) && !('route' in j) && !('path' in j) && !('position' in j) && !('progress' in j); });
  const pass = results.every(result => result.pass);
  return Object.freeze({ pass, results: Object.freeze(results.map(Object.freeze)) });
}
