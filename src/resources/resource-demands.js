import { Store } from '../runtime/store.js';
import { StableIdAllocator, parseStableId } from '../world/stable-id.js';

const DEMAND_STATES = Object.freeze(['OPEN', 'PARTIAL', 'RESERVED', 'FULFILLED', 'CANCELLED']);

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
  if (!Number.isSafeInteger(n) || n < 1) throw new TypeError('demand amount must be a positive safe integer');
  return n;
}

function asStableRef(value, name, expectedKind = null) {
  const id = String(value || '').trim();
  const parsed = parseStableId(id);
  if (!parsed) throw new TypeError(`${name} requires stable id: ${value}`);
  if (expectedKind && parsed.kind !== expectedKind) throw new TypeError(`${name} requires ${expectedKind} id: ${value}`);
  return id;
}

export class ResourceDemands {
  #resourceState;
  #claims;
  #store;
  #ids;

  constructor({ resourceState, claims }) {
    if (!resourceState || typeof resourceState.getDefinition !== 'function') {
      throw new TypeError('ResourceState-compatible instance required');
    }
    if (!claims || typeof claims.reserve !== 'function' || typeof claims.ids !== 'function') {
      throw new TypeError('ResourceClaims-compatible instance required');
    }
    this.#resourceState = resourceState;
    this.#claims = claims;
    this.#store = new Store('resource.demands', { revision: 0, items: {} });
    this.#ids = new StableIdAllocator();
  }

  static get states() { return DEMAND_STATES; }

  create({ consumerId, definitionId, amount, metadata = {} } = {}, { id = null } = {}) {
    const consumer = asStableRef(consumerId, 'consumerId');
    const definition = asStableRef(definitionId, 'definitionId', 'resource-type');
    if (!this.#resourceState.getDefinition(definition)) {
      throw new TypeError(`unknown resource definition id: ${definition}`);
    }
    const targetAmount = asPositiveAmount(amount);
    const demandId = id ?? this.#ids.next('demand');
    const parsed = parseStableId(demandId);
    if (!parsed || parsed.kind !== 'demand') throw new TypeError(`invalid demand id: ${demandId}`);
    if (this.get(demandId)) throw new Error(`duplicate demand id: ${demandId}`);
    this.#ids.reserve(demandId);

    this.#store.update(draft => {
      draft.items[demandId] = {
        id: demandId,
        kind: 'demand',
        consumerId: consumer,
        definitionId: definition,
        targetAmount,
        state: 'OPEN',
        metadata: clone(metadata || {})
      };
      draft.revision += 1;
    });
    return this.get(demandId);
  }

  get(id) {
    const item = this.#store.snapshot().items[id];
    if (!item) return null;
    return deepFreeze({ ...clone(item), ...this.progress(id) });
  }

  ids() {
    return Object.freeze(Object.keys(this.#store.snapshot().items).sort());
  }

  claimsFor(demandId) {
    this.#requireDemandRecord(demandId);
    return Object.freeze(this.#claims.ids()
      .map(id => this.#claims.get(id))
      .filter(claim => claim.demandId === demandId));
  }

  progress(demandId) {
    const demand = this.#requireDemandRecord(demandId);
    const claims = this.#claims.ids()
      .map(id => this.#claims.get(id))
      .filter(claim => claim.demandId === demandId);
    const reservedAmount = claims
      .filter(claim => claim.state === 'ACTIVE')
      .reduce((sum, claim) => sum + claim.amount, 0);
    const fulfilledAmount = claims
      .filter(claim => claim.state === 'CONSUMED')
      .reduce((sum, claim) => sum + claim.amount, 0);
    const remainingAmount = Math.max(0, demand.targetAmount - reservedAmount - fulfilledAmount);
    return deepFreeze({
      reservedAmount,
      fulfilledAmount,
      remainingAmount,
      status: this.#deriveStatus(demand, reservedAmount, fulfilledAmount, remainingAmount)
    });
  }

  reserve({ demandId, resourceId, amount, metadata = {} } = {}) {
    const demand = this.#requireDemandRecord(demandId);
    if (demand.state === 'CANCELLED') throw new Error(`cancelled demand cannot reserve resources: ${demandId}`);
    const resource = this.#resourceState.get(resourceId);
    if (!resource) throw new TypeError(`unknown resource id: ${resourceId}`);
    if (resource.definitionId !== demand.definitionId) {
      throw new Error(`resource definition does not satisfy demand: ${resource.definitionId} != ${demand.definitionId}`);
    }
    const qty = asPositiveAmount(amount);
    const remaining = this.progress(demandId).remainingAmount;
    if (qty > remaining) throw new Error(`claim exceeds remaining demand: requested ${qty}, remaining ${remaining}`);

    const claim = this.#claims.reserve({
      resourceId,
      amount: qty,
      consumerId: demand.consumerId,
      demandId,
      metadata: clone(metadata || {})
    });
    this.#touch(demandId);
    return claim;
  }

  releaseClaim(claimId) {
    const claim = this.#claims.get(claimId);
    if (!claim || !claim.demandId) throw new TypeError(`claim is not linked to a demand: ${claimId}`);
    const result = this.#claims.release(claimId);
    this.#touch(claim.demandId);
    return result;
  }

  consumeClaim(claimId) {
    const claim = this.#claims.get(claimId);
    if (!claim || !claim.demandId) throw new TypeError(`claim is not linked to a demand: ${claimId}`);
    const result = this.#claims.consume(claimId);
    this.#touch(claim.demandId);
    return result;
  }

  cancel(demandId) {
    const demand = this.#requireDemandRecord(demandId);
    if (demand.state === 'CANCELLED') return this.get(demandId);
    if (this.progress(demandId).fulfilledAmount > 0) throw new Error(`fulfilled demand cannot be cancelled: ${demandId}`);
    for (const claim of this.claimsFor(demandId)) {
      if (claim.state === 'ACTIVE') this.#claims.release(claim.id);
    }
    this.#store.update(draft => {
      draft.items[demandId].state = 'CANCELLED';
      draft.revision += 1;
    });
    return this.get(demandId);
  }

  snapshot() {
    const items = {};
    for (const id of this.ids()) items[id] = this.get(id);
    return deepFreeze({ revision: this.#store.snapshot().revision, items });
  }

  #deriveStatus(demand, reserved, fulfilled, remaining) {
    if (demand.state === 'CANCELLED') return 'CANCELLED';
    if (fulfilled >= demand.targetAmount) return 'FULFILLED';
    if (remaining === 0 && reserved > 0) return 'RESERVED';
    if (reserved > 0 || fulfilled > 0) return 'PARTIAL';
    return 'OPEN';
  }

  #touch(demandId) {
    this.#store.update(draft => {
      draft.items[demandId].state = this.progress(demandId).status;
      draft.revision += 1;
    });
  }

  #requireDemandRecord(demandId) {
    const item = this.#store.snapshot().items[demandId];
    if (!item) throw new TypeError(`unknown demand id: ${demandId}`);
    return clone(item);
  }
}
