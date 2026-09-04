import { CellOccupancyContract } from './cell-occupancy-contract.js';
import { DeterministicEntryArbitrator } from './deterministic-entry-arbitrator.js';
import { RouteMovementIntegration } from './route-movement-integration.js';

function normalizeCarrierIds(value, currentCarrierId) {
  const ids = Array.isArray(value) ? value.map(entry => String(entry ?? '').trim()).filter(Boolean) : [];
  if (!ids.includes(currentCarrierId)) ids.push(currentCarrierId);
  if (new Set(ids).size !== ids.length) throw new Error('contenderCarrierIds must be unique');
  return Object.freeze(ids);
}

function distanceToTarget(movement) {
  if (!movement?.targetPosition) return 0;
  return Math.hypot(
    movement.targetPosition.x - movement.currentPosition.x,
    movement.targetPosition.y - movement.currentPosition.y
  );
}

export class OccupancyAwareMovementIntegration {
  static advance({
    route,
    movement,
    nextCellOccupancy = CellOccupancyContract.define(),
    contenderCarrierIds = [],
    maxDistance
  } = {}) {
    const bound = RouteMovementIntegration.bind({ route, movement });
    if (bound.state === 'IDLE' || bound.targetPosition === null) {
      return Object.freeze({ allowed: true, waiting: false, arbitration: null, movement: bound });
    }

    const occupancy = CellOccupancyContract.define({
      state: nextCellOccupancy?.state,
      carrierId: nextCellOccupancy?.carrierId ?? null
    });

    if (occupancy.state === 'OCCUPIED' && occupancy.carrierId !== bound.unitId) {
      return Object.freeze({ allowed: false, waiting: true, arbitration: null, movement });
    }

    let arbitration = null;
    if (occupancy.state === 'FREE') {
      arbitration = DeterministicEntryArbitrator.decide({
        occupancy,
        carrierIds: normalizeCarrierIds(contenderCarrierIds, bound.unitId)
      });
      if (arbitration.winnerCarrierId !== bound.unitId) {
        return Object.freeze({ allowed: false, waiting: true, arbitration, movement });
      }
    }

    const requestedDistance = Number(maxDistance);
    if (!Number.isFinite(requestedDistance) || !(requestedDistance > 0)) {
      throw new TypeError('maxDistance must be a finite number > 0');
    }
    const safeDistance = Math.min(requestedDistance, distanceToTarget(bound));
    const advanced = RouteMovementIntegration.advance({ route, movement: bound, maxDistance: safeDistance });
    return Object.freeze({ allowed: true, waiting: false, arbitration, movement: advanced });
  }
}
