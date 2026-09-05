import { CoreDomainStores } from '../domain/core-domain-stores.js';
import { BuildingIdentityOwnershipContract } from '../domain/building-identity-ownership-contract.js';
import { BuildingLifecycleStateContract } from '../domain/building-lifecycle-state-contract.js';
import { BuildingRegistrationWorldOwnership } from '../domain/building-registration-world-ownership.js';

export function runCr22cSelfTest() {
  const results = [];
  const check = (name, fn) => {
    try { results.push({ name, pass: !!fn() }); }
    catch (error) { results.push({ name, pass: false, error: String(error?.message || error) }); }
  };
  const rejects = fn => { try { fn(); return false; } catch { return true; } };
  const make = (id, definitionId = 'building-def:woodcutter') => ({
    identity: BuildingIdentityOwnershipContract.define({ buildingId: id, definitionId }),
    lifecycle: BuildingLifecycleStateContract.define({ buildingId: id })
  });

  const domains = new CoreDomainStores();
  const registry = new BuildingRegistrationWorldOwnership({ domains });

  check('registers-complete-building-owner-in-existing-building-store', () => {
    const stored = registry.register(make('building:00000001'));
    return stored.id === 'building:00000001'
      && stored.kind === 'building'
      && stored.identity.ownerRef.id === stored.id
      && stored.lifecycle.buildingId === stored.id
      && domains.buildings.size === 1;
  });

  check('lookup-resolves-exact-same-building-id', () => {
    const found = registry.get('building:00000001');
    return found?.id === 'building:00000001'
      && found.identity.definitionId === 'building-def:woodcutter'
      && registry.has('building:00000001');
  });

  check('unknown-building-lookup-is-controlled-null', () =>
    registry.get('building:00009999') === null
      && registry.has('building:00009999') === false
  );

  check('duplicate-building-id-is-rejected-deterministically', () =>
    rejects(() => registry.register(make('building:00000001', 'building-def:house')))
      && domains.buildings.size === 1
  );

  check('identity-and-lifecycle-must-address-same-building', () =>
    rejects(() => registry.register({
      identity: BuildingIdentityOwnershipContract.define({ buildingId: 'building:00000002', definitionId: 'building-def:house' }),
      lifecycle: BuildingLifecycleStateContract.define({ buildingId: 'building:00000003' })
    }))
      && domains.buildings.size === 1
  );

  check('multiple-buildings-remain-deterministically-addressable', () => {
    registry.register(make('building:00000003', 'building-def:house'));
    registry.register(make('building:00000002', 'building-def:tent'));
    return registry.ids().join(',') === 'building:00000001,building:00000002,building:00000003';
  });

  check('remove-affects-only-target-building', () => {
    const beforeSecond = registry.get('building:00000002');
    const removed = registry.remove('building:00000001');
    return removed === true
      && registry.get('building:00000001') === null
      && registry.get('building:00000002')?.identity.definitionId === beforeSecond.identity.definitionId
      && registry.get('building:00000003') != null
      && registry.ids().join(',') === 'building:00000002,building:00000003';
  });

  check('remove-unknown-building-is-controlled-false', () =>
    registry.remove('building:00009999') === false
  );

  check('registry-does-not-apply-lifecycle-policy-or-feature-side-effects', () => {
    const source = BuildingRegistrationWorldOwnership.toString().toLowerCase();
    const stored = registry.get('building:00000002');
    const forbidden = ['residents','workers','children','birthtimer','profession','production','stock','storage','inventory','construction','progress','transportjob'];
    return stored.lifecycle.state === 'EXISTS'
      && forbidden.every(key => !(key in stored))
      && !source.includes('.transition(')
      && !source.includes('retired')
      && !source.includes('construction');
  });

  check('invalid-building-ids-are-rejected', () =>
    rejects(() => registry.get('unit:00000001'))
      && rejects(() => registry.remove('building-1'))
  );

  const blockerCount = results.filter(result => !result.pass).length;
  return Object.freeze({ pass: blockerCount === 0, blockerCount, results: Object.freeze(results.map(Object.freeze)) });
}
