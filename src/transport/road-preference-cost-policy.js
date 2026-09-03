import { TraversalCostContract } from './traversal-cost-contract.js';

const PROFILES = Object.freeze({
  NEUTRAL: TraversalCostContract.define({ traversalType:'NEUTRAL', baseCost:1, costMultiplier:1 }),
  PATH: TraversalCostContract.define({ traversalType:'PATH', baseCost:1, costMultiplier:0.75 }),
  ROAD: TraversalCostContract.define({ traversalType:'ROAD', baseCost:1, costMultiplier:0.5 })
});

function normalizeType(value) {
  return TraversalCostContract.define({ traversalType:value }).traversalType;
}

export class RoadPreferenceCostPolicy {
  static get profiles() { return PROFILES; }

  static resolve(traversalType = 'NEUTRAL') {
    return PROFILES[normalizeType(traversalType)];
  }
}
