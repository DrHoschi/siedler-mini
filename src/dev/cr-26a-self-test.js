import { PersonWorkforceProfileContract } from '../domain/person-workforce-profile-contract.js';

export function runCr26aSelfTest() {
  const results = [];
  const check = (name, fn) => {
    try { results.push(Object.freeze({ name, pass: !!fn() })); }
    catch (error) { results.push(Object.freeze({ name, pass: false, error: String(error?.message || error) })); }
  };
  const rejects = fn => { try { fn(); return false; } catch { return true; } };

  check('defines-person-workforce-profile-on-existing-unit-identity', () => {
    const value = PersonWorkforceProfileContract.define({
      personId: 'unit:00000021',
      specialization: 'BUILDER',
      capabilities: ['CAN_MOVE', 'CAN_BUILD']
    });
    return value.kind === 'person-workforce-profile'
      && value.personId === 'unit:00000021'
      && value.specialization === 'BUILDER'
      && Object.isFrozen(value)
      && Object.isFrozen(value.capabilities);
  });

  check('requires-valid-existing-person-unit-id', () =>
    rejects(() => PersonWorkforceProfileContract.define({ personId: 'building:00000021', specialization: 'BUILDER', capabilities: ['CAN_BUILD'] }))
      && rejects(() => PersonWorkforceProfileContract.define({ personId: 'person:00000021', specialization: 'BUILDER', capabilities: ['CAN_BUILD'] }))
      && rejects(() => PersonWorkforceProfileContract.define({ personId: 'invalid', specialization: 'BUILDER', capabilities: ['CAN_BUILD'] }))
  );

  check('supports-frozen-v1-specializations', () => {
    const values = Object.values(PersonWorkforceProfileContract.specializations);
    return ['GENERAL_RESIDENT','CARRIER','BUILDER','LUMBERJACK','QUARRY_WORKER','FISHER','HUNTER']
      .every(value => values.includes(value));
  });

  check('supports-frozen-v1-capabilities', () => {
    const values = Object.values(PersonWorkforceProfileContract.capabilities);
    return ['CAN_MOVE','CAN_SIMPLE_TRANSPORT','CAN_BUILD','CAN_LUMBERJACK','CAN_QUARRY','CAN_FISH','CAN_HUNT']
      .every(value => values.includes(value));
  });

  check('capability-set-is-deduplicated-sorted-and-immutable', () => {
    const value = PersonWorkforceProfileContract.define({
      personId: 'unit:00000021',
      specialization: 'GENERAL_RESIDENT',
      capabilities: ['CAN_SIMPLE_TRANSPORT', 'CAN_MOVE', 'CAN_MOVE']
    });
    return JSON.stringify(value.capabilities) === JSON.stringify(['CAN_MOVE','CAN_SIMPLE_TRANSPORT'])
      && Object.isFrozen(value.capabilities);
  });

  check('rejects-empty-or-unknown-capabilities-and-specializations', () =>
    rejects(() => PersonWorkforceProfileContract.define({ personId: 'unit:00000021', specialization: 'BUILDER', capabilities: [] }))
      && rejects(() => PersonWorkforceProfileContract.define({ personId: 'unit:00000021', specialization: 'MAGICIAN', capabilities: ['CAN_MOVE'] }))
      && rejects(() => PersonWorkforceProfileContract.define({ personId: 'unit:00000021', specialization: 'BUILDER', capabilities: ['CAN_TELEPORT'] }))
  );

  check('profile-is-deterministic-and-immutable', () => {
    const a = PersonWorkforceProfileContract.define({ personId: 'unit:00000021', specialization: 'BUILDER', capabilities: ['CAN_BUILD','CAN_MOVE'] });
    const b = PersonWorkforceProfileContract.define({ personId: 'unit:00000021', specialization: 'BUILDER', capabilities: ['CAN_MOVE','CAN_BUILD'] });
    return JSON.stringify(a) === JSON.stringify(b) && Object.isFrozen(a) && Object.isFrozen(a.capabilities);
  });

  check('cr26a-does-not-add-availability-assignment-or-job-selection', () => {
    const value = PersonWorkforceProfileContract.define({ personId: 'unit:00000021', specialization: 'BUILDER', capabilities: ['CAN_MOVE','CAN_BUILD'] });
    const forbidden = [
      'availability','state','assignment','assignmentId','job','jobId','queue','priority','reachable','reachability',
      'path','route','target','workState','activity','production','construction','transport'
    ];
    return forbidden.every(key => !(key in value));
  });

  const blockerCount = results.filter(result => !result.pass).length;
  return Object.freeze({ pass: blockerCount === 0, blockerCount, results: Object.freeze(results) });
}
