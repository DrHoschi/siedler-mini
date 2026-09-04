import { RouteValidityEvaluator } from './route-validity-evaluator.js';
import { ObstacleAwareRoutingIntegration } from './obstacle-aware-routing-integration.js';

function assertRoute(route) {
  if (!route || route.kind !== 'route' || !route.targetPosition) {
    throw new TypeError('RouteContract-compatible route required');
  }
}

function normalizePosition(value, name) {
  const x = Number(value?.x);
  const y = Number(value?.y);
  if (!Number.isSafeInteger(x) || !Number.isSafeInteger(y)) {
    throw new TypeError(`${name}.x and ${name}.y must be safe integers`);
  }
  return Object.freeze({ x, y });
}

export class ControlledRerouteIntegration {
  static resolve({
    route,
    currentPosition,
    completedWaypointCount = 0,
    map,
    classificationSource,
    blockedCellSource
  } = {}) {
    assertRoute(route);
    const current = normalizePosition(currentPosition, 'currentPosition');
    const validity = RouteValidityEvaluator.evaluate({
      route,
      traversabilitySource: blockedCellSource,
      completedWaypointCount
    });

    if (validity.state !== 'INVALID') {
      return Object.freeze({ rerouted: false, validity, route });
    }

    const replacement = ObstacleAwareRoutingIntegration.find({
      map,
      startPosition: current,
      targetPosition: route.targetPosition,
      classificationSource,
      blockedCellSource
    });

    return Object.freeze({
      rerouted: true,
      validity,
      route: replacement
    });
  }
}
