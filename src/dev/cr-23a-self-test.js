import { PersonResidentIdentityContract } from '../domain/person-resident-identity-contract.js';

export function runCr23aSelfTest() {
  const results = [];
  const check = (name, fn) => {
    try { results.push({ name, pass: !!fn() }); }
    catch (error) { results.push({ name, pass: false, error: String(error?.message || error) }); }
  };
  const rejects = fn => { try { fn(); return false; } catch { return true; } };

  check('defines-stable-person-identity-on-existing-unit-id-kind', () => {
    const person = PersonResidentIdentityContract.define({ personId: 'unit:00000001' });
    return person.kind === 'person-resident-identity'
      && person.personId === 'unit:00000001'
      && person.existenceState === 'EXISTS';
  });

  check('same-input-produces-same-contract', () => {
    const a = PersonResidentIdentityContract.define({ personId: 'unit:00000007' });
    const b = PersonResidentIdentityContract.define({ personId: 'unit:00000007' });
    return JSON.stringify(a) === JSON.stringify(b);
  });

  check('rejects-non-unit-and-malformed-person-ids', () =>
    rejects(() => PersonResidentIdentityContract.define({ personId: 'building:00000001' }))
      && rejects(() => PersonResidentIdentityContract.define({ personId: 'person:00000001' }))
      && rejects(() => PersonResidentIdentityContract.define({ personId: 'unit-1' }))
  );

  check('cr23a-defines-only-exists-as-current-existence-state', () =>
    PersonResidentIdentityContract.existenceStates.EXISTS === 'EXISTS'
      && Object.keys(PersonResidentIdentityContract.existenceStates).join(',') === 'EXISTS'
      && rejects(() => PersonResidentIdentityContract.define({ personId: 'unit:00000001', existenceState: 'RETIRED' }))
  );

  check('contract-value-is-immutable', () => {
    const person = PersonResidentIdentityContract.define({ personId: 'unit:00000001' });
    if (!Object.isFrozen(person) || !Object.isFrozen(PersonResidentIdentityContract.existenceStates)) return false;
    try { person.personId = 'unit:00000002'; } catch {}
    return person.personId === 'unit:00000001';
  });

  check('cr23a-does-not-add-home-housing-population-workforce-or-gameplay-state', () => {
    const person = PersonResidentIdentityContract.define({ personId: 'unit:00000001' });
    const forbidden = [
      'homeBuildingId','home','housing','capacity','occupancy','household','parent','child','birthTimer',
      'age','gender','profession','worker','job','tool','clothing','production','stock','storage','inventory',
      'construction','transport','position','route'
    ];
    return forbidden.every(key => !(key in person));
  });

  const blockerCount = results.filter(result => !result.pass).length;
  return Object.freeze({
    pass: blockerCount === 0,
    blockerCount,
    results: Object.freeze(results.map(Object.freeze))
  });
}
