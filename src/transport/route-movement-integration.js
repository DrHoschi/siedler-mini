import { CarrierMovementContract } from './carrier-movement-contract.js';
import { DirectTargetMovementExecution } from './direct-target-movement-execution.js';
import { RouteContract } from './route-contract.js';

const ARRIVAL_EPSILON = 1e-9;

function samePosition(a, b) {
  return Math.abs(a.x - b.x) <= ARRIVAL_EPSILON && Math.abs(a.y - b.y) <= ARRIVAL_EPSILON;
}

function routeTargets(route) {
  return Object.freeze([...route.waypoints, route.targetPosition]);
}

function validate(route, movement) {
  const currentRoute = RouteContract.define(route);
  const currentMovement = CarrierMovementContract.define(movement);
  if (!samePosition(currentMovement.currentPosition, currentRoute.startPosition) && currentRoute.state === 'DEFINED') {
    throw new Error('DEFINED route requires carrier at route startPosition');
  }
  return { route: currentRoute, movement: currentMovement };
}

function routeTargetIndex(targets, position) {
  return targets.findIndex((target) => samePosition(target, position));
}

function nextTarget(route, movement) {
  const targets = routeTargets(route);

  if (samePosition(movement.currentPosition, route.targetPosition)) return null;

  if (movement.state === 'MOVING' && movement.targetPosition !== null) {
    const activeTargetIndex = routeTargetIndex(targets, movement.targetPosition);
    if (activeTargetIndex < 0) {
      throw new Error('MOVING route movement target must belong to route targets');
    }
    if (!samePosition(movement.currentPosition, movement.targetPosition)) {
      return targets[activeTargetIndex];
    }
  }

  if (samePosition(movement.currentPosition, route.startPosition)) {
    return targets[0] || null;
  }

  const reachedTargetIndex = routeTargetIndex(targets, movement.currentPosition);
  if (reachedTargetIndex >= 0) {
    return targets[reachedTargetIndex + 1] || null;
  }

  throw new Error('route movement can only resume from route start, reached route point, or active segment');
}

export class RouteMovementIntegration {
  static bind({ route, movement } = {}) {
    const pair = validate(route, movement);
    const target = nextTarget(pair.route, pair.movement);
    if (target === null) {
      return CarrierMovementContract.define({
        unitId: pair.movement.unitId,
        currentPosition: pair.route.targetPosition,
        state: 'IDLE',
        targetPosition: null
      });
    }
    return CarrierMovementContract.define({
      unitId: pair.movement.unitId,
      currentPosition: pair.movement.currentPosition,
      state: 'MOVING',
      targetPosition: target
    });
  }

  static advance({ route, movement, maxDistance } = {}) {
    const pair = validate(route, movement);
    let current = pair.movement;
    let remaining = Number(maxDistance);
    if (!Number.isFinite(remaining) || !(remaining > 0)) throw new TypeError('maxDistance must be a finite number > 0');

    while (remaining > 0) {
      const target = nextTarget(pair.route, current);
      if (target === null) {
        return CarrierMovementContract.define({unitId:current.unitId,currentPosition:pair.route.targetPosition,state:'IDLE',targetPosition:null});
      }
      const distance = Math.hypot(target.x-current.currentPosition.x,target.y-current.currentPosition.y);
      const bound = CarrierMovementContract.define({unitId:current.unitId,currentPosition:current.currentPosition,state:'MOVING',targetPosition:target});
      current = DirectTargetMovementExecution.advance(bound, remaining);
      if (remaining < distance) return current;
      remaining -= distance;
      if (samePosition(current.currentPosition, pair.route.targetPosition)) {
        return CarrierMovementContract.define({unitId:current.unitId,currentPosition:pair.route.targetPosition,state:'IDLE',targetPosition:null});
      }
    }
    return current;
  }

  static assertArrived({ route, movement } = {}) {
    const pair = validate(route, movement);
    if (pair.movement.state !== 'IDLE' || pair.movement.targetPosition !== null || !samePosition(pair.movement.currentPosition, pair.route.targetPosition)) {
      throw new Error('route arrival blocked until carrier reaches route targetPosition');
    }
    return Object.freeze({kind:'route-arrival-gate',unitId:pair.movement.unitId,targetPosition:pair.route.targetPosition});
  }
}
