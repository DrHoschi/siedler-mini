import { Store } from '../runtime/store.js';
import { StableIdAllocator, parseStableId } from '../world/stable-id.js';

const CLAIM_STATES = Object.freeze(['ACTIVE', 'RELEASED', 'CONSUMED']);

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
  if (!Number.isSafeInteger(n) || n < 1) throw new TypeError('claim amount must be a positive safe integer');
  return n;
}

function asStableRef(value, name) {
  const id = String(value || '').trim();
  if (!parseStableId(id)) throw new TypeError(`${name} requires stable id: ${value}`);
  return id;
}

export class ResourceClaims {
  #resourceState;
  #store;
  #ids;

  constructor({ resourceState }) {
    if (!resourceState || typeof resourceState.get !== 'function' || typeof resourceState.setState !== 'function') {
      throw new TypeError('ResourceState-compatible instance required');
    }
    this.#resourceState = resourceState;
    this.#store = new Store('resource.claims', { revision: 0, items: {} });
    this.#ids = new StableIdAllocator();
  }

  static get states() { return CLAIM_STATES; }

  get(id) {
    const item = this.#store.snapshot().items[id];
    return item ? deepFreeze(clone(item)) : null;
  }

  ids() {
    return Object.freeze(Object.keys(this.#store.snapshot().items).sort());
  }

  activeClaimsFor(resourceId) {
    return Object.freeze(this.ids()
      .map(id => this.get(id))
      .filter(claim => claim.resourceId === resourceId && claim.state === 'ACTIVE'));
  }

  consumedClaimsFor(resourceId) {
    return Object.freeze(this.ids()
      .map(id => this.get(id))
      .filter(claim => claim.resourceId === resourceId && claim.state === 'CONSUMED'));
  }

  reservedAmount(resourceId) {
    return this.activeClaimsFor(resourceId).reduce((sum, claim) => sum + claim.amount, 0);
  }

  consumedAmount(resourceId) {
    return this.consumedClaimsFor(resourceId).reduce((sum, claim) => sum + claim.amount, 0);
  }

  availableAmount(resourceId) {
    const resource = this.#requireResource(resourceId);
    return Math.max(0, resource.amount - this.reservedAmount(resourceId) - this.consumedAmount(resourceId));
  }

  reserve({ resourceId, amount, consumerId, demandId = null, metadata = {} } = {}, { id = null } = {}) {
    const resource = this.#requireResource(resourceId);
    if (resource.state === 'CONSUMED') throw new Error(`resource already consumed: ${resourceId}`);

    const qty = asPositiveAmount(amount);
    const consumer = asStableRef(consumerId, 'consumerId');
    const demand = demandId == null ? null : asStableRef(demandId, 'demandId');
    const available = this.availableAmount(resourceId);
    if (qty > available) {
      throw new Error(`insufficient unclaimed resource amount: requested ${qty}, available ${available}`);
    }

    const claimId = id ?? this.#ids.next('claim');
    const parsed = parseStableId(claimId);
    if (!parsed || parsed.kind !== 'claim') throw new TypeError(`invalid claim id: ${claimId}`);
    if (this.get(claimId)) throw new Error(`duplicate claim id: ${claimId}`);
    this.#ids.reserve(claimId);

    const claim = {
      id: claimId,
      kind: 'claim',
      resourceId,
      amount: qty,
      consumerId: consumer,
      demandId: demand,
      state: 'ACTIVE',
      metadata: clone(metadata || {})
    };

    this.#store.update(draft => {
      draft.items[claimId] = claim;
      draft.revision += 1;
    });
    this.#syncResourceState(resourceId);
    return this.get(claimId);
  }

  release(claimId) {
    const claim = this.#requireClaim(claimId);
    if (claim.state === 'RELEASED') return claim;
    if (claim.state === 'CONSUMED') throw new Error(`consumed claim cannot be released: ${claimId}`);

    this.#store.update(draft => {
      draft.items[claimId].state = 'RELEASED';
      draft.revision += 1;
    });
    this.#syncResourceState(claim.resourceId);
    return this.get(claimId);
  }

  consume(claimId) {
    const claim = this.#requireClaim(claimId);
    if (claim.state === 'CONSUMED') return claim;
    if (claim.state === 'RELEASED') throw new Error(`released claim cannot be consumed: ${claimId}`);

    this.#store.update(draft => {
      draft.items[claimId].state = 'CONSUMED';
      draft.revision += 1;
    });
    this.#syncResourceState(claim.resourceId);
    return this.get(claimId);
  }

  snapshot() {
    return this.#store.snapshot();
  }

  #requireResource(resourceId) {
    const resource = this.#resourceState.get(resourceId);
    if (!resource) throw new TypeError(`unknown resource id: ${resourceId}`);
    return resource;
  }

  #requireClaim(claimId) {
    const claim = this.get(claimId);
    if (!claim) throw new TypeError(`unknown claim id: ${claimId}`);
    return claim;
  }

  #syncResourceState(resourceId) {
    const resource = this.#requireResource(resourceId);
    const consumed = this.consumedAmount(resourceId);
    const reserved = this.reservedAmount(resourceId);
    let next = 'AVAILABLE';
    if (consumed >= resource.amount) next = 'CONSUMED';
    else if (reserved > 0) next = 'RESERVED';
    this.#resourceState.setState(resourceId, next);
  }
}
