import { TraversalCostResolver } from './traversal-cost-resolver.js';
import { DeterministicCostAwarePathfinder } from './deterministic-cost-aware-pathfinder.js';
import { RoadPreferenceCostPolicy } from './road-preference-cost-policy.js';

function assertClassificationSource(source) {
  if (!source || typeof source.typeAt !== 'function') {
    throw new TypeError('TraversalClassificationSource-compatible source required');
  }
}

function assertBlockedCellSource(source) {
  if (!source || typeof source.isTraversable !== 'function') {
    throw new TypeError('BlockedCellSource-compatible source required');
  }
}

function traversableMapView(map, blockedCellSource) {
  if (!map || typeof map.contains !== 'function') throw new TypeError('MapStructure-compatible map required');
  return Object.freeze({
    contains(x, y) {
      return map.contains(x, y) && blockedCellSource.isTraversable(Object.freeze({ x:Number(x), y:Number(y) }));
    }
  });
}

export class ObstacleAwareRoutingIntegration {
  static find({ map, startPosition, targetPosition, classificationSource, blockedCellSource } = {}) {
    assertClassificationSource(classificationSource);
    assertBlockedCellSource(blockedCellSource);
    const resolver = new TraversalCostResolver({ profiles:RoadPreferenceCostPolicy.profiles });
    const costAt = resolver.costAt({ typeAt:position => classificationSource.typeAt(position) });
    const routingMap = traversableMapView(map, blockedCellSource);
    return DeterministicCostAwarePathfinder.find({ map:routingMap, startPosition, targetPosition, costAt });
  }
}
