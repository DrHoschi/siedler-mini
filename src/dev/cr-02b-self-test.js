import { WorldStore } from '../world/world-store.js';
import { MapStructure } from '../world/map-structure.js';
import { CoreDomainStores } from '../domain/core-domain-stores.js';
import { ResourceState } from '../resources/resource-state.js';
import { ResourceClaims } from '../resources/resource-claims.js';

export function runCr02bSelfTest() {
  const results = [];
  const check = (name, fn) => {
    try { results.push({ name, pass: !!fn() }); }
    catch (error) { results.push({ name, pass: false, error: String(error?.message || error) }); }
  };

  const world = new WorldStore();
  const map = new MapStructure(world, { width: 2, height: 2, metadata: { test: 'CR-02B' } });
  const domains = new CoreDomainStores();
  const resources = new ResourceState({ world, resourceStore: domains.resources });
  const claims = new ResourceClaims({ resourceState: resources });
  const wood = resources.createDefinition({ technicalName: 'wood.log', label: 'Wood Log' });
  const lot = resources.createResource({ definitionId: wood.id, amount: 6, location: { kind:'cell', refId: map.cellIdAt(0, 0) } });

  check('partial-reservation-updates-availability', () => {
    const claim = claims.reserve({ resourceId: lot.id, amount: 4, consumerId: 'consumer:00000001', demandId: 'demand:00000001' });
    return claim.id.startsWith('claim:') && claims.reservedAmount(lot.id) === 4 && claims.availableAmount(lot.id) === 2 && resources.get(lot.id).state === 'RESERVED';
  });

  check('over-reservation-rejected', () => {
    try {
      claims.reserve({ resourceId: lot.id, amount: 3, consumerId: 'consumer:00000002' });
      return false;
    } catch {
      return claims.reservedAmount(lot.id) === 4 && claims.availableAmount(lot.id) === 2;
    }
  });

  let secondClaimId = null;
  check('remaining-amount-can-be-claimed-once', () => {
    const claim = claims.reserve({ resourceId: lot.id, amount: 2, consumerId: 'consumer:00000002' });
    secondClaimId = claim.id;
    return claims.reservedAmount(lot.id) === 6 && claims.availableAmount(lot.id) === 0;
  });

  check('consume-is-deterministic-and-not-releasable', () => {
    const first = claims.activeClaimsFor(lot.id)[0];
    claims.consume(first.id);
    const again = claims.consume(first.id);
    let releaseRejected = false;
    try { claims.release(first.id); } catch { releaseRejected = true; }
    return again.state === 'CONSUMED' && releaseRejected && claims.consumedAmount(lot.id) === 4 && claims.reservedAmount(lot.id) === 2 && resources.get(lot.id).state === 'RESERVED';
  });

  check('full-consumption-closes-resource', () => {
    claims.consume(secondClaimId);
    return claims.consumedAmount(lot.id) === 6 && claims.availableAmount(lot.id) === 0 && resources.get(lot.id).state === 'CONSUMED';
  });

  check('release-restores-unclaimed-amount', () => {
    const stone = resources.createDefinition({ technicalName: 'stone.raw', label: 'Stone' });
    const secondLot = resources.createResource({ definitionId: stone.id, amount: 5, location: { kind:'cell', refId: map.cellIdAt(1, 0) } });
    const claim = claims.reserve({ resourceId: secondLot.id, amount: 3, consumerId: 'consumer:00000003' });
    claims.release(claim.id);
    return claims.get(claim.id).state === 'RELEASED' && claims.reservedAmount(secondLot.id) === 0 && claims.availableAmount(secondLot.id) === 5 && resources.get(secondLot.id).state === 'AVAILABLE';
  });

  check('snapshots-frozen-and-scope-clean', () => {
    const snap = claims.snapshot();
    return Object.isFrozen(snap) && Object.isFrozen(snap.items) && domains.buildings.size === 0 && domains.units.size === 0 && domains.jobs.size === 0;
  });

  const pass = results.every(result => result.pass);
  return Object.freeze({ pass, results: Object.freeze(results.map(Object.freeze)) });
}
