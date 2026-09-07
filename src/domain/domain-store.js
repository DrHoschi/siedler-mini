import { Store } from '../runtime/store.js';
import { StableIdAllocator, parseStableId } from '../world/stable-id.js';

function clone(value) {
  return value == null ? value : structuredClone(value);
}

function deepFreeze(value) {
  if (value == null || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function requireRestoreState(state, kind) {
  if (!state || typeof state !== 'object' || Array.isArray(state)) throw new TypeError('restore domain state required');
  if (!Number.isSafeInteger(state.revision) || state.revision < 0) throw new TypeError('invalid domain revision');
  if (!state.items || typeof state.items !== 'object' || Array.isArray(state.items)) throw new TypeError('invalid domain items');
  const next = clone(state);
  for (const [id, item] of Object.entries(next.items)) {
    const parsed = parseStableId(id);
    if (!parsed || parsed.kind !== kind) throw new TypeError(`invalid ${kind} id: ${id}`);
    if (!item || typeof item !== 'object' || Array.isArray(item)) throw new TypeError(`invalid ${kind} item: ${id}`);
    if (item.id !== id) throw new Error(`${kind} item id/key mismatch: ${id}`);
    if (item.kind !== kind) throw new Error(`${kind} item kind mismatch: ${id}`);
  }
  return next;
}

export class DomainStore {
  #domain;
  #kind;
  #store;
  #ids;

  constructor(domain, kind, { allocator = null, restoreState = null } = {}) {
    if (!domain) throw new TypeError('domain required');
    if (!kind) throw new TypeError('kind required');
    this.#domain = String(domain);
    this.#kind = String(kind);
    this.#ids = allocator instanceof StableIdAllocator ? allocator : new StableIdAllocator();
    this.#store = new Store(
      `domain.${this.#domain}`,
      restoreState == null ? { revision: 0, items: {} } : requireRestoreState(restoreState, this.#kind),
    );
  }

  get domain() { return this.#domain; }
  get kind() { return this.#kind; }
  get size() { return Object.keys(this.#store.snapshot().items).length; }

  allocateId() { return this.#ids.next(this.#kind); }

  has(id) {
    return Object.prototype.hasOwnProperty.call(this.#store.snapshot().items, id);
  }

  get(id) {
    const item = this.#store.snapshot().items[id];
    return item ? deepFreeze(clone(item)) : null;
  }

  create(data = {}, { id = null } = {}) {
    const itemId = id ?? this.allocateId();
    const parsed = parseStableId(itemId);
    if (!parsed || parsed.kind !== this.#kind) throw new TypeError(`invalid ${this.#kind} id: ${itemId}`);
    if (this.has(itemId)) throw new Error(`duplicate ${this.#kind} id: ${itemId}`);
    this.#ids.reserve(itemId);
    const item = { ...clone(data), id: itemId, kind: this.#kind };
    this.#store.update(draft => {
      draft.items[itemId] = item;
      draft.revision += 1;
    });
    return this.get(itemId);
  }

  update(id, mutator) {
    if (typeof mutator !== 'function') throw new TypeError('mutator must be function');
    if (!this.has(id)) throw new Error(`unknown ${this.#kind} id: ${id}`);
    this.#store.update(draft => {
      const before = draft.items[id];
      const next = clone(before);
      mutator(next);
      if (next.id !== id) throw new Error('item id is immutable');
      if (next.kind !== this.#kind) throw new Error('item kind is immutable');
      draft.items[id] = next;
      draft.revision += 1;
    });
    return this.get(id);
  }

  remove(id) {
    if (!this.has(id)) return false;
    this.#store.update(draft => {
      delete draft.items[id];
      draft.revision += 1;
    });
    return true;
  }

  ids() { return Object.freeze(Object.keys(this.#store.snapshot().items).sort()); }
  snapshot() { return this.#store.snapshot(); }
  idSnapshot() { return this.#ids.snapshot(); }
}
