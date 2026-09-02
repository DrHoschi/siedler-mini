import { WorldStore } from '../world/world-store.js';
import { MapStructure } from '../world/map-structure.js';
import { CoreDomainStores } from '../domain/core-domain-stores.js';
import { ResourceState } from '../resources/resource-state.js';
import { ResourceClaims } from '../resources/resource-claims.js';
import { ResourceDemands } from '../resources/resource-demands.js';
import { ResourceMatching } from '../resources/resource-matching.js';
import { ResourceAssignment } from '../resources/resource-assignment.js';

export function runCr03FreezeGate() {
  const results = [];
  const check = (name, fn) => {
    try { results.push({ name, pass: !!fn() }); }
    catch (error) { results.push({ name, pass: false, error: String(error?.message || error) }); }
  };

  const world = new WorldStore();
  const map = new MapStructure(world, { width: 5, height: 2 });
  const domains = new CoreDomainStores();
  const resources = new ResourceState({ world, resourceStore: domains.resources });
  const claims = new ResourceClaims({ resourceState: resources });
  const demands = new ResourceDemands({ resourceState: resources, claims });
  const matching = new ResourceMatching({ resourceState: resources, claims, demands });
  const assignment = new ResourceAssignment({ resourceState: resources, claims, demands });

  const wood = resources.createDefinition({ technicalName: 'wood.log', label: 'Holz' });
  const stone = resources.createDefinition({ technicalName: 'stone.raw', label: 'Stein' });

  const woodA = resources.createResource({ definitionId: wood.id, amount: 4, location: { kind: 'cell', refId: map.cellIdAt(0, 0) } }, { id: 'resource:00000001' });
  const woodB = resources.createResource({ definitionId: wood.id, amount: 4, location: { kind: 'cell', refId: map.cellIdAt(1, 0) } }, { id: 'resource:00000002' });
  const woodC = resources.createResource({ definitionId: wood.id, amount: 4, location: { kind: 'cell', refId: map.cellIdAt(2, 0) } }, { id: 'resource:00000003' });
  const stoneA = resources.createResource({ definitionId: stone.id, amount: 5, location: { kind: 'cell', refId: map.cellIdAt(3, 0) } }, { id: 'resource:00000004' });

  const demandA = demands.create({ consumerId: 'building:00000001', definitionId: wood.id, amount: 6 }, { id: 'demand:00000001' });
  const demandB = demands.create({ consumerId: 'building:00000002', definitionId: wood.id, amount: 4 }, { id: 'demand:00000002' });

  const deterministicA = matching.matchOpenDemands();
  const deterministicB = matching.matchOpenDemands();

  check('deterministic-matching-is-stable-and-type-safe', () => {
    const a = deterministicA.matches.find(match => match.demandId === demandA.id);
    const b = deterministicA.matches.find(match => match.demandId === demandB.id);
    return JSON.stringify(deterministicA) === JSON.stringify(deterministicB)
      && deterministicA.policy === 'DEMAND_ID_ASC_RESOURCE_ID_ASC'
      && a.selections.every(selection => resources.get(selection.resourceId).definitionId === wood.id)
      && b.selections.every(selection => resources.get(selection.resourceId).definitionId === wood.id)
      && !a.selections.some(selection => selection.resourceId === stoneA.id)
      && !b.selections.some(selection => selection.resourceId === stoneA.id);
  });

  const initialAssignment = assignment.assignBatch(deterministicA);

  check('matching-to-assignment-reserves-exact-demand-amounts', () => {
    const progressA = demands.progress(demandA.id);
    const progressB = demands.progress(demandB.id);
    return initialAssignment.assignmentCount === 2
      && initialAssignment.claimCount === 4
      && progressA.reservedAmount === 6
      && progressA.remainingAmount === 0
      && progressA.status === 'RESERVED'
      && progressB.reservedAmount === 4
      && progressB.remainingAmount === 0
      && progressB.status === 'RESERVED';
  });

  check('no-resource-or-demand-is-overreserved', () => {
    const resourcesOk = [woodA.id, woodB.id, woodC.id, stoneA.id].every(resourceId => {
      const resource = resources.get(resourceId);
      return claims.reservedAmount(resourceId) + claims.consumedAmount(resourceId) <= resource.amount;
    });
    const demandsOk = [demandA.id, demandB.id].every(demandId => {
      const demand = demands.get(demandId);
      return demand.reservedAmount + demand.fulfilledAmount <= demand.targetAmount;
    });
    return resourcesOk && demandsOk;
  });

  const releaseCandidate = demands.claimsFor(demandA.id)
    .filter(claim => claim.state === 'ACTIVE')
    .sort((a, b) => a.id.localeCompare(b.id))[0];
  demands.releaseClaim(releaseCandidate.id);

  check('release-reopens-exact-demand-remaining', () => {
    const progress = demands.progress(demandA.id);
    return claims.get(releaseCandidate.id).state === 'RELEASED'
      && progress.reservedAmount === demandA.targetAmount - releaseCandidate.amount
      && progress.remainingAmount === releaseCandidate.amount
      && progress.status === 'PARTIAL';
  });

  const rematchA = matching.matchDemand(demandA.id);
  const reassignmentA = assignment.assignMatch(rematchA);

  check('release-rematch-reassignment-restores-demand-without-duplicate-active-amount', () => {
    const progress = demands.progress(demandA.id);
    const active = demands.claimsFor(demandA.id).filter(claim => claim.state === 'ACTIVE');
    const activeAmount = active.reduce((sum, claim) => sum + claim.amount, 0);
    return reassignmentA.assignedAmount === releaseCandidate.amount
      && progress.reservedAmount === demandA.targetAmount
      && progress.remainingAmount === 0
      && activeAmount === demandA.targetAmount
      && active.every(claim => claim.id !== releaseCandidate.id);
  });

  const demandC = demands.create({ consumerId: 'building:00000003', definitionId: wood.id, amount: 2 }, { id: 'demand:00000003' });
  const staleProposal = matching.matchDemand(demandC.id);
  const staleSelection = staleProposal.selections[0];
  const competingClaim = claims.reserve({
    resourceId: staleSelection.resourceId,
    amount: 1,
    consumerId: 'building:00000009'
  });
  const claimsBeforeRejectedAssignment = claims.ids().length;
  let staleRejected = false;
  try { assignment.assignMatch(staleProposal); }
  catch { staleRejected = true; }

  check('stale-proposal-is-rejected-before-partial-assignment', () => {
    const progress = demands.progress(demandC.id);
    return staleRejected
      && claims.ids().length === claimsBeforeRejectedAssignment
      && progress.reservedAmount === 0
      && progress.remainingAmount === 2
      && progress.status === 'OPEN';
  });

  claims.release(competingClaim.id);
  const freshProposal = matching.matchDemand(demandC.id);
  const freshAssignment = assignment.assignMatch(freshProposal);

  check('fresh-proposal-after-availability-change-can-be-assigned', () => {
    const progress = demands.progress(demandC.id);
    return freshAssignment.assignedAmount === 2
      && progress.reservedAmount === 2
      && progress.remainingAmount === 0
      && progress.status === 'RESERVED';
  });

  check('resource-quantity-invariant-holds-for-entire-cr03-chain', () => {
    return [woodA.id, woodB.id, woodC.id, stoneA.id].every(resourceId => {
      const resource = resources.get(resourceId);
      const available = claims.availableAmount(resourceId);
      const reserved = claims.reservedAmount(resourceId);
      const consumed = claims.consumedAmount(resourceId);
      return available + reserved + consumed === resource.amount;
    });
  });

  check('demand-remaining-invariant-holds-for-entire-cr03-chain', () => {
    return [demandA.id, demandB.id, demandC.id].every(demandId => {
      const demand = demands.get(demandId);
      return demand.remainingAmount === demand.targetAmount - demand.reservedAmount - demand.fulfilledAmount;
    });
  });

  check('scope-gate-keeps-jobs-carriers-movement-and-transport-out', () => {
    return domains.jobs.size === 0
      && domains.units.size === 0
      && JSON.stringify(domains.names()) === JSON.stringify(['buildings', 'units', 'resources', 'jobs']);
  });

  const pass = results.every(result => result.pass);
  const blockers = Object.freeze(results.filter(result => !result.pass).map(result => result.name));
  return Object.freeze({
    pass,
    blockerCount: blockers.length,
    blockers,
    results: Object.freeze(results.map(Object.freeze))
  });
}
