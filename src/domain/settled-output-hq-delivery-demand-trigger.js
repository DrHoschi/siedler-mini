import { parseStableId } from '../world/stable-id.js';
import { BuildingStockContract } from './building-stock-contract.js';
import { BuildingStockTransportReservationContract } from './building-stock-transport-reservation-contract.js';
import { BuildingStockTransportReservationService } from './building-stock-transport-reservation-service.js';

const SOURCE = 'IM-36_SETTLED_OUTPUT_HQ_DELIVERY';
const PRODUCED_SOURCE = 'IM-27_PRODUCTION_OUTPUT';

function stable(value, kind, label) {
  const parsed = parseStableId(value);
  if (!parsed || parsed.kind !== kind) throw new TypeError(`invalid ${label}: ${value}`);
  return parsed.id;
}
function arrays(value, label) {
  if (!Array.isArray(value)) throw new TypeError(`${label} array required`);
  return value;
}
function resources(resourceState) {
  return resourceState.ids().map(id => resourceState.get(id));
}
function hq(domains, hqBuildingId = null) {
  if (!domains?.buildings || typeof domains.buildings.get !== 'function' || typeof domains.buildings.ids !== 'function') {
    throw new TypeError('CoreDomainStores-compatible domains required');
  }
  const id = hqBuildingId == null
    ? domains.buildings.ids().find(value => domains.buildings.get(value)?.identity?.definitionId === 'HQ')
    : stable(hqBuildingId, 'building', 'HQ building id');
  const building = id ? domains.buildings.get(id) : null;
  return building?.identity?.definitionId === 'HQ' ? building : null;
}
function produced(resource) {
  return resource?.kind === 'resource' && resource.metadata?.source === PRODUCED_SOURCE;
}
function stockKey(value) {
  return `${value.buildingId}|${value.resourceTypeId}`;
}
function demandForResource(demands, resourceId) {
  return demands.ids().map(id => demands.get(id)).find(demand =>
    demand?.metadata?.source === SOURCE
    && demand.metadata.resourceId === resourceId
    && ['OPEN', 'PARTIAL', 'RESERVED', 'FULFILLED'].includes(demand.status)) ?? null;
}
function stockFor(stocks, buildingId, resourceTypeId) {
  return stocks.map(value => BuildingStockContract.define(value))
    .find(value => value.buildingId === buildingId && value.resourceTypeId === resourceTypeId) ?? null;
}

export class SettledOutputHqDeliveryDemandTrigger {
  static get source() { return SOURCE; }

