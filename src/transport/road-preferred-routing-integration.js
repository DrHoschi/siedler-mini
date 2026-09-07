import { TraversalCostResolver } from './traversal-cost-resolver.js';
import { DeterministicCostAwarePathfinder } from './deterministic-cost-aware-pathfinder.js';
import { RoadPreferenceCostPolicy } from './road-preference-cost-policy.js';
import { WearAwareTraversalCostResolver } from './wear-aware-traversal-cost-resolver.js';

function assertClassificationSource(source) {
  if (!source || typeof source.typeAt !== 'function') {
    throw new TypeError('TraversalClassificationSource-compatible source required');
  }
}

function costAtFor({ classificationSource, wearSource }) {
  const typeAt = position => classificationSource.typeAt(position);
  if (wearSource == null) {
    const resolver = new TraversalCostResolver({ profiles: RoadPreferenceCostPolicy.profiles });
    return resolver.costAt({ typeAt });
  }
  const resolver = new WearAwareTraversalCostResolver({
    profiles: RoadPreferenceCostPolicy.profiles,
    wearSource,
  });
  return resolver.costAt({ typeAt });
}

export class RoadPreferredRoutingIntegration {
  static find({ map, startPosition, targetPosition, classificationSource, wearSource = null } = {}) {
    assertClassificationSource(classificationSource);
    const costAt = costAtFor({ classificationSource, wearSource });
    return DeterministicCostAwarePathfinder.find({ map, startPosition, targetPosition, costAt });
  }
}
