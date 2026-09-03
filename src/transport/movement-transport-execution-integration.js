import { CarrierMovementContract } from './carrier-movement-contract.js';
import { DirectTargetMovementExecution } from './direct-target-movement-execution.js';
import { TransportExecutionContract } from './transport-execution-contract.js';

const ARRIVAL_EPSILON = 1e-9;

function normalizePosition(value, name) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(`${name} must be a position object`);
  }
  const x = Number(value.x);
  const y = Number(value.y);
  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    throw new TypeError(`${name}.x and ${name}.y must be finite`);
  }
  return Object.freeze({ x, y });
}

function samePosition(a, b) {
  return Math.abs(a.x - b.x) <= ARRIVAL_EPSILON && Math.abs(a.y - b.y) <= ARRIVAL_EPSILON;
}

function expectedTarget(execution, pickupPosition, dropoffPosition) {
  if (execution.state === 'TO_PICKUP') return normalizePosition(pickupPosition, 'pickupPosition');
  if (execution.state === 'TO_DROPOFF') return normalizePosition(dropoffPosition, 'dropoffPosition');
  throw new Error(`movement target requires TO_PICKUP or TO_DROPOFF execution state: ${execution.state}`);
}

function validatePair(execution, movement) {
  const currentExecution = TransportExecutionContract.define(execution);
  const currentMovement = CarrierMovementContract.define(movement);
  if (currentExecution.unitId !== currentMovement.unitId) {
    throw new Error(`movement carrier mismatch: ${currentMovement.unitId} != ${currentExecution.unitId}`);
  }
  return { execution: currentExecution, movement: currentMovement };
}

export class MovementTransportExecutionIntegration {
  static movementForExecution({ execution, movement, pickupPosition, dropoffPosition } = {}) {
    const pair = validatePair(execution, movement);
    const target = expectedTarget(pair.execution, pickupPosition, dropoffPosition);

    if (samePosition(pair.movement.currentPosition, target)) {
      return CarrierMovementContract.define({
        unitId: pair.movement.unitId,
        currentPosition: target,
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

  static advance({ execution, movement, pickupPosition, dropoffPosition, maxDistance } = {}) {
    const bound = this.movementForExecution({ execution, movement, pickupPosition, dropoffPosition });
    return DirectTargetMovementExecution.advance(bound, maxDistance);
  }

  static assertArrived({ execution, movement, pickupPosition, dropoffPosition } = {}) {
    const pair = validatePair(execution, movement);
    const target = expectedTarget(pair.execution, pickupPosition, dropoffPosition);

    if (pair.movement.state !== 'IDLE' || pair.movement.targetPosition !== null) {
      throw new Error(`transport transition blocked until carrier arrival: ${pair.execution.state}`);
    }
    if (!samePosition(pair.movement.currentPosition, target)) {
      throw new Error(`transport transition blocked at wrong carrier position: ${pair.execution.state}`);
    }

    return Object.freeze({
      kind: 'movement-arrival-gate',
      jobId: pair.execution.jobId,
      unitId: pair.execution.unitId,
      executionState: pair.execution.state,
      expectedNextState: pair.execution.state === 'TO_PICKUP' ? 'PICKED_UP' : 'DELIVERED'
    });
  }

  static pickupAfterArrival({ pickupService, job, assignment, execution, resource, movement, pickupPosition, dropoffPosition } = {}) {
    if (!pickupService || typeof pickupService.pickup !== 'function') throw new TypeError('pickupService required');
    this.assertArrived({ execution, movement, pickupPosition, dropoffPosition });
    return pickupService.pickup({ job, assignment, execution, resource });
  }

  static deliverAfterArrival({ deliveryService, job, assignment, execution, cargo, movement, pickupPosition, dropoffPosition } = {}) {
    if (!deliveryService || typeof deliveryService.deliver !== 'function') throw new TypeError('deliveryService required');
    this.assertArrived({ execution, movement, pickupPosition, dropoffPosition });
    return deliveryService.deliver({ job, assignment, execution, cargo });
  }
}
