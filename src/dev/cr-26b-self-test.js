import { WorkforceAssignmentStateContract } from '../domain/workforce-assignment-state-contract.js';

export function runCr26bSelfTest() {
  const results = [];
  const check = (name, fn) => {
    try { results.push(Object.freeze({ name, pass: !!fn() })); }
    catch (error) { results.push(Object.freeze({ name, pass: false, error: String(error?.message || error) })); }
  };
  const rejects = fn => { try { fn(); return false; } catch { return true; } };

  check('defines-free-assigned-unavailable-states', () => {
    const states = WorkforceAssignmentStateContract.availabilityStates;
    return states.FREE === 'FREE' && states.ASSIGNED === 'ASSIGNED' && states.UNAVAILABLE === 'UNAVAILABLE';
  });

  check('free-and-unavailable-own-no-assignment', () => {
    const free = WorkforceAssignmentStateContract.define({ personId: 'unit:00000021' });
    const unavailable = WorkforceAssignmentStateContract.define({ personId: 'unit:00000021', availability: 'UNAVAILABLE' });
    return free.availability === 'FREE' && free.assignmentId === null
      && unavailable.availability === 'UNAVAILABLE' && unavailable.assignmentId === null;
  });

  check('assigned-requires-exactly-one-stable-assignment-id', () => {
    const assigned = WorkforceAssignmentStateContract.define({ personId: 'unit:00000021', availability: 'ASSIGNED', assignmentId: 'assignment:00000001' });
    return assigned.assignmentId === 'assignment:00000001'
      && rejects(() => WorkforceAssignmentStateContract.define({ personId: 'unit:00000021', availability: 'ASSIGNED' }))
      && rejects(() => WorkforceAssignmentStateContract.define({ personId: 'unit:00000021', availability: 'ASSIGNED', assignmentId: 'job:00000001' }));
  });

  check('assign-only-from-free-and-prevents-parallel-assignment', () => {
    const free = WorkforceAssignmentStateContract.define({ personId: 'unit:00000021' });
    const assigned = WorkforceAssignmentStateContract.assign(free, 'assignment:00000001');
    return assigned.availability === 'ASSIGNED'
      && rejects(() => WorkforceAssignmentStateContract.assign(assigned, 'assignment:00000002'));
  });

  check('release-assigned-back-to-free', () => {
    const assigned = WorkforceAssignmentStateContract.define({ personId: 'unit:00000021', availability: 'ASSIGNED', assignmentId: 'assignment:00000001' });
    const free = WorkforceAssignmentStateContract.release(assigned);
    return free.availability === 'FREE' && free.assignmentId === null;
  });

  check('unavailable-transitions-only-through-free', () => {
    const free = WorkforceAssignmentStateContract.define({ personId: 'unit:00000021' });
    const unavailable = WorkforceAssignmentStateContract.markUnavailable(free);
    const freeAgain = WorkforceAssignmentStateContract.markFree(unavailable);
    const assigned = WorkforceAssignmentStateContract.assign(freeAgain, 'assignment:00000001');
    return unavailable.availability === 'UNAVAILABLE'
      && freeAgain.availability === 'FREE'
      && rejects(() => WorkforceAssignmentStateContract.markUnavailable(assigned));
  });

  check('transitions-preserve-person-id-and-input-immutability', () => {
    const free = WorkforceAssignmentStateContract.define({ personId: 'unit:00000021' });
    const before = JSON.stringify(free);
    const assigned = WorkforceAssignmentStateContract.assign(free, 'assignment:00000001');
    return free.personId === assigned.personId
      && JSON.stringify(free) === before
      && Object.isFrozen(free)
      && Object.isFrozen(assigned);
  });

  check('rejects-invalid-person-state-and-nonassigned-assignment-reference', () =>
    rejects(() => WorkforceAssignmentStateContract.define({ personId: 'building:00000021' }))
      && rejects(() => WorkforceAssignmentStateContract.define({ personId: 'unit:00000021', availability: 'WORKING' }))
      && rejects(() => WorkforceAssignmentStateContract.define({ personId: 'unit:00000021', availability: 'FREE', assignmentId: 'assignment:00000001' }))
  );

  check('cr26b-does-not-add-selection-priority-reachability-or-execution', () => {
    const value = WorkforceAssignmentStateContract.define({ personId: 'unit:00000021' });
    const forbidden = ['specialization','capabilities','jobId','queue','priority','candidate','eligible','reachability','reachable','path','route','target','activity','production','construction','transport'];
    return forbidden.every(key => !(key in value))
      && typeof WorkforceAssignmentStateContract.select === 'undefined'
      && typeof WorkforceAssignmentStateContract.prioritize === 'undefined';
  });

  const blockerCount = results.filter(result => !result.pass).length;
  return Object.freeze({ pass: blockerCount === 0, blockerCount, results: Object.freeze(results) });
}
