import { runCr03FreezeGate } from './cr-03-freeze-gate.js';
import { runCr04aSelfTest } from './cr-04a-self-test.js';
import { runCr04bSelfTest } from './cr-04b-self-test.js';
import { runCr04cSelfTest } from './cr-04c-self-test.js';
import { WorldStore } from '../world/world-store.js';
import { MapStructure } from '../world/map-structure.js';
import { CoreDomainStores } from '../domain/core-domain-stores.js';
import { ResourceState } from '../resources/resource-state.js';
import { ResourceClaims } from '../resources/resource-claims.js';
import { ResourceDemands } from '../resources/resource-demands.js';
import { ResourceMatching } from '../resources/resource-matching.js';
import { ResourceAssignment } from '../resources/resource-assignment.js';
import { TransportJobService } from '../transport/transport-job-service.js?v=cr04-freeze-1';

function deepFreeze(value) {
  if (value == null || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

export function runCr04FreezeGate() {
  const results = [];
  const check = (name, fn) => {
    try { results.push({ name, pass: !!fn() }); }
    catch (error) { results.push({ name, pass: false, error: String(error?.message || error) }); }
  };

  const cr03 = runCr03FreezeGate();
  const cr04a = runCr04aSelfTest();
  const cr04b = runCr04bSelfTest();
  const cr04c = runCr04cSelfTest();

  check('cr03-frozen-regression-pass', () => cr03.pass && cr03.blockerCount === 0);
  check('cr04a-contract-regression-pass', () => cr04a.pass);
  check('cr04b-creation-regression-pass', () => cr04b.pass);
  check('cr04c-lifecycle-regression-pass', () => cr04c.pass);

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
    const type = resources.createDefinition({ technicalName: 'wood.log' });
    resources.createResource({ definitionId: type.id, amount: 3, location: { kind:'cell', refId: map.cellIdAt(0,0) } }, { id:'resource:00000001' });
    resources.createResource({ definitionId: type.id, amount: 5, location: { kind:'cell', refId: map.cellIdAt(1,0) } }, { id:'resource:00000002' });
    const demand = demands.create({ consumerId:'building:00000001', definitionId:type.id, amount:6 }, { id:'demand:00000001' });
    const assigned = assignment.assignMatch(matching.matchDemand(demand.id));
    const created = jobs.createFromAssignment(assigned);
    return { world,map,domains,resources,claims,demands,matching,assignment,jobs,type,demand,assigned,created };
  };

  check('assignment-claim-job-amount-invariant', () => {
    const s = setup();
    const claimAmount = s.assigned.claimIds.reduce((sum,id)=>sum+s.claims.get(id).amount,0);
    const jobAmount = s.created.jobs.reduce((sum,job)=>sum+job.amount,0);
    const demand = s.demands.get(s.demand.id);
    return claimAmount === jobAmount
      && jobAmount === demand.reservedAmount
      && demand.remainingAmount === demand.targetAmount - demand.reservedAmount - demand.fulfilledAmount;
  });

  check('exactly-one-pending-job-per-active-claim', () => {
    const s = setup();
    const activeClaims = s.assigned.claimIds.map(id=>s.claims.get(id)).filter(c=>c.state==='ACTIVE');
    const jobs = s.domains.jobs.ids().map(id=>s.domains.jobs.get(id));
    return jobs.length === activeClaims.length
      && activeClaims.every(claim => jobs.filter(job=>job.claimId===claim.id && job.status==='PENDING').length===1);
  });

  check('creation-is-idempotent-without-duplicate-jobs', () => {
    const s = setup();
    const again = s.jobs.createFromAssignment(s.assigned);
    return again.createdCount === 0
      && again.jobCount === s.created.jobCount
      && s.domains.jobs.size === s.created.jobCount;
  });

  check('cancel-keeps-claim-and-resource-reserved', () => {
    const s = setup();
    const job = s.created.jobs[0];
    const beforeAmount = s.claims.get(job.claimId).amount;
    const cancelled = s.jobs.cancel(job.id);
    return cancelled.status === 'CANCELLED'
      && s.claims.get(job.claimId).state === 'ACTIVE'
      && s.claims.get(job.claimId).amount === beforeAmount
      && s.resources.get(job.resourceId).state === 'RESERVED';
  });

  check('release-frees-claim-and-restores-demand-availability', () => {
    const s = setup();
    const job = s.created.jobs[0];
    const before = s.demands.get(job.demandId);
    s.jobs.cancel(job.id);
    const released = s.jobs.release(job.id);
    const after = s.demands.get(job.demandId);
    return released.status === 'RELEASED'
      && s.claims.get(job.claimId).state === 'RELEASED'
      && s.resources.get(job.resourceId).state === 'AVAILABLE'
      && after.reservedAmount === before.reservedAmount - job.amount
      && after.remainingAmount === before.remainingAmount + job.amount;
  });

  check('release-is-idempotent-and-does-not-double-free', () => {
    const s = setup();
    const job = s.created.jobs[0];
    s.jobs.release(job.id);
    const once = JSON.stringify({ claim:s.claims.get(job.claimId), demand:s.demands.get(job.demandId), resource:s.resources.get(job.resourceId), job:s.domains.jobs.get(job.id) });
    s.jobs.release(job.id);
    const twice = JSON.stringify({ claim:s.claims.get(job.claimId), demand:s.demands.get(job.demandId), resource:s.resources.get(job.resourceId), job:s.domains.jobs.get(job.id) });
    return once === twice;
  });

  check('scope-gate-zero-carrier-routing-movement', () => {
    const s = setup();
    const forbidden = ['carrierId','carrier','route','path','position','progress','movement','waypoints'];
    const jobs = s.domains.jobs.ids().map(id=>s.domains.jobs.get(id));
    return s.domains.units.size === 0 && jobs.every(job=>forbidden.every(key=>!(key in job)));
  });

  const blockerCount = results.filter(result=>!result.pass).length;
  return deepFreeze({
    pass: blockerCount === 0,
    blockerCount,
    status: blockerCount === 0 ? 'FROZEN' : 'BLOCKED',
    scope: 'CR-04_TRANSPORT_JOB_FOUNDATION',
    regressions: { cr03:cr03.pass, cr04a:cr04a.pass, cr04b:cr04b.pass, cr04c:cr04c.pass },
    results
  });
}
