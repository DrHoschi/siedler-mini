import { parseStableId } from '../world/stable-id.js';
import { BuildingStockContract } from './building-stock-contract.js';
import { BuildingStockMutationContract } from './building-stock-mutation-contract.js';

function requireStableKind(value, kind, label) {
  const parsed = parseStableId(value);
  if (!parsed || parsed.kind !== kind) throw new TypeError(`invalid ${label}: ${value}`);
  return parsed.id;
}

function requirePositiveQuantity(value, label) {
  const quantity = Number(value);
  if (!Number.isSafeInteger(quantity) || quantity < 1) {
    throw new TypeError(`${label} must be a positive safe integer`);
  }
  return quantity;
}

function normalizeEntries(entries, label) {
  if (!Array.isArray(entries) || entries.length < 1) {
    throw new TypeError(`${label} must contain at least one entry`);
  }

  const seen = new Set();
  const normalized = entries.map(entry => {
    const resourceTypeId = requireStableKind(entry?.resourceTypeId, 'resource-type', `${label} resource type id`);
    if (seen.has(resourceTypeId)) throw new TypeError(`duplicate ${label} resource type id: ${resourceTypeId}`);
    seen.add(resourceTypeId);
    return Object.freeze({
      resourceTypeId,
      quantity: requirePositiveQuantity(entry?.quantity, `${label} quantity`)
    });
  });

  normalized.sort((a, b) => a.resourceTypeId.localeCompare(b.resourceTypeId));
  return Object.freeze(normalized);
}

function normalizeStocks(stocks, buildingId) {
  if (!Array.isArray(stocks)) throw new TypeError('building stocks must be an array');
  const byType = new Map();

  for (const stock of stocks) {
    const value = BuildingStockContract.define(stock);
    if (value.buildingId !== buildingId) {
      throw new TypeError(`building stock belongs to different building: ${value.buildingId}`);
    }
    if (byType.has(value.resourceTypeId)) {
      throw new TypeError(`duplicate building stock resource type: ${value.resourceTypeId}`);
    }
    byType.set(value.resourceTypeId, value);
  }

  return byType;
}

function freezeStocks(byType) {
  return Object.freeze([...byType.values()]
    .sort((a, b) => a.resourceTypeId.localeCompare(b.resourceTypeId))
    .map(value => BuildingStockContract.define(value)));
}

export class ProductionBuildingStockContract {
  static define({ buildingId, inputs, outputs } = {}) {
    return Object.freeze({
      kind: 'production-building-stock',
      buildingId: requireStableKind(buildingId, 'building', 'building id'),
      inputs: normalizeEntries(inputs, 'production inputs'),
      outputs: normalizeEntries(outputs, 'production outputs')
    });
  }

  static execute(production, stocks) {
    const contract = this.define(production);
    const byType = normalizeStocks(stocks, contract.buildingId);

    for (const input of contract.inputs) {
      const stock = byType.get(input.resourceTypeId);
      const available = stock?.quantity ?? 0;
      if (available < input.quantity) {
        throw new TypeError(`insufficient production input stock: ${input.resourceTypeId} ${available} < ${input.quantity}`);
      }
    }

    for (const input of contract.inputs) {
      const current = byType.get(input.resourceTypeId);
      byType.set(input.resourceTypeId, BuildingStockMutationContract.remove(current, input.quantity));
    }

    for (const output of contract.outputs) {
      const current = byType.get(output.resourceTypeId)
        ?? BuildingStockContract.define({
          buildingId: contract.buildingId,
          resourceTypeId: output.resourceTypeId,
          quantity: 0
        });
      byType.set(output.resourceTypeId, BuildingStockMutationContract.add(current, output.quantity));
    }

    return freezeStocks(byType);
  }
}
