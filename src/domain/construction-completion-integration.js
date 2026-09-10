import { BuildingConstructionCompletionBoundary } from './building-construction-completion-boundary.js';
import { BuildingConstructionProgressTransitionContract } from './building-construction-progress-transition-contract.js';

function requireProgress(value, label) {
  if (!value || value.kind !== 'building-construction-progress-transition') {
    throw new TypeError(`${label} must be an existing building construction progress transition`);
  }
  return BuildingConstructionProgressTransitionContract.define(value);
}

function sameProgress(left, right) {
  return left.buildingId === right.buildingId
    && left.state === right.state
    && left.progress === right.progress;
}

export class ConstructionCompletionIntegration {
  static complete({ previousProgress, transitions, progress } = {}) {
    const previous = requireProgress(previousProgress, 'previous progress');
    const current = requireProgress(progress, 'current progress');

    if (!Array.isArray(transitions) || transitions.length < 1) {
      throw new TypeError('construction progress transitions must be a non-empty array');
    }
    if (previous.buildingId !== current.buildingId) {
      throw new TypeError('construction completion building identity mismatch');
    }

    const previousBoundary = BuildingConstructionCompletionBoundary.derive(previous);
    if (previousBoundary.constructionComplete) {
      throw new TypeError('completed construction cannot produce another completion transition');
    }

    let cursor = previous;
    let completionCount = 0;
    let completionBoundary = null;

    const verifiedTransitions = transitions.map((transition, index) => {
      const candidate = requireProgress(transition, `construction transition ${index}`);
      if (candidate.buildingId !== previous.buildingId) {
        throw new TypeError('construction transition building identity mismatch');
      }

      const expected = BuildingConstructionProgressTransitionContract.advance(cursor, candidate.progress);
      if (!sameProgress(expected, candidate)) {
        throw new TypeError('construction transition does not match existing progress authority');
      }

      const boundary = BuildingConstructionCompletionBoundary.derive(candidate);
      if (boundary.constructionComplete) {
        completionCount += 1;
        completionBoundary = boundary;
        if (index !== transitions.length - 1) {
          throw new TypeError('construction completion must be the terminal progress transition');
        }
      }

      cursor = candidate;
      return candidate;
    });

    if (!sameProgress(cursor, current)) {
      throw new TypeError('current construction progress must equal the final verified transition');
    }

    const currentBoundary = BuildingConstructionCompletionBoundary.derive(current);
    if (currentBoundary.constructionComplete && completionCount !== 1) {
      throw new TypeError('completed construction must cross the existing completion boundary exactly once');
    }
    if (!currentBoundary.constructionComplete && completionCount !== 0) {
      throw new TypeError('incomplete construction must not emit a completion effect');
    }

    return Object.freeze({
      kind: 'construction-completion-integration',
      buildingId: current.buildingId,
      previousProgress: previous,
      transitions: Object.freeze(verifiedTransitions),
      progress: current,
      completionEffective: currentBoundary.constructionComplete,
      completionCount,
      completion: completionBoundary
    });
  }
}
