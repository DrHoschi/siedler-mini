import { Store } from '../runtime/store.js';
import { StableIdAllocator, parseStableId } from './stable-id.js';

function clone(value) {
  return value == null ? value : structuredClone(value);
}

function deepFreeze(value) {
  if (value == null || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function normalizeEntity(entity) {
  if (!entity || typeof entity !== 'object' || Array.isArray(entity)) {
    throw new TypeError('entity must be an object');
  }
  const next = clone(entity);
  if (!next.id || !parseStableId(next.id)) throw new TypeError(`entity requires valid stable id: ${next.id}`);
  if (!next.kind) throw new TypeError('entity kind required');
  return next;
}

export class WorldStore {
  #store;
  #ids;

  constructor({ worldId = 'world:00000001', allocator = null } = {}) {
    if (!parseStableId(worldId)) throw new TypeError(`invalid world id: ${worldId}`);
    this.#ids = allocator instanceof StableIdAllocator ? allocator : new StableIdAllocator();
    this.#ids.reserve(worldId);
    this.#store = new Store('world', {
      worldId,
      revision: 0,
      entities: {}
    });
  }

  get worldId() { return this.#store.snapshot().worldId; }

  allocateId(kind) {
    return this.#ids.next(kind);
  }

  has(id) {
    return Object.prototype.hasOwnProperty.call(this.#store.snapshot().entities, id);
  }

  get(id) {
    const entity = this.#store.snapshot().entities[id];
    return entity ? deepFreeze(clone(entity)) : null;
  }

  create(kind, data = {}, { id = null } = {}) {
    const entityId = id ?? this.allocateId(kind);
    if (!parseStableId(entityId)) throw new TypeError(`invalid stable id: ${entityId}`);
    if (this.has(entityId)) throw new Error(`duplicate entity id: ${entityId}`);

    this.#ids.reserve(entityId);
    const entity = normalizeEntity({ ...clone(data), id: entityId, kind });
    this.#store.update(draft => {
      draft.entities[entityId] = entity;
      draft.revision += 1;
    });
    return this.get(entityId);
  }

  put(entity) {
    const normalized = normalizeEntity(entity);
    if (this.has(normalized.id)) throw new Error(`duplicate entity id: ${normalized.id}`);
    this.#ids.reserve(normalized.id);
    this.#store.update(draft => {
      draft.entities[normalized.id] = normalized;
      draft.revision += 1;
    });
    return this.get(normalized.id);
  }

  update(id, mutator) {
    if (typeof mutator !== 'function') throw new TypeError('mutator must be function');
    if (!this.has(id)) throw new Error(`unknown entity id: ${id}`);

    this.#store.update(draft => {
      const before = draft.entities[id];
      const next = clone(before);
      mutator(next);
      if (next.id !== id) throw new Error('entity id is immutable');
      if (next.kind !== before.kind) throw new Error('entity kind is immutable');
      draft.entities[id] = normalizeEntity(next);
      draft.revision += 1;
    });
    return this.get(id);
  }

  remove(id) {
    if (!this.has(id)) return false;
    this.#store.update(draft => {
      delete draft.entities[id];
      draft.revision += 1;
    });
    return true;
  }

  ids() {
    return Object.freeze(Object.keys(this.#store.snapshot().entities).sort());
  }

  snapshot() {
    return this.#store.snapshot();
  }

  idSnapshot() {
    return this.#ids.snapshot();
  }
}
