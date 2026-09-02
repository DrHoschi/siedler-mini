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

export class DomainStore {
  #domain;
  #kind;
  #store;
  #ids;

  constructor(domain, kind, { allocator = null } = {}) {
    if (!domain) throw new TypeError('domain required');
    if (!kind) throw new TypeError('kind required');
    this.#domain = String(domain);
    this.#kind = String(kind);
    this.#ids = allocator instanceof StableIdAllocator ? allocator : new StableIdAllocator();
    this.#store = new Store(`domain.${this.#domain}`, { revision: 0, items: {} });
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
