import { parseStableId } from '../world/stable-id.js';
import { BuildingIdentityOwnershipContract } from './building-identity-ownership-contract.js';
import { BuildingLifecycleStateContract } from './building-lifecycle-state-contract.js';

function requireBuildingStore(domains) {
  const store = domains?.buildings;
  if (!store || store.kind !== 'building' || store.domain !== 'buildings') {
    throw new TypeError('building domain store required');
  }
  return store;
}

function requireBuildingId(value) {
  const parsed = parseStableId(value);
  if (!parsed || parsed.kind !== 'building') throw new TypeError(`invalid building id: ${value}`);
  return parsed.id;
}

export class BuildingRegistrationWorldOwnership {
  #buildings;

  constructor({ domains } = {}) {
    this.#buildings = requireBuildingStore(domains);
  }

  register({ identity, lifecycle } = {}) {
    const normalizedIdentity = BuildingIdentityOwnershipContract.define(identity);
    const normalizedLifecycle = BuildingLifecycleStateContract.define(lifecycle);
    if (normalizedIdentity.buildingId !== normalizedLifecycle.buildingId) {
      throw new TypeError('building identity/lifecycle id mismatch');
    }

    const buildingId = normalizedIdentity.buildingId;
    return this.#buildings.create({
      identity: normalizedIdentity,
      lifecycle: normalizedLifecycle
    }, { id: buildingId });
  }

  has(buildingId) {
    return this.#buildings.has(requireBuildingId(buildingId));
  }

  get(buildingId) {
    return this.#buildings.get(requireBuildingId(buildingId));
  }

  ids() {
    return this.#buildings.ids();
  }

  remove(buildingId) {
    return this.#buildings.remove(requireBuildingId(buildingId));
  }
}
