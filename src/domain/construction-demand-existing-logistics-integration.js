import { parseStableId } from '../world/stable-id.js';
import { BuildingStockContract } from './building-stock-contract.js';
import { BuildingStockTransportReservationContract } from './building-stock-transport-reservation-contract.js';
import { BuildingStockTransportReservationService } from './building-stock-transport-reservation-service.js';

function requireStableKind(value, kind, label) {
  const parsed = parseStableId(value);
  if (!parsed || parsed.kind !== kind) throw new TypeError(`invalid ${label}: ${value}`);
  return parsed.id;
}

function requireRequirement(value) {
  if (!value || typeof value !== 'object' || value.kind !== 'economic-construction-requirement') {
    throw new TypeError('economic construction requirement required');
  }
  return Object.freeze({
    buildingId: requireStableKind(value.buildingId, 'building', 'construction building id'),
    demandId: requireStableKind(value.demandId, 'demand', 'construction demand id'),
    definitionId: requireStableKind(value.definitionId, 'resource-type', 'construction resource definition id')
  });
}

export class ConstructionDemandExistingLogisticsIntegration {
  #resourceState;
  #claims;
  #demands;
  #matching;
  #assignment;
  #transportJobs;

  constructor({ resourceState, claims, demands, matching, assignment, transportJobs } = {}) {
    if (!resourceState || typeof resourceState.get !== 'function') throw new TypeError('ResourceState-compatible instance required');
    if (!claims || typeof claims.get !== 'function') throw new TypeError('ResourceClaims-compatible instance required');
    if (!demands || typeof demands.get !== 'function') throw new TypeError('ResourceDemands-compatible instance required');
    if (!matching || typeof matching.matchDemand !== 'function') throw new TypeError('ResourceMatching-compatible instance required');
    if (!assignment || typeof assignment.assignMatch !== 'function') throw new TypeError('ResourceAssignment-compatible instance required');
    if (!transportJobs || typeof transportJobs.createFromAssignment !== 'function') throw new TypeError('TransportJobService-compatible instance required');
    this.#resourceState = resourceState;
    this.#claims = claims;
    this.#demands = demands;
    this.#matching = matching;
    this.#assignment = assignment;
    this.#transportJobs = transportJobs;
  }

  connect({ requirement, sourceStocks = [], existingTransportReservations = [], reservationIds = [] } = {}) {
    const refs = requireRequirement(requirement);
    const demand = this.#demands.get(refs.demandId);
    if (!demand) throw new TypeError(`unknown construction demand: ${refs.demandId}`);
    if (demand.consumerId !== refs.buildingId || demand.definitionId !== refs.definitionId) {
      throw new Error('construction requirement no longer matches authoritative demand');
    }

    const match = this.#matching.matchDemand(refs.demandId);
    if (match.matchedAmount === 0) {
      return Object.freeze({
        kind: 'construction-demand-existing-logistics-integration',
        status: 'WAITING_FOR_AVAILABLE_RESOURCES',
        buildingId: refs.buildingId,
        demandId: refs.demandId,
        definitionId: refs.definitionId,
        match,
        assignment: null,
        reservations: Object.freeze([]),
        transportJobs: null
      });
    }

    if (!Array.isArray(sourceStocks) || !Array.isArray(existingTransportReservations) || !Array.isArray(reservationIds)) {
      throw new TypeError('sourceStocks, existingTransportReservations and reservationIds must be arrays');
    }
    if (reservationIds.length !== match.selections.length) {
      throw new Error(`one transport reservation id required per matched resource selection: ${match.selections.length}`);
    }

    const stocks = sourceStocks.map(stock => BuildingStockContract.define(stock));
    const accumulatedReservations = [...existingTransportReservations];
    const plannedReservations = [];

    for (let index = 0; index < match.selections.length; index += 1) {
      const selection = match.selections[index];
      const resource = this.#resourceState.get(selection.resourceId);
      if (!resource) throw new TypeError(`unknown matched resource: ${selection.resourceId}`);
      const sourceBuildingId = requireStableKind(resource.ownerId, 'building', 'resource owner building id');
      const stock = stocks.find(value => value.buildingId === sourceBuildingId && value.resourceTypeId === refs.definitionId);
      if (!stock) throw new Error(`no matching authoritative BuildingStock for resource owner: ${sourceBuildingId}`);

      const reservation = BuildingStockTransportReservationContract.define({
        id: reservationIds[index],
        sourceBuildingId,
        targetBuildingId: refs.buildingId,
        resourceTypeId: refs.definitionId,
        amount: selection.amount,
        state: BuildingStockTransportReservationContract.states.ACTIVE
      });
      BuildingStockTransportReservationService.reserve({
        stock,
        reservations: accumulatedReservations,
        reservation
      });
      accumulatedReservations.push(reservation);
      plannedReservations.push(reservation);
    }

    const assigned = this.#assignment.assignMatch(match);
    for (const claimId of assigned.claimIds) {
      const claim = this.#claims.get(claimId);
      if (!claim || claim.state !== 'ACTIVE' || claim.demandId !== refs.demandId || claim.consumerId !== refs.buildingId) {
        throw new Error(`construction logistics claim invariant failed: ${claimId}`);
      }
    }

    const jobs = this.#transportJobs.createFromAssignment(assigned);
    if (jobs.jobs.some(job => job.demandId !== refs.demandId || job.targetId !== refs.buildingId || job.definitionId !== refs.definitionId)) {
      throw new Error('construction transport job invariant failed');
    }

    return Object.freeze({
      kind: 'construction-demand-existing-logistics-integration',
      status: 'DISPATCHED_TO_EXISTING_LOGISTICS',
      buildingId: refs.buildingId,
      demandId: refs.demandId,
      definitionId: refs.definitionId,
      match,
      assignment: assigned,
      reservations: Object.freeze(plannedReservations),
      transportJobs: jobs
    });
  }
}
