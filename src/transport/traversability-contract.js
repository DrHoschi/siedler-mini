const TRAVERSABILITY_STATES = Object.freeze(['TRAVERSABLE', 'BLOCKED']);

function normalizeState(value) {
  const state = String(value ?? 'TRAVERSABLE').trim().toUpperCase();
  if (!TRAVERSABILITY_STATES.includes(state)) throw new TypeError(`invalid traversability state: ${value}`);
  return state;
}

export class TraversabilityContract {
  static get states() { return TRAVERSABILITY_STATES; }

  static define({ state = 'TRAVERSABLE' } = {}) {
    return Object.freeze({
      kind: 'traversability',
      state: normalizeState(state),
      traversable: normalizeState(state) === 'TRAVERSABLE'
    });
  }
}
