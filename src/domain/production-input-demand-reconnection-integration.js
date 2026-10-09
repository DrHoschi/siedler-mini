import { parseStableId } from '../world/stable-id.js';
import { BuildingStockContract } from './building-stock-contract.js';

const SOURCE = 'IM-33_HQ_STOCK_RECONNECTION';
const INPUT_DEMAND_SOURCE = 'IM-23_PRODUCTION_INPUT';

function stable(value, kind, label) {
  const parsed = parseStableId(value);
  if (!parsed || parsed.kind !== kind) throw new TypeError(`invalid ${label}: ${value}`);
  return parsed.id;
}

function requireHq(domains, hqBuildingId) {
  if (!domains?.buildings || typeof domains.buildings.get !== 'function') {
    throw new TypeError('CoreDomainStores-compatible domains required');
  }
  const id = stable(hqBuildingId, 'building', 'HQ building id');
  const building = domains.buildings.get(id);
  if (!building) throw new Error(`missing HQ building: ${id}`);
  if (building.identity?.definitionId !== 'HQ') throw new Error(`target building is not HQ: ${id}`);
  return id;
}

function stockKey(buildingId, resourceTypeId) {
  return `${buildingId}|${resourceTypeId}`;
}

function existingResource(resourceState, hqBuildingId, resourceTypeId) {
  const key = stockKey(hqBuildingId, resourceTypeId);
  return resourceState.ids()
    .map(id => resourceState.get(id))
    .find(value => value?.metadata?.source === SOURCE && value.metadata?.stockKey === key) ?? null;
}

function im23Demand(demand, buildingId, resourceTypeId) {
  return demand
    && ['OPEN', 'PARTIAL'].includes(demand.status)
    && demand.definitionId === resourceTypeId
    && demand.metadata?.source === INPUT_DEMAND_SOURCE
    && demand.metadata?.buildingId === buildingId
    && demand.metadata?.resourceTypeId === resourceTypeId;
}

export class ProductionInputDemandReconnectionIntegration {
  static get source() { return SOURCE; }

  static materializeHqStock({
    domains,
    resourceState,
    claims,
    buildingStocks,
    hqBuildingId,
    resourceTypeId,
    resourceId = null,
  } = {}) {
    const hqId = requireHq(domains, hqBuildingId);
    const typeId = stable(resourceTypeId, 'resource-type', 'resource type id');
    if (!resourceState || typeof resourceState.ids !== 'function' || typeof resourceState.get !== 'function' || typeof resourceState.createResource !== 'function') {
      throw new TypeError('ResourceState-compatible instance required');
    }
    if (!claims || typeof claims.consumedAmount !== 'function') throw new TypeError('ResourceClaims-compatible instance required');
    if (!Array.isArray(buildingStocks)) throw new TypeError('buildingStocks array required');
    if (!resourceState.getDefinition(typeId)) throw new TypeError(`unknown resource definition id: ${typeId}`);

    const stock = buildingStocks
      .map(value => BuildingStockContract.define(value))
      .find(value => value.buildingId === hqId && value.resourceTypeId === typeId) ?? null;

    const current = existingResource(resourceState, hqId, typeId);
    if (current) {
      const amount = (stock?.quantity ?? 0) + claims.consumedAmount(current.id);
      if (current.definitionId !== typeId || current.ownerId !== hqId) throw new Error('existing IM-33 HQ resource does not match stock owner/type');
      if (current.amount !== amount) resourceState.setAmount(current.id, amount);
      if (current.location?.kind !== 'owner' || current.location?.refId !== hqId) {
        resourceState.relocate(current.id, { kind: 'owner', refId: hqId }, hqId);
      }
      return Object.freeze({
        kind: 'production-input-demand-reconnection-materialization',
        status: current.amount === amount ? 'ALREADY_MATERIALIZED' : 'RECONCILED',
        hqBuildingId: hqId,
        resourceTypeId: typeId,
        resource: resourceState.get(current.id),
        mutation: current.amount !== amount,
      });
    }

    if (!stock || stock.quantity < 1) {
      return Object.freeze({
        kind: 'production-input-demand-reconnection-materialization',
        status: 'NO_HQ_STOCK',
        hqBuildingId: hqId,
        resourceTypeId: typeId,
        resource: null,
        mutation: false,
      });
    }

    const id = resourceId ?? undefined;
    const resource = resourceState.createResource({
      definitionId: typeId,
      amount: stock.quantity,
      state: 'AVAILABLE',
      location: { kind: 'owner', refId: hqId },
      ownerId: hqId,
      metadata: { source: SOURCE, hqBuildingId: hqId, resourceTypeId: typeId, stockKey: stockKey(hqId, typeId) },
    }, id ? { id } : {});
    return Object.freeze({
      kind: 'production-input-demand-reconnection-materialization',
      status: 'MATERIALIZED',
      hqBuildingId: hqId,
      resourceTypeId: typeId,
      resource,
      mutation: true,
    });
  }

  static openProductionInputDemands({ demands, buildingId = null, resourceTypeId } = {}) {
    const typeId = stable(resourceTypeId, 'resource-type', 'resource type id');
    if (!demands || typeof demands.ids !== 'function' || typeof demands.get !== 'function') {
      throw new TypeError('ResourceDemands-compatible instance required');
    }
    return Object.freeze(demands.ids()
      .map(id => demands.get(id))
      .filter(demand => im23Demand(demand, buildingId ?? demand?.consumerId, typeId))
      .sort((a, b) => a.id.localeCompare(b.id)));
  }
}
