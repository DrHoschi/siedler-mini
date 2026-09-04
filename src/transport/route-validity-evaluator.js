import { RouteValidityContract } from './route-validity-contract.js';

function assertRoute(route) {
  if (!route || route.kind !== 'route' || !Array.isArray(route.waypoints) || !route.targetPosition) {
    throw new TypeError('RouteContract-compatible route required');
  }
}

function assertTraversabilitySource(source) {
  if (!source || typeof source.isTraversable !== 'function') {
    throw new TypeError('Traversability source with isTraversable(position) required');
  }
}

function normalizeCompletedWaypointCount(value, waypointCount) {
  const count = Number(value ?? 0);
  if (!Number.isSafeInteger(count) || count < 0 || count > waypointCount) {
    throw new RangeError('completedWaypointCount must be an integer within route waypoints');
  }
  return count;
}

export class RouteValidityEvaluator {
  static evaluate({ route, traversabilitySource, completedWaypointCount = 0 } = {}) {
    assertRoute(route);
    assertTraversabilitySource(traversabilitySource);
    const completed = normalizeCompletedWaypointCount(completedWaypointCount, route.waypoints.length);
    const remainingPositions = [...route.waypoints.slice(completed), route.targetPosition];
    const blocked = remainingPositions.find(position => !traversabilitySource.isTraversable(position));
    return RouteValidityContract.define({ state: blocked ? 'INVALID' : 'VALID' });
  }
}
