const STATES = Object.freeze(['READY','WAITING']);
const REASONS = Object.freeze(['OCCUPIED','ARBITRATION_LOST']);

function asUnitId(value) {
  const id = String(value ?? '').trim();
  if (!/^unit:\d{8}$/.test(id)) throw new TypeError(`carrierId requires unit stable id: ${value}`);
  return id;
}

function asCell(value) {
  if (!value || !Number.isInteger(value.x) || !Number.isInteger(value.y)) {
    throw new TypeError('nextCell requires integer x/y');
  }
  return Object.freeze({ x:value.x, y:value.y });
}

function normalizeState(value) {
  const state = String(value ?? 'READY').trim().toUpperCase();
  if (!STATES.includes(state)) throw new TypeError(`unknown waiting state: ${value}`);
  return state;
}

function normalizeReason(value) {
  const reason = String(value ?? '').trim().toUpperCase();
  if (!REASONS.includes(reason)) throw new TypeError(`unknown waiting reason: ${value}`);
  return reason;
}

export class CarrierWaitingStateContract {
  static get states() { return STATES; }
  static get reasons() { return REASONS; }

  static define({ carrierId, state='READY', reason=null, nextCell=null } = {}) {
    const normalizedCarrierId = asUnitId(carrierId);
    const normalizedState = normalizeState(state);

    if (normalizedState === 'READY') {
      if (reason !== null || nextCell !== null) throw new TypeError('READY requires reason=null and nextCell=null');
      return Object.freeze({ kind:'carrier-waiting-state', carrierId:normalizedCarrierId, state:'READY', reason:null, nextCell:null });
    }

    if (reason === null) throw new TypeError('WAITING requires reason');
    if (nextCell === null) throw new TypeError('WAITING requires nextCell');
    return Object.freeze({
      kind:'carrier-waiting-state',
      carrierId:normalizedCarrierId,
      state:'WAITING',
      reason:normalizeReason(reason),
      nextCell:asCell(nextCell)
    });
  }
}
