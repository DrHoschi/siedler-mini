import { PersonWorkforceProfileContract } from '../domain/person-workforce-profile-contract.js';
import { WorkforceAssignmentStateContract } from '../domain/workforce-assignment-state-contract.js';
import { WorkforceJobEligibilityContract } from '../domain/workforce-job-eligibility-contract.js';

export function runCr26cSelfTest() {
  const results = [];
  const check = (name, fn) => {
    try { results.push(Object.freeze({ name, pass: !!fn() })); }
    catch (error) { results.push(Object.freeze({ name, pass: false, error: String(error?.message || error) })); }
  };
  const rejects = fn => { try { fn(); return false; } catch { return true; } };

  const profile = (personId, capabilities) => PersonWorkforceProfileContract.define({
    personId,
    specialization: 'GENERAL_RESIDENT',
    capabilities
  });
  const state = (personId, availability = 'FREE', assignmentId = null) => WorkforceAssignmentStateContract.define({ personId, availability, assignmentId });
  const request = overrides => WorkforceJobEligibilityContract.defineRequest({
    assignmentId: 'assignment:00000011',
    requiredCapability: 'CAN_BUILD',
    preconditionsPassed: true,
    requiresReachability: false,
    ...overrides
  });

  check('defines-minimal-deterministic-eligibility-request', () => {
    const value = request();
    return value.kind === 'workforce-job-eligibility-request'
      && value.assignmentId === 'assignment:00000011'
      && value.requiredCapability === 'CAN_BUILD'
      && value.preconditionsPassed === true
      && value.requiresReachability === false
      && value.reachable === null
      && Object.isFrozen(value);
  });

  check('eligibility-requires-capability-free-and-preconditions', () => {
    const candidate = { profile: profile('unit:00000021', ['CAN_MOVE','CAN_BUILD']), state: state('unit:00000021') };
    const missingCapability = { profile: profile('unit:00000022', ['CAN_MOVE']), state: state('unit:00000022') };
    const assigned = { profile: profile('unit:00000023', ['CAN_BUILD']), state: state('unit:00000023', 'ASSIGNED', 'assignment:00000002') };
    return WorkforceJobEligibilityContract.isEligible(request(), candidate)
      && !WorkforceJobEligibilityContract.isEligible(request(), missingCapability)
      && !WorkforceJobEligibilityContract.isEligible(request(), assigned)
      && !WorkforceJobEligibilityContract.isEligible(request({ preconditionsPassed: false }), candidate);
  });

  check('required-reachability-must-pass-when-applicable', () => {
    const candidate = { profile: profile('unit:00000021', ['CAN_BUILD']), state: state('unit:00000021') };
    return WorkforceJobEligibilityContract.isEligible(request({ requiresReachability: true, reachable: true }), candidate)
      && !WorkforceJobEligibilityContract.isEligible(request({ requiresReachability: true, reachable: false }), candidate)
      && rejects(() => request({ requiresReachability: true }))
      && rejects(() => request({ reachable: true }));
  });

  check('selection-is-deterministic-by-stable-person-id', () => {
    const candidates = [
      { profile: profile('unit:00000030', ['CAN_BUILD']), state: state('unit:00000030') },
      { profile: profile('unit:00000012', ['CAN_BUILD']), state: state('unit:00000012') },
      { profile: profile('unit:00000021', ['CAN_BUILD']), state: state('unit:00000021') }
    ];
    const selectedA = WorkforceJobEligibilityContract.select(request(), candidates);
    const selectedB = WorkforceJobEligibilityContract.select(request(), [...candidates].reverse());
    return selectedA?.profile.personId === 'unit:00000012'
      && selectedB?.profile.personId === 'unit:00000012';
  });

  check('selection-returns-null-when-no-person-is-eligible', () => {
    const candidates = [
      { profile: profile('unit:00000012', ['CAN_MOVE']), state: state('unit:00000012') },
      { profile: profile('unit:00000021', ['CAN_BUILD']), state: state('unit:00000021', 'UNAVAILABLE') }
    ];
    return WorkforceJobEligibilityContract.select(request(), candidates) === null
      && WorkforceJobEligibilityContract.selectAndAssign(request(), candidates) === null;
  });

  check('selected-person-is-assigned-through-frozen-cr26b-transition', () => {
    const candidates = [
      { profile: profile('unit:00000021', ['CAN_BUILD']), state: state('unit:00000021') },
      { profile: profile('unit:00000022', ['CAN_BUILD']), state: state('unit:00000022') }
    ];
    const result = WorkforceJobEligibilityContract.selectAndAssign(request(), candidates);
    return result?.personId === 'unit:00000021'
      && result.assignmentId === 'assignment:00000011'
      && result.previousState.availability === 'FREE'
      && result.assignedState.availability === 'ASSIGNED'
      && result.assignedState.assignmentId === 'assignment:00000011'
      && Object.isFrozen(result)
      && Object.isFrozen(result.assignedState);
  });

  check('selection-does-not-mutate-profile-or-input-state', () => {
    const p = profile('unit:00000021', ['CAN_BUILD','CAN_MOVE']);
    const s = state('unit:00000021');
    const beforeP = JSON.stringify(p);
    const beforeS = JSON.stringify(s);
    WorkforceJobEligibilityContract.selectAndAssign(request(), [{ profile: p, state: s }]);
    return JSON.stringify(p) === beforeP
      && JSON.stringify(s) === beforeS
      && Object.isFrozen(p)
      && Object.isFrozen(s);
  });

  check('rejects-mismatched-or-duplicate-candidates-and-invalid-request', () => {
    const mismatched = { profile: profile('unit:00000021', ['CAN_BUILD']), state: state('unit:00000022') };
    const duplicate = { profile: profile('unit:00000021', ['CAN_BUILD']), state: state('unit:00000021') };
    return rejects(() => WorkforceJobEligibilityContract.select(request(), [mismatched]))
      && rejects(() => WorkforceJobEligibilityContract.select(request(), [duplicate, duplicate]))
      && rejects(() => request({ assignmentId: 'job:00000001' }))
      && rejects(() => request({ requiredCapability: 'CAN_TELEPORT' }));
  });

  check('cr26c-does-not-add-priority-pathfinding-movement-or-work-execution', () => {
    const requestValue = request();
    const forbidden = ['priority','score','distance','path','route','movement','target','duration','tick','production','construction','transport'];
    return forbidden.every(key => !(key in requestValue))
      && typeof WorkforceJobEligibilityContract.prioritize === 'undefined'
      && typeof WorkforceJobEligibilityContract.findPath === 'undefined'
      && typeof WorkforceJobEligibilityContract.executeWork === 'undefined';
  });

  const blockerCount = results.filter(result => !result.pass).length;
  return Object.freeze({ pass: blockerCount === 0, blockerCount, results: Object.freeze(results) });
}
