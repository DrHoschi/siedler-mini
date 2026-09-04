import { ReservationLifecycleStateContract } from './reservation-lifecycle-state-contract.js';

function assertBlockingSource(value) {
  if (!value || typeof value.stateAt !== 'function' || typeof value.block !== 'function' || typeof value.clear !== 'function') {
    throw new TypeError('BlockedCellSource-compatible source required');
  }
  return value;
}

function assertLifecycleState(value) {
  if (!value || value.kind !== 'reservation-lifecycle-state') throw new TypeError('reservation lifecycle state required');
  ReservationLifecycleStateContract.isActive(value);
  return value;
}

function cellKey(cell) { return `${cell.x},${cell.y}`; }
function ownerKey(state) { return `${state.carrierId}@${cellKey(state.cell)}`; }

export class ReservationLifecycleTrafficIntegration {
  #blockedCellSource;
  #reservationOwnedCells = new Map();

  constructor({blockedCellSource}={}) {
    this.#blockedCellSource = assertBlockingSource(blockedCellSource);
  }

  apply(lifecycleState) {
    const state = assertLifecycleState(lifecycleState);
    const key = cellKey(state.cell);
    const owner = ownerKey(state);
    const active = ReservationLifecycleStateContract.isActive(state);
    const current = this.#blockedCellSource.stateAt(state.cell);

    if (active) {
      if (current === 'TRAVERSABLE') {
        this.#blockedCellSource.block(state.cell);
        this.#reservationOwnedCells.set(key, owner);
      }
      return Object.freeze({cell:state.cell,status:state.status,blocks:true,available:false,state:this.#blockedCellSource.stateAt(state.cell)});
    }

    if (this.#reservationOwnedCells.get(key) === owner) {
      this.#blockedCellSource.clear(state.cell);
      this.#reservationOwnedCells.delete(key);
    }

    const blocked = this.#blockedCellSource.stateAt(state.cell) !== 'TRAVERSABLE';
    return Object.freeze({cell:state.cell,status:state.status,blocks:false,available:!blocked,state:this.#blockedCellSource.stateAt(state.cell)});
  }

  isAvailable(cell) {
    return this.#blockedCellSource.stateAt(cell) === 'TRAVERSABLE';
  }
}
