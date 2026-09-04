import { ReservationLifecycleStateContract } from './reservation-lifecycle-state-contract.js';

function asStep(value) {
  const step = Number(value);
  if (!Number.isSafeInteger(step) || step < 0) throw new TypeError('currentStep must be a non-negative safe integer');
  return step;
}

function asLifecycleState(value) {
  if (!value || value.kind !== 'reservation-lifecycle-state') throw new TypeError('state must be a reservation lifecycle state');
  if (!ReservationLifecycleStateContract.states.includes(value.status)) throw new TypeError(`unknown reservation lifecycle status: ${value.status}`);
  return value;
}

export class ReservationExpiryPolicy {
  static evaluate(state,currentStep) {
    const lifecycle = asLifecycleState(state);
    const step = asStep(currentStep);
    if (lifecycle.status !== 'GRANTED') return lifecycle;
    if (step <= lifecycle.validUntilStep) return lifecycle;
    return ReservationLifecycleStateContract.transition(lifecycle,'EXPIRED');
  }

  static isExpiredAt(state,currentStep) {
    return ReservationExpiryPolicy.evaluate(state,currentStep).status === 'EXPIRED';
  }
}
