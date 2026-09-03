import { parseStableId } from '../world/stable-id.js';

const MOVEMENT_STATES = Object.freeze(['IDLE', 'MOVING']);

function deepFreeze(value) {
  if (value == null || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function asUnitId(value) {
  const id = String(value || '').trim();
  const parsed = parseStableId(id);
  if (!parsed || parsed.kind !== 'unit') throw new TypeError(`unitId requires unit stable id: ${value}`);
  return id;
}

function normalizeState(value) {
  const state = String(value || '').trim().toUpperCase();
  if (!MOVEMENT_STATES.includes(state)) throw new TypeError(`invalid carrier movement state: ${value}`);
  return state;
}

function normalizePosition(value, name) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(`${name} must be a position object`);
  }
  const x = Number(value.x);
  const y = Number(value.y);
  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    throw new TypeError(`${name}.x and ${name}.y must be finite`);
  }
  return deepFreeze({ x, y });
}

function samePosition(a, b) {
  return a.x === b.x && a.y === b.y;
}

export class CarrierMovementContract {
  static get states() { return MOVEMENT_STATES; }

  static define({ unitId, currentPosition, state = 'IDLE', targetPosition = null } = {}) {
    const normalizedState = normalizeState(state);
    const current = normalizePosition(currentPosition, 'currentPosition');
    const target = targetPosition == null ? null : normalizePosition(targetPosition, 'targetPosition');

    if (normalizedState === 'IDLE' && target !== null) {
      throw new Error('IDLE carrier movement must not have a targetPosition');
    }
    if (normalizedState === 'MOVING' && target === null) {
      throw new Error('MOVING carrier movement requires exactly one targetPosition');
    }
    if (normalizedState === 'MOVING' && samePosition(current, target)) {
      throw new Error('MOVING carrier movement targetPosition must differ from currentPosition');
    }

    return deepFreeze({
      kind: 'carrier-movement',
      unitId: asUnitId(unitId),
      state: normalizedState,
      currentPosition: current,
      targetPosition: target
    });
  }
}
