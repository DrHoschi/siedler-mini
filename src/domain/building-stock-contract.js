import { parseStableId } from '../world/stable-id.js';

function requireStableKind(value, kind, label) {
  const parsed = parseStableId(value);
  if (!parsed || parsed.kind !== kind) {
    throw new TypeError(`invalid ${label}: ${value}`);
  }
  return parsed.id;
}

function requireQuantity(value) {
  const quantity = Number(value);
  if (!Number.isSafeInteger(quantity) || quantity < 0) {
    throw new TypeError('building stock quantity must be a non-negative safe integer');
  }
  return quantity;
}

export class BuildingStockContract {
  static define({ buildingId, resourceTypeId, quantity = 0 } = {}) {
    return Object.freeze({
      kind: 'building-stock',
      buildingId: requireStableKind(buildingId, 'building', 'building id'),
      resourceTypeId: requireStableKind(resourceTypeId, 'resource-type', 'resource type id'),
      quantity: requireQuantity(quantity)
    });
  }
}
