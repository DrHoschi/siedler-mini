import { TraversabilityContract } from './traversability-contract.js';

function normalizePosition(position) {
  const x = Number(position?.x);
  const y = Number(position?.y);
  if (!Number.isSafeInteger(x) || !Number.isSafeInteger(y)) throw new TypeError('position x/y must be safe integers');
  return Object.freeze({x,y});
}

export class BlockedCellSource {
  #map;
  #statesByCell = new Map();

  constructor({map}={}) {
    if (!map || typeof map.contains !== 'function' || typeof map.cellIdAt !== 'function') {
      throw new TypeError('MapStructure-compatible map required');
    }
    this.#map = map;
  }

  set(position, state='TRAVERSABLE') {
    const point = normalizePosition(position);
    if (!this.#map.contains(point.x,point.y)) throw new RangeError(`cell outside map: ${point.x},${point.y}`);
    const contract = TraversabilityContract.define({state});
    const cellId = this.#map.cellIdAt(point.x,point.y);
    if (contract.state === 'TRAVERSABLE') this.#statesByCell.delete(cellId);
    else this.#statesByCell.set(cellId, contract.state);
    return Object.freeze({cellId,position:point,state:contract.state,traversable:contract.traversable});
  }

  stateAt(position) {
    const point = normalizePosition(position);
    if (!this.#map.contains(point.x,point.y)) throw new RangeError(`cell outside map: ${point.x},${point.y}`);
    const cellId = this.#map.cellIdAt(point.x,point.y);
    return this.#statesByCell.get(cellId) ?? 'TRAVERSABLE';
  }

  isTraversable(position) {
    return TraversabilityContract.define({state:this.stateAt(position)}).traversable;
  }

  block(position) { return this.set(position,'BLOCKED'); }
  clear(position) { return this.set(position,'TRAVERSABLE'); }

  entries() {
    return Object.freeze([...this.#statesByCell.entries()].map(([cellId,state])=>Object.freeze({cellId,state})));
  }
}
