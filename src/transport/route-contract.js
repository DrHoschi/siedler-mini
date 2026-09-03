const ROUTE_STATES = Object.freeze(['DEFINED', 'ACTIVE', 'COMPLETED']);

function deepFreeze(value) {
  if (value == null || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function normalizeState(value) {
  const state = String(value || '').trim().toUpperCase();
  if (!ROUTE_STATES.includes(state)) throw new TypeError(`invalid route state: ${value}`);
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

function normalizeWaypoints(value) {
  if (!Array.isArray(value)) throw new TypeError('waypoints must be an ordered array');
  return deepFreeze(value.map((waypoint, index) => normalizePosition(waypoint, `waypoints[${index}]`)));
}

function samePosition(a, b) {
  return a.x === b.x && a.y === b.y;
}

export class RouteContract {
  static get states() { return ROUTE_STATES; }

  static define({ startPosition, targetPosition, waypoints = [], state = 'DEFINED' } = {}) {
    const start = normalizePosition(startPosition, 'startPosition');
    const target = normalizePosition(targetPosition, 'targetPosition');

    if (samePosition(start, target)) {
      throw new Error('route targetPosition must differ from startPosition');
    }

    return deepFreeze({
      kind: 'route',
      state: normalizeState(state),
      startPosition: start,
      targetPosition: target,
      waypoints: normalizeWaypoints(waypoints)
    });
  }
}
