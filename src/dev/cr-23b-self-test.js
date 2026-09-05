import { ResidentHomeAssignmentContract } from '../domain/resident-home-assignment-contract.js';

export function runCr23bSelfTest() {
  const results = [];
  const check = (name, fn) => {
    try { results.push({ name, pass: !!fn() }); }
    catch (error) { results.push({ name, pass: false, error: String(error?.message || error) }); }
  };
  const rejects = fn => { try { fn(); return false; } catch { return true; } };

  check('unassigned-resident-has-no-home-building', () => {
    const assignment = ResidentHomeAssignmentContract.define({ personId: 'unit:00000001' });
    return assignment.kind === 'resident-home-assignment'
      && assignment.personId === 'unit:00000001'
      && assignment.state === 'UNASSIGNED'
      && assignment.homeBuildingId === null;
  });

  check('assigned-resident-references-exact-building-owner-id', () => {
    const assignment = ResidentHomeAssignmentContract.define({
      personId: 'unit:00000001',
      state: 'ASSIGNED',
      homeBuildingId: 'building:00000007'
    });
    return assignment.personId === 'unit:00000001'
      && assignment.state === 'ASSIGNED'
      && assignment.homeBuildingId === 'building:00000007';
  });

  check('person-and-building-id-kinds-are-strict', () =>
    rejects(() => ResidentHomeAssignmentContract.define({ personId: 'building:00000001' }))
      && rejects(() => ResidentHomeAssignmentContract.define({ personId: 'person:00000001' }))
      && rejects(() => ResidentHomeAssignmentContract.define({ personId: 'unit:00000001', state: 'ASSIGNED', homeBuildingId: 'unit:00000002' }))
      && rejects(() => ResidentHomeAssignmentContract.define({ personId: 'unit:00000001', state: 'ASSIGNED', homeBuildingId: 'building-2' }))
  );

  check('assignment-state-and-home-reference-must-agree', () =>
    rejects(() => ResidentHomeAssignmentContract.define({ personId: 'unit:00000001', state: 'UNASSIGNED', homeBuildingId: 'building:00000001' }))
      && rejects(() => ResidentHomeAssignmentContract.define({ personId: 'unit:00000001', state: 'ASSIGNED' }))
      && rejects(() => ResidentHomeAssignmentContract.define({ personId: 'unit:00000001', state: 'MOVING', homeBuildingId: 'building:00000001' }))
  );

  check('same-input-produces-same-immutable-contract', () => {
    const input = { personId: 'unit:00000003', state: 'ASSIGNED', homeBuildingId: 'building:00000004' };
    const a = ResidentHomeAssignmentContract.define(input);
    const b = ResidentHomeAssignmentContract.define(input);
    if (!Object.isFrozen(a) || !Object.isFrozen(ResidentHomeAssignmentContract.states)) return false;
    try { a.homeBuildingId = 'building:00000005'; } catch {}
    return a.homeBuildingId === 'building:00000004' && JSON.stringify(a) === JSON.stringify(b);
  });

  check('explicit-new-assignment-does-not-mutate-previous-assignment', () => {
    const a = ResidentHomeAssignmentContract.define({ personId: 'unit:00000008', state: 'ASSIGNED', homeBuildingId: 'building:00000001' });
    const b = ResidentHomeAssignmentContract.define({ personId: 'unit:00000008', state: 'ASSIGNED', homeBuildingId: 'building:00000002' });
    return a.homeBuildingId === 'building:00000001' && b.homeBuildingId === 'building:00000002';
  });

  check('cr23b-does-not-add-capacity-occupancy-population-workforce-or-movement', () => {
    const assignment = ResidentHomeAssignmentContract.define({ personId: 'unit:00000001', state: 'ASSIGNED', homeBuildingId: 'building:00000001' });
    const forbidden = [
      'capacity','occupancy','residents','residentCount','household','parent','child','birthTimer','age','gender',
      'profession','worker','job','tool','clothing','production','stock','storage','inventory','construction','transport','position','route'
    ];
    return forbidden.every(key => !(key in assignment));
  });

  const blockerCount = results.filter(result => !result.pass).length;
  return Object.freeze({ pass: blockerCount === 0, blockerCount, results: Object.freeze(results.map(Object.freeze)) });
}
