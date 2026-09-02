function clone(value) {
  return value == null ? value : structuredClone(value);
}

function deepFreeze(value) {
  if (value == null || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function asPositiveAmount(value, name = 'amount') {
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n < 1) throw new TypeError(`${name} must be a positive safe integer`);
  return n;
}

const ASSIGNMENT_SOURCE = 'CR-03B_MATCH_PROPOSAL';

export class ResourceAssignment {
  #resourceState;
  #claims;
  #demands;

  constructor({ resourceState, claims, demands }) {
    if (!resourceState || typeof resourceState.get !== 'function') {
      throw new TypeError('ResourceState-compatible instance required');
    }
    if (!claims || typeof claims.availableAmount !== 'function' || typeof claims.ids !== 'function') {
      throw new TypeError('ResourceClaims-compatible instance required');
    }
    if (!demands || typeof demands.get !== 'function' || typeof demands.reserve !== 'function') {
      throw new TypeError('ResourceDemands-compatible instance required');
    }
    this.#resourceState = resourceState;
    this.#claims = claims;
    this.#demands = demands;
  }

  static get source() { return ASSIGNMENT_SOURCE; }

  assignMatch(match) {
    const plan = this.#preflightMatches([match]);
    return this.#commit(plan)[0];
  }

  assignBatch(batch) {
    if (!batch || !Array.isArray(batch.matches)) throw new TypeError('matching batch with matches required');
    const plan = this.#preflightMatches(batch.matches);
    const assignments = this.#commit(plan);
    return deepFreeze({
      source: ASSIGNMENT_SOURCE,
      assignmentCount: assignments.length,
      claimCount: assignments.reduce((sum, item) => sum + item.claims.length, 0),
      assignments
    });
  }

  #preflightMatches(matches) {
    const resourceAvailability = new Map();
    const demandRemaining = new Map();
    const seenDemands = new Set();
    const plan = [];

    for (const rawMatch of matches) {
      const match = clone(rawMatch);
      if (!match || typeof match.demandId !== 'string' || !Array.isArray(match.selections)) {
        throw new TypeError('invalid match proposal');
      }
      if (seenDemands.has(match.demandId)) throw new Error(`duplicate demand assignment: ${match.demandId}`);
      seenDemands.add(match.demandId);

      const demand = this.#demands.get(match.demandId);
      if (!demand) throw new TypeError(`unknown demand id: ${match.demandId}`);
      if (!['OPEN', 'PARTIAL'].includes(demand.status) || demand.remainingAmount <= 0) {
        throw new Error(`demand is not assignable: ${match.demandId}`);
      }
      if (match.consumerId !== demand.consumerId) throw new Error(`stale match consumer: ${match.demandId}`);
      if (match.definitionId !== demand.definitionId) throw new Error(`stale match resource definition: ${match.demandId}`);
      if (match.requestedAmount !== demand.remainingAmount) {
        throw new Error(`stale match demand amount: proposed ${match.requestedAmount}, remaining ${demand.remainingAmount}`);
      }

      let remaining = demandRemaining.has(match.demandId)
        ? demandRemaining.get(match.demandId)
        : demand.remainingAmount;
      let selectedAmount = 0;
      const selections = [];

      for (const selection of match.selections) {
        if (!selection || typeof selection.resourceId !== 'string') throw new TypeError('invalid resource selection');
        const qty = asPositiveAmount(selection.amount, 'selection amount');
        const resource = this.#resourceState.get(selection.resourceId);
        if (!resource) throw new TypeError(`unknown resource id: ${selection.resourceId}`);
        if (resource.definitionId !== demand.definitionId) {
          throw new Error(`resource definition does not satisfy demand: ${selection.resourceId}`);
        }
        if (resource.state === 'CONSUMED') throw new Error(`resource already consumed: ${selection.resourceId}`);

        const available = resourceAvailability.has(selection.resourceId)
          ? resourceAvailability.get(selection.resourceId)
          : this.#claims.availableAmount(selection.resourceId);
        if (qty > available) {
          throw new Error(`stale match resource amount: ${selection.resourceId} requested ${qty}, available ${available}`);
        }
        if (qty > remaining) {
          throw new Error(`assignment exceeds remaining demand: ${match.demandId}`);
        }

        resourceAvailability.set(selection.resourceId, available - qty);
        remaining -= qty;
        selectedAmount += qty;
        selections.push({ resourceId: selection.resourceId, amount: qty });
      }

      if (selectedAmount !== match.matchedAmount) {
        throw new Error(`match amount mismatch: proposed ${match.matchedAmount}, selected ${selectedAmount}`);
      }
      if (match.unmatchedAmount !== match.requestedAmount - selectedAmount) {
        throw new Error(`match unmatched amount mismatch: ${match.demandId}`);
      }
      demandRemaining.set(match.demandId, remaining);
      plan.push({
        demandId: match.demandId,
        consumerId: demand.consumerId,
        definitionId: demand.definitionId,
        selections
      });
    }

    return plan;
  }

  #commit(plan) {
    const assignments = [];
    for (const item of plan) {
      const claims = item.selections.map(selection => this.#demands.reserve({
        demandId: item.demandId,
        resourceId: selection.resourceId,
        amount: selection.amount,
        metadata: { source: ASSIGNMENT_SOURCE }
      }));
      const demand = this.#demands.get(item.demandId);
      assignments.push(deepFreeze({
        demandId: item.demandId,
        consumerId: item.consumerId,
        definitionId: item.definitionId,
        assignedAmount: claims.reduce((sum, claim) => sum + claim.amount, 0),
        claimIds: claims.map(claim => claim.id),
        claims,
        demandStatus: demand.status,
        remainingAmount: demand.remainingAmount
      }));
    }
    return Object.freeze(assignments);
  }
}
