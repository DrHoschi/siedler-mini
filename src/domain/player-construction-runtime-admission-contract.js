const RUNTIME_STATES = Object.freeze(['CREATED', 'BOOTING', 'READY', 'RUNNING', 'PAUSED', 'STOPPED']);
const ADMITTED_RUNTIME_STATE = 'RUNNING';

function requireRuntimeState(value) {
  const state = String(value ?? '').trim().toUpperCase();
  if (!RUNTIME_STATES.includes(state)) {
    throw new TypeError(`invalid runtime state: ${value}`);
  }
  return state;
}

function requireCommitResult(value) {
  if (!value || value.kind !== 'authoritative-placement-commit-result') {
    throw new TypeError('authoritative placement commit result required');
  }
  if (!['COMMITTED', 'REJECTED'].includes(value.status)) {
    throw new TypeError(`invalid authoritative placement commit status: ${value.status}`);
  }
  return value;
}

function reject({ runtimeState, commitResult, reason }) {
  return Object.freeze({
    kind: 'player-construction-runtime-admission-result',
    status: 'REJECTED',
    admitted: false,
    reason,
    runtimeState,
    buildingId: commitResult?.buildingId ?? null,
    definitionId: commitResult?.candidate?.definitionId ?? null,
    source: commitResult,
  });
}

export class PlayerConstructionRuntimeAdmissionContract {
  static get runtimeStates() {
    return RUNTIME_STATES;
  }

  static get admittedRuntimeState() {
    return ADMITTED_RUNTIME_STATE;
  }

  static evaluate({ runtimeState, commitResult } = {}) {
    const state = requireRuntimeState(runtimeState);
    const commit = requireCommitResult(commitResult);

    if (commit.status !== 'COMMITTED') {
      return reject({ runtimeState: state, commitResult: commit, reason: 'PLACEMENT_NOT_COMMITTED' });
    }

    if (state !== ADMITTED_RUNTIME_STATE) {
      return reject({ runtimeState: state, commitResult: commit, reason: 'RUNTIME_NOT_RUNNING' });
    }

    const buildingId = String(commit.buildingId ?? '').trim();
    const definitionId = String(commit.candidate?.definitionId ?? '').trim();
    if (!buildingId || !definitionId) {
      throw new TypeError('committed placement result requires buildingId and definitionId');
    }

    return Object.freeze({
      kind: 'player-construction-runtime-admission-result',
      status: 'ADMITTED',
      admitted: true,
      reason: 'RUNTIME_RUNNING',
      runtimeState: state,
      buildingId,
      definitionId,
      source: commit,
    });
  }
}
