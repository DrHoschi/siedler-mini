const ROUTE_VALIDITY_STATES = Object.freeze(['VALID','STALE','INVALID']);

function normalizeState(value) {
  const state = String(value ?? 'VALID').trim().toUpperCase();
  if (!ROUTE_VALIDITY_STATES.includes(state)) throw new TypeError(`invalid route validity state: ${value}`);
  return state;
}

export class RouteValidityContract {
  static get states() { return ROUTE_VALIDITY_STATES; }

  static define({state='VALID'}={}) {
    const normalized = normalizeState(state);
    return Object.freeze({
      kind:'route-validity',
      state:normalized,
      usable:normalized==='VALID',
      requiresEvaluation:normalized==='STALE',
      invalid:normalized==='INVALID'
    });
  }
}
