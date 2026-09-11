import { BuildingLifecycleStateContract } from './building-lifecycle-state-contract.js';
import { ConstructionCompletionIntegration } from './construction-completion-integration.js';

const STATUS = Object.freeze({
  ADMITTED: 'ADMITTED',
  REJECTED: 'REJECTED'
});

const REASONS = Object.freeze({
  CONSTRUCTION_COMPLETE: 'CONSTRUCTION_COMPLETE',
  CONSTRUCTION_NOT_COMPLETE: 'CONSTRUCTION_NOT_COMPLETE',
  BUILDING_NOT_EXISTING: 'BUILDING_NOT_EXISTING',
  BUILDING_ID_MISMATCH: 'BUILDING_ID_MISMATCH'
});

function requireCompletion(value) {
  if (!value || value.kind !== 'construction-completion-integration') {
    throw new TypeError('existing construction completion integration required');
  }

  return ConstructionCompletionIntegration.complete({
    previousProgress: value.previousProgress,
    transitions: value.transitions,
    progress: value.progress
  });
}

function result({ admitted, reason, buildingId, completion, lifecycle }) {
  return Object.freeze({
    kind: 'operational-building-admission',
    status: admitted ? STATUS.ADMITTED : STATUS.REJECTED,
    admitted,
    operational: admitted,
    reason,
    buildingId,
    constructionCompletion: completion,
    lifecycle
  });
}

export class OperationalBuildingAdmissionContract {
  static get status() {
    return STATUS;
  }

  static get reasons() {
    return REASONS;
  }

  static evaluate({ constructionCompletion, lifecycle } = {}) {
    const completion = requireCompletion(constructionCompletion);
    const buildingLifecycle = BuildingLifecycleStateContract.define(lifecycle);

    if (completion.buildingId !== buildingLifecycle.buildingId) {
      return result({
        admitted: false,
        reason: REASONS.BUILDING_ID_MISMATCH,
        buildingId: completion.buildingId,
        completion,
        lifecycle: buildingLifecycle
      });
    }

    if (buildingLifecycle.state !== BuildingLifecycleStateContract.states.EXISTS) {
      return result({
        admitted: false,
        reason: REASONS.BUILDING_NOT_EXISTING,
        buildingId: completion.buildingId,
        completion,
        lifecycle: buildingLifecycle
      });
    }

    if (!completion.completionEffective || completion.completionCount !== 1) {
      return result({
        admitted: false,
        reason: REASONS.CONSTRUCTION_NOT_COMPLETE,
        buildingId: completion.buildingId,
        completion,
        lifecycle: buildingLifecycle
      });
    }

    return result({
      admitted: true,
      reason: REASONS.CONSTRUCTION_COMPLETE,
      buildingId: completion.buildingId,
      completion,
      lifecycle: buildingLifecycle
    });
  }
}
