import { CarrierMovementContract } from './carrier-movement-contract.js';

function asPositiveDistance(value) {
  const distance = Number(value);
  if (!Number.isFinite(distance) || !(distance > 0)) {
    throw new TypeError('maxDistance must be a finite number > 0');
  }
  return distance;
}

function distanceBetween(a, b) {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

export class DirectTargetMovementExecution {
  static advance(movement, maxDistance) {
    const current = CarrierMovementContract.define(movement);
    const step = asPositiveDistance(maxDistance);

    if (current.state === 'IDLE') return current;

    const target = current.targetPosition;
    const remaining = distanceBetween(current.currentPosition, target);

    if (step >= remaining) {
      return CarrierMovementContract.define({
        unitId: current.unitId,
        currentPosition: target,
        state: 'IDLE',
        targetPosition: null
      });
    }

    const ratio = step / remaining;
    const nextPosition = {
      x: current.currentPosition.x + (target.x - current.currentPosition.x) * ratio,
      y: current.currentPosition.y + (target.y - current.currentPosition.y) * ratio
    };

    return CarrierMovementContract.define({
      unitId: current.unitId,
      currentPosition: nextPosition,
      state: 'MOVING',
      targetPosition: target
    });
  }
}
