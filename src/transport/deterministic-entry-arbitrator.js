import { CellOccupancyContract } from './cell-occupancy-contract.js';

function normalizeCarrierIds(value) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new TypeError('carrierIds must be a non-empty array');
  }
  const ids = value.map((entry, index) => {
    const id = String(entry ?? '').trim();
    if (!id) throw new TypeError(`carrierIds[${index}] must be a non-empty string`);
    return id;
  });
  if (new Set(ids).size !== ids.length) throw new Error('carrierIds must be unique');
  return ids;
}

function compareCarrierIds(a, b) {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

export class DeterministicEntryArbitrator {
  static decide({ occupancy = CellOccupancyContract.define(), carrierIds } = {}) {
    const normalizedOccupancy = CellOccupancyContract.define({
      state: occupancy?.state,
      carrierId: occupancy?.carrierId ?? null
    });
    if (normalizedOccupancy.state !== 'FREE') {
      throw new Error('entry arbitration requires a FREE cell');
    }

    const contenders = normalizeCarrierIds(carrierIds).slice().sort(compareCarrierIds);
    const winnerCarrierId = contenders[0];
    const loserCarrierIds = Object.freeze(contenders.slice(1));

    return Object.freeze({
      kind: 'cell-entry-arbitration',
      winnerCarrierId,
      loserCarrierIds
    });
  }
}
