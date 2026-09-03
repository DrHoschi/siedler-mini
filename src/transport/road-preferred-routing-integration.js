import { TraversalCostResolver } from './traversal-cost-resolver.js';
import { DeterministicCostAwarePathfinder } from './deterministic-cost-aware-pathfinder.js';
import { RoadPreferenceCostPolicy } from './road-preference-cost-policy.js';

function assertClassificationSource(source) {
  if (!source || typeof source.typeAt !== 'function') {
    throw new TypeError('TraversalClassificationSource-compatible source required');
  }
}

export class RoadPreferredRoutingIntegration {
  static find({ map, startPosition, targetPosition, classificationSource } = {}) {
    assertClassificationSource(classificationSource);
    const resolver = new TraversalCostResolver({ profiles:RoadPreferenceCostPolicy.profiles });
    const costAt = resolver.costAt({ typeAt:position => classificationSource.typeAt(position) });
    return DeterministicCostAwarePathfinder.find({ map, startPosition, targetPosition, costAt });
  }
}
