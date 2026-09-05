import { BuildingConstructionProgressTransitionContract } from './building-construction-progress-transition-contract.js';

export class BuildingConstructionCompletionBoundary {
  static derive(value = {}) {
    const construction = BuildingConstructionProgressTransitionContract.define(value);
    return Object.freeze({
      kind: 'building-construction-completion',
      buildingId: construction.buildingId,
      constructionComplete: construction.state === 'COMPLETED' && construction.progress === 1
    });
  }
}
