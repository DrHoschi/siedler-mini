import { parseStableId } from '../world/stable-id.js';
import { BuildingStockContract } from './building-stock-contract.js';
import { BuildingStockTransportReservationContract } from './building-stock-transport-reservation-contract.js';
import { DeliveredTransportBuildingStockSettlement } from './delivered-transport-building-stock-settlement.js';
import { ProducedResourceLogisticsConsumptionConsistency } from './produced-resource-logistics-consumption-consistency.js';

const PRODUCED_SOURCE = 'IM-27_PRODUCTION_OUTPUT';

function stable(value, kind, label) {
  const parsed = parseStableId(value);
  if (!parsed || parsed.kind !== kind) throw new TypeError(`invalid ${label}: ${value}`);
  return parsed.id;
}

function requireProducedResource(resource) {
  if (!resource || resource.kind !== 'resource' || resource.metadata?.source !== PRODUCED_SOURCE) {
    throw new TypeError('IM-32 requires source-bound IM-27 produced resource');
  }
  return resource;
}

function requireHqBuilding(domains, hqBuildingId) {
  if (!domains?.buildings || typeof domains.buildings.get !== 'function') {
    throw new TypeError('CoreDomainStores-compatible domains required');
  }
  const id = stable(hqBuildingId, 'building', 'HQ building id');
  const building = domains.buildings.get(id);
  if (!building) throw new Error(`missing HQ building: ${id}`);
  if (building.identity?.definitionId !== 'HQ') throw new Error(`target building is not HQ: ${id}`);
  return building;
}

function requireCurrentReservation(reservations, reservationId) {
  if (!Array.isArray(reservations)) throw new TypeError('buildingStockTransportReservations array required');
  const id = stable(reservationId, 'transport-reservation', 'transport reservation id');
  const reservation = reservations.find(value => value.id === id);
  if (!reservation) throw new Error(`missing transport reservation: ${id}`);
  return BuildingStockTransportReservationContract.define(reservation);
}

function stockKey(value) {
  return `${value.buildingId}|${value.resourceTypeId}`;
}

function findStock(stocks, buildingId, resourceTypeId) {
  return stocks.find(value => value.buildingId === buildingId && value.resourceTypeId === resourceTypeId) ?? null;
}

function normalizeStocks(stocks) {
  if (!Array.isArray(stocks)) throw new TypeError('buildingStocks array required');
  return stocks.map(value => BuildingStockContract.define(value));
}

export class SourceBoundOutputHqIntake {
  static settle({
    domains,
    resourceState,
    claims,
    buildingStocks,
    buildingStockTransportReservations,
    dispatch,
    delivery,
    deliveryCommit,
    reservationId,
    workforceState,
    hqBuildingId,
  } = {}) {
    const hq = requireHqBuilding(domains, hqBuildingId);
    if (!resourceState || typeof resourceState.get !== 'function') {
      throw new TypeError('ResourceState-compatible instance required');
    }
    const resource = requireProducedResource(resourceState.get(delivery?.resourceId));
    const reservation = requireCurrentReservation(buildingStockTransportReservations, reservationId);
    const hqId = hq.id;

    if (reservation.state === BuildingStockTransportReservationContract.states.RELEASED) {
      if (reservation.targetBuildingId !== hqId || reservation.resourceTypeId !== resource.definitionId) {
        throw new Error('released reservation does not match requested HQ intake');
      }
      return Object.freeze({
        kind: 'im32-source-bound-output-hq-intake',
        status: 'ALREADY_INTAKEN',
        resourceId: resource.id,
        reservationId: reservation.id,
        hqBuildingId: hqId,
        amount: reservation.amount,
        mutation: false,
      });
    }

    if (reservation.targetBuildingId !== hqId) throw new Error('source-bound output delivery target is not the designated HQ');
    if (reservation.resourceTypeId !== resource.definitionId) throw new Error('reservation resource type does not match produced resource');
    if (resource.ownerId !== reservation.sourceBuildingId) throw new Error('produced resource owner does not match reservation source');
    if (deliveryCommit?.settlement?.targetId !== hqId) throw new Error('existing delivery settlement target is not the designated HQ');

    const stocks = normalizeStocks(buildingStocks);
    const sourceStock = findStock(stocks, reservation.sourceBuildingId, reservation.resourceTypeId);
    if (!sourceStock) throw new Error('authoritative source BuildingStock required for IM-32 intake');
    const targetStock = findStock(stocks, hqId, reservation.resourceTypeId)
      ?? BuildingStockContract.define({ buildingId: hqId, resourceTypeId: reservation.resourceTypeId, quantity: 0 });

    const settlement = DeliveredTransportBuildingStockSettlement.settle({
      dispatch,
      delivery,
      reservation,
      workforceState,
      sourceStock,
      targetStock,
    });
    const consistency = ProducedResourceLogisticsConsumptionConsistency.verify({
      deliveryCommit,
      buildingStockSettlement: settlement,
      resourceState,
      claims,
    });

    if (settlement.targetStock.buildingId !== hqId) throw new Error('settlement target is not HQ');
    return Object.freeze({
      kind: 'im32-source-bound-output-hq-intake',
      status: 'INTAKEN',
      resourceId: resource.id,
      reservationId: reservation.id,
      hqBuildingId: hqId,
      amount: settlement.amount,
      sourceStock: settlement.sourceStock,
      targetStock: settlement.targetStock,
      reservation: settlement.reservation,
      workforceState: settlement.workforceState,
      settlement,
      consistency,
      mutation: true,
      stockKey: stockKey(settlement.targetStock),
    });
  }
}
