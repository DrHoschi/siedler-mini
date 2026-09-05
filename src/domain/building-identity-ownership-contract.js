import { parseStableId } from '../world/stable-id.js';

function deepFreeze(value) {
  if (value == null || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function requireBuildingId(value) {
  const parsed = parseStableId(value);
  if (!parsed || parsed.kind !== 'building') {
    throw new TypeError(`invalid building id: ${value}`);
  }
  return parsed.id;
}

function requireDefinitionId(value) {
  const normalized = String(value ?? '').trim();
  if (!normalized) throw new TypeError('building definition id required');
  return normalized;
}

export class BuildingIdentityOwnershipContract {
  static define({ buildingId, definitionId } = {}) {
    const id = requireBuildingId(buildingId);
    const definition = requireDefinitionId(definitionId);

    return deepFreeze({
      kind: 'building-identity-ownership',
      buildingId: id,
      definitionId: definition,
      ownerRef: {
        kind: 'building',
        id
      }
    });
  }
}
