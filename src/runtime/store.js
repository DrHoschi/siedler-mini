function clone(value) {
  return value == null ? value : structuredClone(value);
}

function deepFreeze(value) {
  if (value == null || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

export class Store {
  #name;
  #state;

  constructor(name, initialState = {}) {
    if (!name) throw new TypeError('store name required');
    this.#name = name;
    this.#state = clone(initialState);
  }

  get name() { return this.#name; }

  snapshot() {
    return deepFreeze(clone(this.#state));
  }

  replace(nextState) {
    this.#state = clone(nextState ?? {});
  }

  update(mutator) {
    if (typeof mutator !== 'function') throw new TypeError('mutator must be function');
    const draft = clone(this.#state);
    mutator(draft);
    this.#state = draft;
    return this.snapshot();
  }
}

export class StoreRegistry {
  #stores = new Map();

  register(store) {
    if (!(store instanceof Store)) throw new TypeError('Store instance required');
    if (this.#stores.has(store.name)) throw new Error(`duplicate store: ${store.name}`);
    this.#stores.set(store.name, store);
    return store;
  }

  get(name) { return this.#stores.get(name) ?? null; }
  names() { return Object.freeze([...this.#stores.keys()]); }
  snapshot() {
    const out = {};
    for (const [name, store] of this.#stores) out[name] = store.snapshot();
    return deepFreeze(out);
  }
}
