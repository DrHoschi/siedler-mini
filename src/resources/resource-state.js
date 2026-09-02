import { Store } from '../runtime/store.js';
import { StableIdAllocator, parseStableId } from '../world/stable-id.js';

const RESOURCE_STATES = Object.freeze(['AVAILABLE', 'RESERVED', 'CONSUMED']);
const LOCATION_KINDS = Object.freeze(['cell', 'owner', 'none']);

function clone(value) {
  return value == null ? value : structuredClone(value);
}

function deepFreeze(value) {
  if (value == null || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function asPositiveAmount(value) {
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n < 1) throw new TypeError('resource amount must be a positive safe integer');
  return n;
}

function normalizeTechnicalName(value) {
  const name = String(value || '').trim();
  if (!/^[a-z][a-z0-9._-]*$/.test(name)) throw new TypeError(`invalid resource technicalName: ${value}`);
  return name;
}

function normalizeState(value) {
  const state = String(value || '').trim().toUpperCase();
  if (!RESOURCE_STATES.includes(state)) throw new TypeError(`invalid resource state: ${value}`);
  return state;
}

function normalizeLocation(value) {
  if (value == null) return Object.freeze({ kind: 'none', refId: null });
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError('resource location must be object or null');
  const kind = String(value.kind || '').trim().toLowerCase();
  if (!LOCATION_KINDS.includes(kind)) throw new TypeError(`invalid resource location kind: ${value.kind}`);
  if (kind === 'none') return Object.freeze({ kind, refId: null });
  const refId = String(value.refId || '').trim();
  if (!refId || !parseStableId(refId)) throw new TypeError(`resource location requires stable refId: ${value.refId}`);
  return Object.freeze({ kind, refId });
}

function normalizeOwnerId(value) {
  if (value == null || value === '') return null;
  const id = String(value).trim();
  if (!parseStableId(id)) throw new TypeError(`resource owner requires stable id: ${value}`);
  return id;
}

export class ResourceState {
  #world;
  #resources;
  #definitions;
  #definitionIds;

  constructor({ world, resourceStore }) {
    if (!world || typeof world.get !== 'function' || typeof world.snapshot !== 'function') {
      throw new TypeError('WorldStore-compatible world required');
    }
    if (!resourceStore || resourceStore.kind !== 'resource' || typeof resourceStore.create !== 'function') {
      throw new TypeError('resource DomainStore required');
    }
    this.#world = world;
    this.#resources = resourceStore;
    this.#definitions = new Store('resource.definitions', { revision: 0, items: {} });
    this.#definitionIds = new StableIdAllocator();
  }

  static get states() { return RESOURCE_STATES; }
  static get locationKinds() { return LOCATION_KINDS; }

  createDefinition({ technicalName, label = '', metadata = {} } = {}, { id = null } = {}) {
    const definitionId = id ?? this.#definitionIds.next('resource-type');
    const parsed = parseStableId(definitionId);
    if (!parsed || parsed.kind !== 'resource-type') throw new TypeError(`invalid resource definition id: ${definitionId}`);
    if (this.getDefinition(definitionId)) throw new Error(`duplicate resource definition id: ${definitionId}`);
    this.#definitionIds.reserve(definitionId);

    const definition = deepFreeze({
      id: definitionId,
      kind: 'resource-type',
      technicalName: normalizeTechnicalName(technicalName),
      label: String(label || ''),
      metadata: clone(metadata || {})
    });

    this.#definitions.update(draft => {
      draft.items[definitionId] = clone(definition);
      draft.revision += 1;
    });
    return this.getDefinition(definitionId);
  }

  getDefinition(id) {
    const item = this.#definitions.snapshot().items[id];
    return item ? deepFreeze(clone(item)) : null;
  }

  definitionIds() {
    return Object.freeze(Object.keys(this.#definitions.snapshot().items).sort());
  }

  createResource({ definitionId, amount = 1, state = 'AVAILABLE', location = null, ownerId = null, metadata = {} } = {}, { id = null } = {}) {
    const definition = this.getDefinition(definitionId);
    if (!definition) throw new TypeError(`unknown resource definition id: ${definitionId}`);
    const normalizedLocation = normalizeLocation(location);
    const normalizedOwnerId = normalizeOwnerId(ownerId);
    this.#assertReference(normalizedLocation.refId);
    this.#assertReference(normalizedOwnerId);

    return this.#resources.create({
      definitionId: definition.id,
      amount: asPositiveAmount(amount),
      state: normalizeState(state),
      location: clone(normalizedLocation),
      ownerId: normalizedOwnerId,
      metadata: clone(metadata || {})
    }, { id });
  }

  get(id) { return this.#resources.get(id); }
  ids() { return this.#resources.ids(); }

  setAmount(id, amount) {
    return this.#resources.update(id, draft => {
      draft.amount = asPositiveAmount(amount);
    });
  }

  setState(id, state) {
    return this.#resources.update(id, draft => {
      draft.state = normalizeState(state);
    });
  }

  relocate(id, location, ownerId = undefined) {
    const normalizedLocation = normalizeLocation(location);
    this.#assertReference(normalizedLocation.refId);
    const normalizedOwnerId = ownerId === undefined ? undefined : normalizeOwnerId(ownerId);
    if (normalizedOwnerId !== undefined) this.#assertReference(normalizedOwnerId);

    return this.#resources.update(id, draft => {
      draft.location = clone(normalizedLocation);
      if (normalizedOwnerId !== undefined) draft.ownerId = normalizedOwnerId;
    });
  }

  snapshot() {
    return deepFreeze({
      definitions: this.#definitions.snapshot(),
      resources: this.#resources.snapshot()
    });
  }

  #assertReference(refId) {
    if (!refId) return;
    if (refId === this.#world.worldId) return;
    if (this.#world.get(refId)) return;
    throw new TypeError(`unknown resource reference id: ${refId}`);
  }
}
