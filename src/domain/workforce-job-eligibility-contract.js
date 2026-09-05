import { parseStableId } from '../world/stable-id.js';
import { PersonWorkforceProfileContract } from './person-workforce-profile-contract.js';
import { WorkforceAssignmentStateContract } from './workforce-assignment-state-contract.js';

const CAPABILITY_VALUES = new Set(Object.values(PersonWorkforceProfileContract.capabilities));

function requireAssignmentId(value) {
  const parsed = parseStableId(value);
  if (!parsed || parsed.kind !== 'assignment') throw new TypeError(`invalid assignment id: ${value}`);
  return parsed.id;
}

function requireCapability(value) {
  const normalized = String(value ?? '').trim().toUpperCase();
  if (!CAPABILITY_VALUES.has(normalized)) throw new TypeError(`invalid required capability: ${value}`);
  return normalized;
}

function requireBoolean(value, label) {
  if (typeof value !== 'boolean') throw new TypeError(`${label} must be boolean`);
  return value;
}

function defineRequest({ assignmentId, requiredCapability, preconditionsPassed, requiresReachability = false, reachable = null } = {}) {
  const normalizedRequiresReachability = requireBoolean(requiresReachability, 'requiresReachability');
  const normalizedReachable = normalizedRequiresReachability
    ? requireBoolean(reachable, 'reachable')
    : null;

  if (!normalizedRequiresReachability && reachable !== undefined && reachable !== null) {
    throw new TypeError('reachable must be omitted when reachability is not required');
  }

  return Object.freeze({
    kind: 'workforce-job-eligibility-request',
    assignmentId: requireAssignmentId(assignmentId),
    requiredCapability: requireCapability(requiredCapability),
    preconditionsPassed: requireBoolean(preconditionsPassed, 'preconditionsPassed'),
    requiresReachability: normalizedRequiresReachability,
    reachable: normalizedReachable
  });
}

function requireProfile(value) {
  if (!value || value.kind !== 'person-workforce-profile') throw new TypeError('invalid workforce profile');
  return PersonWorkforceProfileContract.define(value);
}

function requireState(value) {
  if (!value || value.kind !== 'workforce-assignment-state') throw new TypeError('invalid workforce assignment state');
  return WorkforceAssignmentStateContract.define(value);
}

function normalizeCandidate(value) {
  if (!value || typeof value !== 'object') throw new TypeError('invalid workforce candidate');
  const profile = requireProfile(value.profile);
  const state = requireState(value.state);
  if (profile.personId !== state.personId) throw new Error('candidate profile/state personId mismatch');
  return Object.freeze({ profile, state });
}

function isEligibleNormalized(request, candidate) {
  return request.preconditionsPassed
    && candidate.state.availability === WorkforceAssignmentStateContract.availabilityStates.FREE
    && candidate.profile.capabilities.includes(request.requiredCapability)
    && (!request.requiresReachability || request.reachable === true);
}

export class WorkforceJobEligibilityContract {
  static defineRequest(input = {}) {
    return defineRequest(input);
  }

  static isEligible(requestInput, candidateInput) {
    const request = defineRequest(requestInput);
    const candidate = normalizeCandidate(candidateInput);
    return isEligibleNormalized(request, candidate);
  }

  static select(requestInput, candidatesInput) {
    const request = defineRequest(requestInput);
    if (!Array.isArray(candidatesInput)) throw new TypeError('workforce candidates must be an array');

    const normalized = candidatesInput.map(normalizeCandidate);
    const personIds = normalized.map(candidate => candidate.profile.personId);
    if (new Set(personIds).size !== personIds.length) throw new Error('duplicate workforce candidate personId');

    const eligible = normalized
      .filter(candidate => isEligibleNormalized(request, candidate))
      .sort((a, b) => a.profile.personId.localeCompare(b.profile.personId));

    return eligible.length ? eligible[0] : null;
  }

  static selectAndAssign(requestInput, candidatesInput) {
    const request = defineRequest(requestInput);
    const selected = this.select(request, candidatesInput);
    if (!selected) return null;

    return Object.freeze({
      personId: selected.profile.personId,
      profile: selected.profile,
      previousState: selected.state,
      assignedState: WorkforceAssignmentStateContract.assign(selected.state, request.assignmentId),
      assignmentId: request.assignmentId
    });
  }
}
