import { BuildingStockContract } from './building-stock-contract.js';

function requireDelta(value) {
  const delta = Number(value);
  if (!Number.isSafeInteger(delta) || delta < 1) {
    throw new TypeError('building stock mutation amount must be a positive safe integer');
  }
  return delta;
}

export class BuildingStockMutationContract {
  static add(current, amount) {
    const value = BuildingStockContract.define(current);
    const delta = requireDelta(amount);
    const nextQuantity = value.quantity + delta;

    if (!Number.isSafeInteger(nextQuantity)) {
      throw new TypeError('building stock quantity overflow');
    }

    return BuildingStockContract.define({
      buildingId: value.buildingId,
      resourceTypeId: value.resourceTypeId,
      quantity: nextQuantity
    });
  }

  static remove(current, amount) {
    const value = BuildingStockContract.define(current);
    const delta = requireDelta(amount);

    if (delta > value.quantity) {
      throw new TypeError(`building stock cannot over-withdraw: ${delta} > ${value.quantity}`);
    }

    return BuildingStockContract.define({
      buildingId: value.buildingId,
      resourceTypeId: value.resourceTypeId,
      quantity: value.quantity - delta
    });
  }
}
