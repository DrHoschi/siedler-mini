import { AuthoritativeConstructionPlacementContract } from './authoritative-construction-placement-contract.js';
import { BuildingIdentityOwnershipContract } from './building-identity-ownership-contract.js';
import { BuildingLifecycleStateContract } from './building-lifecycle-state-contract.js';
import { BuildingRegistrationWorldOwnership } from './building-registration-world-ownership.js';

function deepFreeze(value) {
  if (value == null || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function requireDefinitionId(value) {
  const normalized = String(value ?? '').trim();
  if (!normalized) throw new TypeError('building definition id required');
  return normalized;
}

function requireCellId(value) {
  const normalized = String(value ?? '').trim();
  if (!normalized) throw new TypeError('placement target cell id required');
  return normalized;
}

function requireDomains(domains) {
  const buildings = domains?.buildings;
  if (!buildings || typeof buildings.allocateId !== 'function') {
    throw new TypeError('building domain store required');
  }
  return domains;
}

export class AuthoritativePlacementCommitBuildingRegistrationContract {
  #domains;
  #placement;
  #registration;

  constructor({ map, domains } = {}) {
    this.#domains = requireDomains(domains);
    this.#placement = new AuthoritativeConstructionPlacementContract({ map, domains });
    this.#registration = new BuildingRegistrationWorldOwnership({ domains });
  }

  commit({ definitionId, cellId } = {}) {
    const candidate = Object.freeze({
      definitionId: requireDefinitionId(definitionId),
      cellId: requireCellId(cellId),
    });

    const evaluation = this.#placement.evaluate(candidate);
    if (!evaluation.valid) {
      return deepFreeze({
        kind: 'authoritative-placement-commit-result',
        status: 'REJECTED',
        reason: evaluation.reason,
        candidate,
        evaluation,
        buildingId: null,
        building: null,
      });
    }

    const buildingId = this.#domains.buildings.allocateId();
    const identity = BuildingIdentityOwnershipContract.define({
      buildingId,
      definitionId: candidate.definitionId,
    });
    const lifecycle = BuildingLifecycleStateContract.define({ buildingId });
    const position = Object.freeze({
      x: evaluation.cell.world.x,
      y: evaluation.cell.world.y,
    });

    const building = this.#registration.register({ identity, lifecycle, position });

    return deepFreeze({
      kind: 'authoritative-placement-commit-result',
      status: 'COMMITTED',
      reason: evaluation.reason,
      candidate,
      evaluation,
      buildingId,
      building,
    });
  }
}
