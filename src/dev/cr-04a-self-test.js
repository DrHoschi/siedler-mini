import { WorldStore } from '../world/world-store.js';
import { MapStructure } from '../world/map-structure.js';
import { CoreDomainStores } from '../domain/core-domain-stores.js';
import { ResourceState } from '../resources/resource-state.js';
import { ResourceClaims } from '../resources/resource-claims.js';
import { ResourceDemands } from '../resources/resource-demands.js';
import { ResourceMatching } from '../resources/resource-matching.js';
import { ResourceAssignment } from '../resources/resource-assignment.js';
import { TransportJobContract } from '../transport/transport-job-contract.js';

export function runCr04aSelfTest() {
  const results = [];
  const check = (name, fn) => {
    try { results.push({ name, pass: !!fn() }); }
    catch (error) { results.push({ name, pass: false, error: String(error?.message || error) }); }
  };

  const rejects = fn => {
    try { fn(); return false; }
    catch { return true; }
  };

  const world = new WorldStore();
  const map = new MapStructure(world, { width: 3, height: 2 });
  const domains = new CoreDomainStores();
  const resources = new ResourceState({ world, resourceStore: domains.resources });
  const claims = new ResourceClaims({ resourceState: resources });
  const demands = new ResourceDemands({ resourceState: resources, claims });
  const matching = new ResourceMatching({ resourceState: resources, claims, demands });
  const assignment = new ResourceAssignment({ resourceState: resources, claims, demands });

  const wood = resources.createDefinition({ technicalName: 'wood.log', label: 'Holz' });
  const sourceCell = map.cellIdAt(0, 0);
  const woodResource = resources.createResource({
    definitionId: wood.id,
    amount: 6,
    location: { kind: 'cell', refId: sourceCell }
  }, { id: 'resource:00000001' });
  const demand = demands.create({
    consumerId: 'building:00000001',
    definitionId: wood.id,
    amount: 6
  }, { id: 'demand:00000001' });

  const assigned = assignment.assignMatch(matching.matchDemand(demand.id));
  const claim = claims.get(assigned.claimIds[0]);
  const demandAfterAssignment = demands.get(demand.id);
  const resourceAfterAssignment = resources.get(woodResource.id);
  const input = {
    id: 'transport-job:00000001',
    claimId: claim.id,
    demandId: demand.id,
    resourceId: woodResource.id,
    definitionId: wood.id,
    sourceLocation: resourceAfterAssignment.location,
    targetId: demand.consumerId,
    amount: claim.amount,
    status: 'PENDING'
  };

  const before = {
    resources: structuredClone(resources.snapshot()),
    claims: structuredClone(claims.snapshot()),
    demands: structuredClone(demands.snapshot()),
    jobs: domains.jobs.size,
    units: domains.units.size
  };

  const job = TransportJobContract.validateLinks(input, {
    claim,
    demand: demandAfterAssignment,
    resource: resourceAfterAssignment
  });

  check('valid-contract-preserves-reservation-links', () => {
    return job.kind === 'transport-job'
      && job.claimId === claim.id
      && job.demandId === demand.id
      && job.resourceId === woodResource.id
      && job.definitionId === wood.id
      && job.amount === claim.amount
      && job.targetId === demand.consumerId
      && job.sourceLocation.kind === 'cell'
      && job.sourceLocation.refId === sourceCell
      && job.status === 'PENDING';
  });

  check('contract-is-deeply-frozen', () => {
    return Object.isFrozen(job) && Object.isFrozen(job.sourceLocation);
  });

  check('zero-or-negative-amount-is-rejected', () => {
    return rejects(() => TransportJobContract.define({ ...input, amount: 0 }))
      && rejects(() => TransportJobContract.define({ ...input, amount: -1 }));
  });

  check('unknown-status-is-rejected', () => {
    return rejects(() => TransportJobContract.define({ ...input, status: 'IN_TRANSIT' }));
  });

  check('claim-demand-mismatch-is-rejected', () => {
    return rejects(() => TransportJobContract.validateLinks(
      { ...input, demandId: 'demand:00000002' },
      { claim, demand: demandAfterAssignment, resource: resourceAfterAssignment }
    ));
  });

  check('claim-resource-mismatch-is-rejected', () => {
    return rejects(() => TransportJobContract.validateLinks(
      { ...input, resourceId: 'resource:00000002' },
      { claim, demand: demandAfterAssignment, resource: resourceAfterAssignment }
    ));
  });

  check('claim-amount-mismatch-is-rejected', () => {
    return rejects(() => TransportJobContract.validateLinks(
      { ...input, amount: claim.amount - 1 },
      { claim, demand: demandAfterAssignment, resource: resourceAfterAssignment }
    ));
  });

  check('source-location-mismatch-is-rejected', () => {
    return rejects(() => TransportJobContract.validateLinks(
      { ...input, sourceLocation: { kind: 'cell', refId: map.cellIdAt(1, 0) } },
      { claim, demand: demandAfterAssignment, resource: resourceAfterAssignment }
    ));
  });

  check('target-must-match-demand-consumer', () => {
    return rejects(() => TransportJobContract.validateLinks(
      { ...input, targetId: 'building:00000002' },
      { claim, demand: demandAfterAssignment, resource: resourceAfterAssignment }
    ));
  });

  check('released-claim-is-not-transportable', () => {
    const releasedWorld = new WorldStore();
    const releasedMap = new MapStructure(releasedWorld, { width: 2, height: 1 });
    const releasedDomains = new CoreDomainStores();
    const releasedResources = new ResourceState({ world: releasedWorld, resourceStore: releasedDomains.resources });
    const releasedClaims = new ResourceClaims({ resourceState: releasedResources });
    const releasedDemands = new ResourceDemands({ resourceState: releasedResources, claims: releasedClaims });
    const releasedMatching = new ResourceMatching({ resourceState: releasedResources, claims: releasedClaims, demands: releasedDemands });
    const releasedAssignment = new ResourceAssignment({ resourceState: releasedResources, claims: releasedClaims, demands: releasedDemands });
    const type = releasedResources.createDefinition({ technicalName: 'wood.log' }, { id: wood.id });
    const resource = releasedResources.createResource({ definitionId: type.id, amount: 2, location: { kind: 'cell', refId: releasedMap.cellIdAt(0, 0) } }, { id: 'resource:00000001' });
    const requested = releasedDemands.create({ consumerId: 'building:00000001', definitionId: type.id, amount: 2 }, { id: 'demand:00000001' });
    const result = releasedAssignment.assignMatch(releasedMatching.matchDemand(requested.id));
    const releasedClaimId = result.claimIds[0];
    releasedDemands.releaseClaim(releasedClaimId);
    const releasedClaim = releasedClaims.get(releasedClaimId);
    return rejects(() => TransportJobContract.validateLinks({
      id: 'transport-job:00000002',
      claimId: releasedClaim.id,
      demandId: requested.id,
      resourceId: resource.id,
      definitionId: type.id,
      sourceLocation: resource.location,
      targetId: requested.consumerId,
      amount: releasedClaim.amount,
      status: 'PENDING'
    }, {
      claim: releasedClaim,
      demand: releasedDemands.get(requested.id),
      resource: releasedResources.get(resource.id)
    }));
  });

  check('contract-validation-has-no-runtime-side-effects', () => {
    return JSON.stringify(resources.snapshot()) === JSON.stringify(before.resources)
      && JSON.stringify(claims.snapshot()) === JSON.stringify(before.claims)
      && JSON.stringify(demands.snapshot()) === JSON.stringify(before.demands)
      && domains.jobs.size === before.jobs
      && domains.units.size === before.units
      && domains.jobs.size === 0
      && domains.units.size === 0;
  });

  check('contract-has-no-carrier-route-path-or-movement-fields', () => {
    return !('carrierId' in job)
      && !('route' in job)
      && !('path' in job)
      && !('position' in job)
      && !('progress' in job);
  });

  const pass = results.every(result => result.pass);
  return Object.freeze({ pass, results: Object.freeze(results.map(Object.freeze)) });
}
