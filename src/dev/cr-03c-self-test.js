import { WorldStore } from '../world/world-store.js';
import { MapStructure } from '../world/map-structure.js';
import { CoreDomainStores } from '../domain/core-domain-stores.js';
import { ResourceState } from '../resources/resource-state.js';
import { ResourceClaims } from '../resources/resource-claims.js';
import { ResourceDemands } from '../resources/resource-demands.js';
import { ResourceMatching } from '../resources/resource-matching.js';
import { ResourceAssignment } from '../resources/resource-assignment.js';

export function runCr03cSelfTest() {
  const results = [];
  const check = (name, fn) => {
    try { results.push({ name, pass: !!fn() }); }
    catch (error) { results.push({ name, pass: false, error: String(error?.message || error) }); }
  };

  const world = new WorldStore();
  const map = new MapStructure(world, { width: 4, height: 2 });
  const domains = new CoreDomainStores();
  const resources = new ResourceState({ world, resourceStore: domains.resources });
  const claims = new ResourceClaims({ resourceState: resources });
  const demands = new ResourceDemands({ resourceState: resources, claims });
  const matching = new ResourceMatching({ resourceState: resources, claims, demands });
  const assignment = new ResourceAssignment({ resourceState: resources, claims, demands });

  const wood = resources.createDefinition({ technicalName: 'wood.log', label: 'Holz' });
  const woodA = resources.createResource({ definitionId: wood.id, amount: 4, location: { kind: 'cell', refId: map.cellIdAt(0, 0) } }, { id: 'resource:00000001' });
  const woodB = resources.createResource({ definitionId: wood.id, amount: 4, location: { kind: 'cell', refId: map.cellIdAt(1, 0) } }, { id: 'resource:00000002' });
  const woodC = resources.createResource({ definitionId: wood.id, amount: 4, location: { kind: 'cell', refId: map.cellIdAt(2, 0) } }, { id: 'resource:00000003' });

  const demandA = demands.create({ consumerId: 'building:00000001', definitionId: wood.id, amount: 6 }, { id: 'demand:00000001' });
  const demandB = demands.create({ consumerId: 'building:00000002', definitionId: wood.id, amount: 3 }, { id: 'demand:00000002' });

  const firstAssignment = assignment.assignMatch(matching.matchDemand(demandA.id));
  const firstClaimIds = firstAssignment.claimIds.slice();

  check('initial-assignment-reserves-exact-demand-amount', () => {
    const progress = demands.progress(demandA.id);
    return firstAssignment.assignedAmount === 6
      && progress.reservedAmount === 6
      && progress.remainingAmount === 0
      && progress.status === 'RESERVED';
  });

  const releasedClaimId = firstClaimIds[0];
  const releasedClaim = claims.get(releasedClaimId);
  demands.releaseClaim(releasedClaimId);

  check('release-restores-resource-and-demand-remaining', () => {
    const progress = demands.progress(demandA.id);
    return claims.get(releasedClaimId).state === 'RELEASED'
      && claims.availableAmount(releasedClaim.resourceId) === releasedClaim.amount
      && progress.reservedAmount === 6 - releasedClaim.amount
      && progress.remainingAmount === releasedClaim.amount
      && progress.status === 'PARTIAL';
  });

  const rematchAfterRelease = matching.matchDemand(demandA.id);
  const reassignment = assignment.assignMatch(rematchAfterRelease);

  check('released-amount-can-be-rematched-and-reassigned-once', () => {
    const progress = demands.progress(demandA.id);
    const activeForDemand = demands.claimsFor(demandA.id).filter(claim => claim.state === 'ACTIVE');
    const activeTotal = activeForDemand.reduce((sum, claim) => sum + claim.amount, 0);
    return reassignment.assignedAmount === releasedClaim.amount
      && progress.reservedAmount === 6
      && progress.remainingAmount === 0
      && progress.status === 'RESERVED'
      && activeTotal === 6
      && activeForDemand.filter(claim => claim.id === releasedClaimId).length === 0;
  });

  check('reassign-without-new-remaining-demand-is-rejected', () => {
    let rejected = false;
    try { assignment.assignMatch(rematchAfterRelease); }
    catch { rejected = true; }
    return rejected && demands.progress(demandA.id).reservedAmount === 6;
  });

  const demandAActiveBefore = demands.claimsFor(demandA.id).filter(claim => claim.state === 'ACTIVE');
  const claimOnWoodB = demandAActiveBefore.find(claim => claim.resourceId === woodB.id);
  if (claimOnWoodB) demands.releaseClaim(claimOnWoodB.id);

  const competitorMatch = matching.matchDemand(demandB.id);
  const competitorAssignment = assignment.assignMatch(competitorMatch);
  const freshMatchA = matching.matchDemand(demandA.id);
  const freshAssignmentA = assignment.assignMatch(freshMatchA);

  check('changed-availability-causes-fresh-deterministic-reassignment', () => {
    const progressA = demands.progress(demandA.id);
    const progressB = demands.progress(demandB.id);
    const activeA = demands.claimsFor(demandA.id).filter(claim => claim.state === 'ACTIVE');
    const activeB = demands.claimsFor(demandB.id).filter(claim => claim.state === 'ACTIVE');
    const totalA = activeA.reduce((sum, claim) => sum + claim.amount, 0);
    const totalB = activeB.reduce((sum, claim) => sum + claim.amount, 0);
    return competitorAssignment.assignedAmount === 3
      && freshAssignmentA.assignedAmount === claimOnWoodB.amount
      && progressA.reservedAmount === 6
      && progressA.remainingAmount === 0
      && progressB.reservedAmount === 3
      && totalA === 6
      && totalB === 3;
  });

  check('resource-quantity-invariant-holds-after-release-and-reassignment', () => {
    return [woodA.id, woodB.id, woodC.id].every(resourceId => {
      const resource = resources.get(resourceId);
      const available = claims.availableAmount(resourceId);
      const reserved = claims.reservedAmount(resourceId);
      const consumed = claims.consumedAmount(resourceId);
      return available + reserved + consumed === resource.amount;
    });
  });

  check('no-jobs-or-units-created-by-consistency-cycle', () => {
    return domains.jobs.size === 0 && domains.units.size === 0;
  });

  const pass = results.every(result => result.pass);
  return Object.freeze({ pass, results: Object.freeze(results.map(Object.freeze)) });
}
