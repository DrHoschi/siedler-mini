import { BuildingConstructionStateContract } from './building-construction-state-contract.js';

function requireProgress(value) {
  const progress = Number(value);
  if (!Number.isFinite(progress) || progress < 0 || progress > 1) {
    throw new TypeError(`invalid construction progress: ${value}`);
  }
  return progress;
}

function stateForProgress(progress) {
  if (progress === 0) return BuildingConstructionStateContract.states.PENDING;
  if (progress === 1) return BuildingConstructionStateContract.states.COMPLETED;
  return BuildingConstructionStateContract.states.IN_PROGRESS;
}

export class BuildingConstructionProgressTransitionContract {
  static define({ buildingId, progress = 0 } = {}) {
    const normalizedProgress = requireProgress(progress);
    const stateContract = BuildingConstructionStateContract.define({
      buildingId,
      state: stateForProgress(normalizedProgress)
    });

    return Object.freeze({
      kind: 'building-construction-progress-transition',
      buildingId: stateContract.buildingId,
      state: stateContract.state,
      progress: normalizedProgress
    });
  }

  static advance(current, nextProgress) {
    const value = this.define(current);
    const progress = requireProgress(nextProgress);

    if (value.state === BuildingConstructionStateContract.states.COMPLETED && progress !== 1) {
      throw new TypeError('completed construction is terminal');
    }
    if (progress < value.progress) {
      throw new TypeError(`construction progress cannot decrease: ${value.progress} -> ${progress}`);
    }
    if (value.state === BuildingConstructionStateContract.states.PENDING && progress === 1) {
      throw new TypeError('construction transition cannot skip PENDING -> COMPLETED');
    }

    return this.define({ buildingId: value.buildingId, progress });
  }
}
