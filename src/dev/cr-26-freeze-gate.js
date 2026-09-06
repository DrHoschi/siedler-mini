import { PersonWorkforceProfileContract } from '../domain/person-workforce-profile-contract.js';
import { WorkforceAssignmentStateContract } from '../domain/workforce-assignment-state-contract.js';
import { WorkforceJobEligibilityContract } from '../domain/workforce-job-eligibility-contract.js';
import { runCr26cFreezeGate } from './cr-26c-freeze-gate.js';

export function runCr26FreezeGate() {
  const cr26c = runCr26cFreezeGate();
  const results = [];
  const check = (name, fn) => {
    try { results.push(Object.freeze({ name, pass: !!fn() })); }
    catch (error) { results.push(Object.freeze({ name, pass: false, error: String(error?.message || error) })); }
  };

  check('cr26a-b-c-frozen-chain-regression', () => !!cr26c.pass && cr26c.blockerCount === 0);

  check('cr26-end-to-end-profile-eligibility-assignment-chain', () => {
    const request = WorkforceJobEligibilityContract.defineRequest({
      assignmentId: 'assignment:00000041',
      requiredCapability: 'CAN_BUILD',
      preconditionsPassed: true,
      requiresReachability: true,
      reachable: true
    });
    const candidates = [
      {
        profile: PersonWorkforceProfileContract.define({ personId: 'unit:00000030', specialization: 'BUILDER', capabilities: ['CAN_MOVE','CAN_BUILD'] }),
        state: WorkforceAssignmentStateContract.define({ personId: 'unit:00000030' })
      },
      {
        profile: PersonWorkforceProfileContract.define({ personId: 'unit:00000012', specialization: 'GENERAL_RESIDENT', capabilities: ['CAN_MOVE','CAN_BUILD'] }),
        state: WorkforceAssignmentStateContract.define({ personId: 'unit:00000012' })
      },
      {
        profile: PersonWorkforceProfileContract.define({ personId: 'unit:00000021', specialization: 'BUILDER', capabilities: ['CAN_MOVE','CAN_BUILD'] }),
        state: WorkforceAssignmentStateContract.define({ personId: 'unit:00000021', availability: 'UNAVAILABLE' })
      }
    ];
    const result = WorkforceJobEligibilityContract.selectAndAssign(request, candidates);
    return result?.personId === 'unit:00000012'
      && result.assignmentId === 'assignment:00000041'
      && result.previousState.availability === 'FREE'
      && result.assignedState.availability === 'ASSIGNED'
      && result.assignedState.assignmentId === 'assignment:00000041'
      && candidates[0].profile.specialization === 'BUILDER'
      && candidates[1].profile.capabilities.includes('CAN_BUILD')
      && candidates[2].state.availability === 'UNAVAILABLE';
  });

  check('cr26-assignment-does-not-create-or-rewrite-capabilities', () => {
    const profile = PersonWorkforceProfileContract.define({
      personId: 'unit:00000012',
      specialization: 'GENERAL_RESIDENT',
      capabilities: ['CAN_MOVE','CAN_BUILD']
    });
    const state = WorkforceAssignmentStateContract.define({ personId: 'unit:00000012' });
    const beforeProfile = JSON.stringify(profile);
    const beforeState = JSON.stringify(state);
    const result = WorkforceJobEligibilityContract.selectAndAssign(
      WorkforceJobEligibilityContract.defineRequest({
        assignmentId: 'assignment:00000042',
        requiredCapability: 'CAN_BUILD',
        preconditionsPassed: true,
        requiresReachability: false
      }),
      [{ profile, state }]
    );
    return JSON.stringify(profile) === beforeProfile
      && JSON.stringify(state) === beforeState
      && result.assignedState.personId === profile.personId
      && profile.capabilities.length === 2;
  });

  check('cr26-noneligible-inputs-cannot-bypass-contract', () => {
    const request = WorkforceJobEligibilityContract.defineRequest({
      assignmentId: 'assignment:00000043',
      requiredCapability: 'CAN_BUILD',
      preconditionsPassed: false,
      requiresReachability: true,
      reachable: true
    });
    const candidate = {
      profile: PersonWorkforceProfileContract.define({ personId: 'unit:00000012', specialization: 'BUILDER', capabilities: ['CAN_BUILD'] }),
      state: WorkforceAssignmentStateContract.define({ personId: 'unit:00000012' })
    };
    return WorkforceJobEligibilityContract.selectAndAssign(request, [candidate]) === null;
  });

  check('cr26-scope-remains-foundation-only', () => {
    const forbiddenEligibilityMethods = ['prioritize','score','findPath','move','executeWork','tick','generateJobs','enqueue','complete','cancel','recover'];
    const forbiddenAssignmentMethods = ['selectCandidate','findPath','executeWork','dispatchTransport'];
    return forbiddenEligibilityMethods.every(name => typeof WorkforceJobEligibilityContract[name] === 'undefined')
      && forbiddenAssignmentMethods.every(name => typeof WorkforceAssignmentStateContract[name] === 'undefined');
  });

  const blockerCount = results.filter(result => !result.pass).length;
  return Object.freeze({ pass: blockerCount === 0, blockerCount, results: Object.freeze(results), cr26c });
}