  static trigger({ domains, resourceState, claims, demands, jobs, buildingStocks, buildingStockTransportReservations, resource, hqBuildingId = null, demandId = null, reservationId = null } = {}) {
    if (!resourceState || typeof resourceState.get !== 'function' || typeof resourceState.ids !== 'function') throw new TypeError('ResourceState-compatible instance required');
    if (!claims || typeof claims.availableAmount !== 'function') throw new TypeError('ResourceClaims-compatible instance required');
    if (!demands || typeof demands.create !== 'function' || typeof demands.reserve !== 'function' || typeof demands.ids !== 'function') throw new TypeError('ResourceDemands-compatible instance required');
    if (!jobs || typeof jobs.createFromClaimIds !== 'function') throw new TypeError('TransportJobService-compatible instance required');
    const targetHq = hq(domains, hqBuildingId);
    if (!targetHq) return Object.freeze({ kind:'im36-settled-output-hq-delivery-demand-trigger', status:'NO_VALID_HQ', mutation:false, resourceId:resource?.id ?? null, demand:null, claim:null, transportJobs:null, reservations:Object.freeze([]) });
    const current = typeof resource === 'string' ? resourceState.get(resource) : resourceState.get(resource?.id) ?? resource;
    if (!produced(current)) return Object.freeze({ kind:'im36-settled-output-hq-delivery-demand-trigger', status:'NOT_TRIGGERED', reason:'PRODUCED_RESOURCE_REQUIRED', mutation:false, resourceId:current?.id ?? null, demand:null, claim:null, transportJobs:null, reservations:Object.freeze([]) });
    const resourceId = stable(current.id, 'resource', 'produced resource id');
    const existingDemand = demandForResource(demands, resourceId);
    if (existingDemand) return Object.freeze({ kind:'im36-settled-output-hq-delivery-demand-trigger', status:'ALREADY_TRIGGERED', mutation:false, resourceId, hqBuildingId:targetHq.id, demand:existingDemand, claim:null, transportJobs:null, reservations:Object.freeze([]) });
    if (current.state === 'CONSUMED') return Object.freeze({ kind:'im36-settled-output-hq-delivery-demand-trigger', status:'NOT_TRIGGERED', reason:'RESOURCE_CONSUMED', mutation:false, resourceId, hqBuildingId:targetHq.id, demand:null, claim:null, transportJobs:null, reservations:Object.freeze([]) });
    const sourceBuildingId = stable(current.ownerId, 'building', 'produced resource owner');
    const resourceTypeId = stable(current.definitionId, 'resource-type', 'produced resource type');
    const stocks = arrays(buildingStocks, 'buildingStocks');
    const reservations = arrays(buildingStockTransportReservations, 'buildingStockTransportReservations');
    const sourceStock = stockFor(stocks, sourceBuildingId, resourceTypeId);
    if (!sourceStock) return Object.freeze({ kind:'im36-settled-output-hq-delivery-demand-trigger', status:'NOT_TRIGGERED', reason:'SOURCE_STOCK_MISSING', mutation:false, resourceId, hqBuildingId:targetHq.id, demand:null, claim:null, transportJobs:null, reservations:Object.freeze([]) });
    const availableResource = claims.availableAmount(resourceId);
    const availableStock = BuildingStockTransportReservationService.availableAmount(sourceStock, reservations);
    const amount = Math.min(current.amount, availableResource, availableStock);
    if (amount < 1) return Object.freeze({ kind:'im36-settled-output-hq-delivery-demand-trigger', status:'NOT_TRIGGERED', reason:'NO_AVAILABLE_OUTPUT', mutation:false, resourceId, hqBuildingId:targetHq.id, demand:null, claim:null, transportJobs:null, reservations:Object.freeze([]) });
    const demand = demands.create({
      consumerId: targetHq.id,
      definitionId: resourceTypeId,
      amount,
      metadata: { source: SOURCE, resourceId, sourceBuildingId, hqBuildingId: targetHq.id, resourceTypeId, effectKey: current.metadata?.effectKey ?? null, settlementId: current.metadata?.settlementId ?? null },
    }, { id: demandId });
    const claim = demands.reserve({ demandId: demand.id, resourceId, amount, metadata: { source: SOURCE, resourceId, sourceBuildingId, hqBuildingId: targetHq.id } });
    const transportJobs = jobs.createFromClaimIds([claim.id]);
    const reservation = BuildingStockTransportReservationContract.define({ id: reservationId, sourceBuildingId, targetBuildingId: targetHq.id, resourceTypeId, amount, state: 'ACTIVE' });
    BuildingStockTransportReservationService.reserve({ stock: sourceStock, reservations, reservation });
    return Object.freeze({ kind:'im36-settled-output-hq-delivery-demand-trigger', status:'TRIGGERED', mutation:true, resourceId, hqBuildingId:targetHq.id, stockKey:stockKey(sourceStock), demand:demands.get(demand.id), claim, transportJobs, reservations:Object.freeze([reservation]) });
  }

  static triggerPublication({ publication, ...options } = {}) {
    const materializations = Array.isArray(publication?.materializations) ? publication.materializations : [];
    const producedResources = materializations.flatMap(result => Array.isArray(result?.resources) ? result.resources : []);
    return Object.freeze(producedResources.map(resource => this.trigger({ ...options, resource })));
  }

  static resourcesFromPublication(publication) {
    const materializations = Array.isArray(publication?.materializations) ? publication.materializations : [];
    return Object.freeze(materializations.flatMap(result => Array.isArray(result?.resources) ? result.resources : []));
  }

  static hasTriggeredDemand({ demands, resourceId } = {}) {
    return !!demandForResource(demands, stable(resourceId, 'resource', 'produced resource id'));
  }
}
