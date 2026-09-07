function clone(value) {
  return value == null ? value : structuredClone(value);
}

function asPositiveInt(value, name) {
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n < 1) throw new TypeError(`${name} must be a positive safe integer`);
  return n;
}

function asFiniteNumber(value, name) {
  const n = Number(value);
  if (!Number.isFinite(n)) throw new TypeError(`${name} must be finite`);
  return n;
}

function coordKey(x, y) {
  return `${x},${y}`;
}

export class MapStructure {
  #world;
  #mapId;
  #cellsByCoord = new Map();
  #defaultTileId;

  constructor(worldStore, {
    name = 'Prototype World',
    width = 8,
    height = 8,
    cellSize = 1,
    origin = { x: 0, y: 0 },
    metadata = {},
    restoreSnapshot = null,
  } = {}) {
    if (!worldStore || typeof worldStore.create !== 'function' || typeof worldStore.get !== 'function') {
      throw new TypeError('WorldStore-compatible instance required');
    }

    this.#world = worldStore;

    if (restoreSnapshot != null) {
      const mapId = String(restoreSnapshot.mapId || '');
      const defaultTileId = String(restoreSnapshot.defaultTileId || '');
      const map = this.#world.get(mapId);
      const defaultTile = this.#world.get(defaultTileId);
      if (!map || map.kind !== 'map') throw new TypeError('restore map entity required');
      if (!defaultTile || defaultTile.kind !== 'tile') throw new TypeError('restore default tile entity required');
      const dimensions = restoreSnapshot.dimensions;
      const w = asPositiveInt(dimensions?.width, 'restore dimensions.width');
      const h = asPositiveInt(dimensions?.height, 'restore dimensions.height');
      if (map.width !== w || map.height !== h) throw new Error('restore map dimensions mismatch');
      if (!Array.isArray(restoreSnapshot.cellIds) || restoreSnapshot.cellIds.length !== w * h) {
        throw new Error('restore cellIds/dimensions mismatch');
      }
      this.#mapId = mapId;
      this.#defaultTileId = defaultTileId;
      for (const cellId of restoreSnapshot.cellIds) {
        const cell = this.#world.get(cellId);
        const x = cell?.grid?.x;
        const y = cell?.grid?.y;
        if (!cell || cell.kind !== 'cell' || cell.mapId !== mapId || !Number.isSafeInteger(x) || !Number.isSafeInteger(y)) {
          throw new TypeError(`invalid restore cell: ${cellId}`);
        }
        const key = coordKey(x, y);
        if (this.#cellsByCoord.has(key)) throw new Error(`duplicate restore cell coordinate: ${key}`);
        this.#cellsByCoord.set(key, cellId);
      }
      return;
    }

    const w = asPositiveInt(width, 'width');
    const h = asPositiveInt(height, 'height');
    const size = asFiniteNumber(cellSize, 'cellSize');
    if (!(size > 0)) throw new TypeError('cellSize must be > 0');
    const ox = asFiniteNumber(origin?.x ?? 0, 'origin.x');
    const oy = asFiniteNumber(origin?.y ?? 0, 'origin.y');

    const defaultTile = this.#world.create('tile', {
      technicalName: 'ground.default',
      classification: 'terrain',
      passability: 'UNSPECIFIED'
    });
    this.#defaultTileId = defaultTile.id;

    const map = this.#world.create('map', {
      name: String(name || 'Prototype World'),
      width: w,
      height: h,
      cellSize: size,
      origin: { x: ox, y: oy },
      metadata: clone(metadata || {})
    });
    this.#mapId = map.id;

    for (let y = 0; y < h; y += 1) {
      for (let x = 0; x < w; x += 1) {
        const cell = this.#world.create('cell', {
          mapId: this.#mapId,
          tileId: this.#defaultTileId,
          grid: { x, y },
          world: {
            x: ox + x * size,
            y: oy + y * size
          }
        });
        this.#cellsByCoord.set(coordKey(x, y), cell.id);
      }
    }
  }

  get mapId() { return this.#mapId; }
  get defaultTileId() { return this.#defaultTileId; }

  map() {
    return this.#world.get(this.#mapId);
  }

  dimensions() {
    const map = this.map();
    return Object.freeze({ width: map.width, height: map.height });
  }

  contains(x, y) {
    const gx = Number(x);
    const gy = Number(y);
    return Number.isSafeInteger(gx) && Number.isSafeInteger(gy) && this.#cellsByCoord.has(coordKey(gx, gy));
  }

  cellIdAt(x, y) {
    if (!this.contains(x, y)) return null;
    return this.#cellsByCoord.get(coordKey(Number(x), Number(y))) ?? null;
  }

  cellAt(x, y) {
    const id = this.cellIdAt(x, y);
    return id ? this.#world.get(id) : null;
  }

  setTileAt(x, y, tileId) {
    const id = this.cellIdAt(x, y);
    if (!id) throw new RangeError(`cell outside map: ${x},${y}`);
    const tile = this.#world.get(tileId);
    if (!tile || tile.kind !== 'tile') throw new TypeError(`unknown tile id: ${tileId}`);
    return this.#world.update(id, draft => {
      draft.tileId = tileId;
    });
  }

  createTile(definition = {}) {
    return this.#world.create('tile', clone(definition));
  }

  cellIds() {
    return Object.freeze([...this.#cellsByCoord.values()]);
  }

  snapshot() {
    const map = this.map();
    const cells = this.cellIds().map(id => this.#world.get(id));
    return Object.freeze({
      map,
      defaultTileId: this.#defaultTileId,
      cells: Object.freeze(cells)
    });
  }
}
