const STATES = Object.freeze(['REQUESTED','GRANTED','CONSUMED','EXPIRED','RELEASED']);
const ACTIVE_STATES = Object.freeze(['REQUESTED','GRANTED']);
const TERMINAL_STATES = Object.freeze(['CONSUMED','EXPIRED','RELEASED']);
const TRANSITIONS = Object.freeze({
  REQUESTED:Object.freeze(['GRANTED','RELEASED']),
  GRANTED:Object.freeze(['CONSUMED','EXPIRED','RELEASED']),
  CONSUMED:Object.freeze([]),
  EXPIRED:Object.freeze([]),
  RELEASED:Object.freeze([])
});

function normalizeStatus(value) {
  const status = String(value ?? '').trim().toUpperCase();
  if (!STATES.includes(status)) throw new TypeError(`unknown reservation lifecycle status: ${value}`);
  return status;
}

function asReservation(value) {
  if (!value || value.kind !== 'cell-reservation') throw new TypeError('reservation must be a cell-reservation contract');
  if (!/^unit:\d{8}$/.test(String(value.carrierId ?? ''))) throw new TypeError('reservation.carrierId requires unit stable id');
  if (!value.cell || !Number.isSafeInteger(value.cell.x) || !Number.isSafeInteger(value.cell.y)) throw new TypeError('reservation.cell requires safe integer x/y');
  if (!Number.isSafeInteger(value.validFromStep) || value.validFromStep < 0) throw new TypeError('reservation.validFromStep must be a non-negative safe integer');
  if (!Number.isSafeInteger(value.validUntilStep) || value.validUntilStep < value.validFromStep) throw new TypeError('reservation.validUntilStep must be >= validFromStep');
  if (value.status !== 'REQUESTED') throw new TypeError('CR-20A source reservation must preserve frozen CR-19 REQUESTED status');
  return value;
}

function snapshot(reservation,status) {
  return Object.freeze({
    kind:'reservation-lifecycle-state',
    reservation,
    carrierId:reservation.carrierId,
    cell:reservation.cell,
    validFromStep:reservation.validFromStep,
    validUntilStep:reservation.validUntilStep,
    status
  });
}

export class ReservationLifecycleStateContract {
  static get states() { return STATES; }
  static get activeStates() { return ACTIVE_STATES; }
  static get terminalStates() { return TERMINAL_STATES; }

  static define({ reservation, status='REQUESTED' } = {}) {
    return snapshot(asReservation(reservation), normalizeStatus(status));
  }

  static isActive(value) {
    const status = normalizeStatus(typeof value === 'string' ? value : value?.status);
    return ACTIVE_STATES.includes(status);
  }

  static isTerminal(value) {
    const status = normalizeStatus(typeof value === 'string' ? value : value?.status);
    return TERMINAL_STATES.includes(status);
  }

  static canTransition(fromStatus,toStatus) {
    const from = normalizeStatus(fromStatus);
    const to = normalizeStatus(toStatus);
    return TRANSITIONS[from].includes(to);
  }

  static transition(state,toStatus) {
    if (!state || state.kind !== 'reservation-lifecycle-state') throw new TypeError('state must be a reservation lifecycle state');
    const from = normalizeStatus(state.status);
    const to = normalizeStatus(toStatus);
    if (!TRANSITIONS[from].includes(to)) throw new TypeError(`invalid reservation lifecycle transition: ${from} -> ${to}`);
    return snapshot(asReservation(state.reservation), to);
  }
}
