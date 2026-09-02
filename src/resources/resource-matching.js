function clone(value) {
  return value == null ? value : structuredClone(value);
}

function deepFreeze(value) {
  if (value == null || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

const MATCH_POLICY = 'DEMAND_ID_ASC_RESOURCE_ID_ASC';
const MATCHABLE_DEMAND_STATES = Object.freeze(['OPEN', 'PARTIAL']);

export class ResourceMatching {
  #resourceState;
  #claims;
  #demands;

  constructor({ resourceState, claims, demands }) {
    if (!resourceState || typeof resourceState.get !== 'function' || typeof resourceState.ids !== 'function') {
      throw new TypeError('ResourceState-compatible instance required');
    }
    if (!claims || typeof claims.availableAmount !== 'function') {
      throw new TypeError('ResourceClaims-compatible instance required');
    }
    if (!demands || typeof demands.get !== 'function' || typeof demands.ids !== 'function') {
      throw new TypeError('ResourceDemands-compatible instance required');
    }
    this.#resourceState = resourceState;
    this.#claims = claims;
    this.#demands = demands;
  }

  static get policy() { return MATCH_POLICY; }

  matchDemand(demandId) {
    const demand = this.#requireDemand(demandId);
    const availability = this.#buildAvailabilityLedger();
    return this.#match(demand, availability);
  }

  matchOpenDemands() {
    const availability = this.#buildAvailabilityLedger();
    const matches = this.#demands.ids()
      .map(id => this.#demands.get(id))
      .filter(demand => this.#isMatchable(demand))
      .sort((a, b) => a.id.localeCompare(b.id))
      .map(demand => this.#match(demand, availability));

    return deepFreeze({
      policy: MATCH_POLICY,
      matches,
      matchedDemandCount: matches.length,
      fullyCoveredDemandCount: matches.filter(match => match.complete).length
    });
  }

  #match(demand, availability) {
    const requestedAmount = this.#isMatchable(demand) ? demand.remainingAmount : 0;
    let remaining = requestedAmount;
    const selections = [];

    if (remaining > 0) {
      const resourceIds = this.#resourceState.ids().slice().sort((a, b) => a.localeCompare(b));
      for (const resourceId of resourceIds) {
        if (remaining <= 0) break;
        const resource = this.#resourceState.get(resourceId);
        if (!resource || resource.definitionId !== demand.definitionId || resource.state === 'CONSUMED') continue;

        const availableBefore = availability.get(resourceId) ?? 0;
        if (availableBefore <= 0) continue;

        const amount = Math.min(remaining, availableBefore);
        selections.push(deepFreeze({
          resourceId,
          amount,
          availableBefore,
          location: clone(resource.location),
          ownerId: resource.ownerId ?? null
        }));
        availability.set(resourceId, availableBefore - amount);
        remaining -= amount;
      }
    }

    const matchedAmount = requestedAmount - remaining;
    return deepFreeze({
      demandId: demand.id,
      consumerId: demand.consumerId,
      definitionId: demand.definitionId,
      demandStatus: demand.status,
      requestedAmount,
      matchedAmount,
      unmatchedAmount: remaining,
      complete: requestedAmount > 0 && remaining === 0,
      policy: MATCH_POLICY,
      selections
    });
  }

  #buildAvailabilityLedger() {
    const availability = new Map();
    for (const resourceId of this.#resourceState.ids()) {
      availability.set(resourceId, this.#claims.availableAmount(resourceId));
    }
    return availability;
  }

  #isMatchable(demand) {
    return !!demand
      && MATCHABLE_DEMAND_STATES.includes(demand.status)
      && Number.isSafeInteger(demand.remainingAmount)
      && demand.remainingAmount > 0;
  }

  #requireDemand(demandId) {
    const demand = this.#demands.get(demandId);
    if (!demand) throw new TypeError(`unknown demand id: ${demandId}`);
    return demand;
  }
}
