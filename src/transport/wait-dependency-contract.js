function asUnitId(value, fieldName) {
  const id = String(value ?? '').trim();
  if (!/^unit:\d{8}$/.test(id)) throw new TypeError(`${fieldName} requires unit stable id: ${value}`);
  return id;
}

function asCell(value) {
  if (!value || !Number.isInteger(value.x) || !Number.isInteger(value.y)) {
    throw new TypeError('blockedCell requires integer x/y');
  }
  return Object.freeze({ x:value.x, y:value.y });
}

export class WaitDependencyContract {
  static define({ waitingCarrierId, blockingCarrierId, blockedCell } = {}) {
    const normalizedWaitingCarrierId = asUnitId(waitingCarrierId, 'waitingCarrierId');
    const normalizedBlockingCarrierId = asUnitId(blockingCarrierId, 'blockingCarrierId');
    if (normalizedWaitingCarrierId === normalizedBlockingCarrierId) {
      throw new TypeError('wait dependency requires two different carriers');
    }

    return Object.freeze({
      kind:'wait-dependency',
      waitingCarrierId:normalizedWaitingCarrierId,
      blockingCarrierId:normalizedBlockingCarrierId,
      blockedCell:asCell(blockedCell)
    });
  }
}
