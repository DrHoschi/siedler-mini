import { BuildingStockContract } from './building-stock-contract.js';
import { BuildingStockTransportReservationContract } from './building-stock-transport-reservation-contract.js';

function normalizeReservations(values) {
  if (!Array.isArray(values)) throw new TypeError('transport reservations must be an array');
  const seen = new Set();
  return values.map(value => {
    const reservation = BuildingStockTransportReservationContract.define(value);
    if (seen.has(reservation.id)) throw new Error(`duplicate transport reservation id: ${reservation.id}`);
    seen.add(reservation.id);
    return reservation;
  });
}

function sameStockKey(stock, reservation) {
  return stock.buildingId === reservation.sourceBuildingId
    && stock.resourceTypeId === reservation.resourceTypeId;
}

export class BuildingStockTransportReservationService {
  static reservedAmount(stockInput, reservations = []) {
    const stock = BuildingStockContract.define(stockInput);
    return normalizeReservations(reservations)
      .filter(reservation => reservation.state === BuildingStockTransportReservationContract.states.ACTIVE)
      .filter(reservation => sameStockKey(stock, reservation))
      .reduce((sum, reservation) => sum + reservation.amount, 0);
  }

  static availableAmount(stockInput, reservations = []) {
    const stock = BuildingStockContract.define(stockInput);
    const reserved = this.reservedAmount(stock, reservations);
    const available = stock.quantity - reserved;
    if (!Number.isSafeInteger(available) || available < 0) {
      throw new Error(`active transport reservations exceed physical BuildingStock: ${reserved} > ${stock.quantity}`);
    }
    return available;
  }

  static reserve({ stock, reservations = [], reservation } = {}) {
    const physicalStock = BuildingStockContract.define(stock);
    const currentReservations = normalizeReservations(reservations);
    const nextReservation = BuildingStockTransportReservationContract.define(reservation);

    if (nextReservation.state !== BuildingStockTransportReservationContract.states.ACTIVE) {
      throw new Error('new transport reservation must be ACTIVE');
    }
    if (!sameStockKey(physicalStock, nextReservation)) {
      throw new Error('transport reservation source/resource does not match BuildingStock');
    }
    if (currentReservations.some(value => value.id === nextReservation.id)) {
      throw new Error(`duplicate transport reservation id: ${nextReservation.id}`);
    }

    const before = this.availableAmount(physicalStock, currentReservations);
    if (nextReservation.amount > before) {
      throw new Error(`transport reservation exceeds available BuildingStock: ${nextReservation.amount} > ${before}`);
    }

    const after = before - nextReservation.amount;
    return Object.freeze({
      kind: 'building-stock-transport-reservation-result',
      reservation: nextReservation,
      availableBefore: before,
      availableAfter: after
    });
  }
}
