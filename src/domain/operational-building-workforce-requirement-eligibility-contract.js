import { OperationalBuildingAdmissionContract } from './operational-building-admission-contract.js';
import { PersonWorkforceProfileContract } from './person-workforce-profile-contract.js';
import { WorkforceAssignmentStateContract } from './workforce-assignment-state-contract.js';

const SPECIALIZATION_VALUES = new Set(Object.values(PersonWorkforceProfileContract.specializations));
const CAPABILITY_VALUES = new Set(Object.values(PersonWorkforceProfileContract.capabilities));

function requireOperationalAdmission(value) {
  if (!value || value.kind !== 'operational-building-admission') {
    throw new TypeError('operational building admission required');
  }
  if (value.admitted !== true || value.operational !== true) {
    throw new TypeError('workforce requirement requires an admitted operational building');
  }
  return OperationalBuildingAdmissionContract.evaluate({
    constructionCompletion: value.constructionCompletion,
    lifecycle: value.lifecycle
  });
}

function requireCount(value) {
  const count = Number(value);
  if (!Number.isSafeInteger(count) || count < 1) {
    throw new TypeError(`invalid workforce requirement count: ${value}`);
  }
  return count;
}

function requireSpecialization(value) {
  const normalized = String(value ?? '').trim().toUpperCase();
  if (!SPECIALIZATION_VALUES.has(normalized)) {
    throw new TypeError(`invalid required workforce specialization: ${value}`);
  }
  return normalized;
}

function requireCapabilities(values) {
  if (!Array.isArray(values) || values.length < 1) {
    throw new TypeError('required workforce capabilities must be a non-empty array');
  }
  const normalized = values.map(value => String(value ?? '').trim().toUpperCase());
  if (normalized.some(value => !CAPABILITY_VALUES.has(value))) {
    throw new TypeError('invalid required workforce capability');
  }
  return Object.freeze([...new Set(normalized)].sort((a, b) => a.localeCompare(b)));
}

function requireProfile(value) {
  if (!value || value.kind !== 'person-workforce-profile') {
    throw new TypeError('person workforce profile required');
  }
  return PersonWorkforceProfileContract.define(value);
}

function requireState(value) {
  if (!value || value.kind !== 'workforce-assignment-state') {
    throw new TypeError('workforce assignment state required');
  }
  return WorkforceAssignmentStateContract.define(value);
}

function normalizeCandidate(value) {
  if (!value || typeof value !== 'object') throw new TypeError('invalid workforce candidate');
  const profile = requireProfile(value.profile);
  const state = requireState(value.state);
  if (profile.personId !== state.personId) throw new TypeError('candidate profile/state personId mismatch');
  return Object.freeze({ profile, state });
}

function matches(requirement, candidate) {
  return candidate.state.availability === WorkforceAssignmentStateContract.availabilityStates.FREE
    && candidate.profile.specialization === requirement.requiredSpecialization
    && requirement.requiredCapabilities.every(capability => candidate.profile.capabilities.includes(capability));
}

export class OperationalBuildingWorkforceRequirementEligibilityContract {
  static defineRequirement({ operationalAdmission, count, requiredSpecialization, requiredCapabilities } = {}) {
    const admission = requireOperationalAdmission(operationalAdmission);
    return Object.freeze({
      kind: 'operational-building-workforce-requirement',
      buildingId: admission.buildingId,
      count: requireCount(count),
      requiredSpecialization: requireSpecialization(requiredSpecialization),
      requiredCapabilities: requireCapabilities(requiredCapabilities),
      operationalAdmission: admission
    });
  }

  static evaluate({ requirement, candidates } = {}) {
    const normalizedRequirement = requirement?.kind === 'operational-building-workforce-requirement'
      ? this.defineRequirement({
          operationalAdmission: requirement.operationalAdmission,
          count: requirement.count,
          requiredSpecialization: requirement.requiredSpecialization,
          requiredCapabilities: requirement.requiredCapabilities
        })
      : this.defineRequirement(requirement);

    if (!Array.isArray(candidates)) throw new TypeError('workforce candidates must be an array');
    const normalizedCandidates = candidates.map(normalizeCandidate);
    const personIds = normalizedCandidates.map(candidate => candidate.profile.personId);
    if (new Set(personIds).size !== personIds.length) throw new TypeError('duplicate workforce candidate personId');

    const eligibleCandidates = normalizedCandidates
      .filter(candidate => matches(normalizedRequirement, candidate))
      .sort((a, b) => a.profile.personId.localeCompare(b.profile.personId));

    return Object.freeze({
      kind: 'operational-building-workforce-eligibility',
      buildingId: normalizedRequirement.buildingId,
      requirement: normalizedRequirement,
      eligiblePersonIds: Object.freeze(eligibleCandidates.map(candidate => candidate.profile.personId)),
      eligibleCandidates: Object.freeze(eligibleCandidates),
      eligibleCount: eligibleCandidates.length,
      requiredCount: normalizedRequirement.count,
      requirementSatisfied: eligibleCandidates.length >= normalizedRequirement.count
    });
  }
}
