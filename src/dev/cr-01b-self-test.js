import { WorldStore } from '../world/world-store.js';
import { MapStructure } from '../world/map-structure.js';

export function runCr01bSelfTest() {
  const results = [];
  const check = (name, fn) => {
    try { results.push({ name, pass: !!fn() }); }
    catch (error) { results.push({ name, pass: false, error: String(error?.message || error) }); }
  };

  check('map-tile-cell-identities', () => {
    const world = new WorldStore();
    const map = new MapStructure(world, { width: 3, height: 2, cellSize: 4 });
    const c00 = map.cellAt(0, 0);
    const c21 = map.cellAt(2, 1);
    return map.mapId.startsWith('map:')
      && map.defaultTileId.startsWith('tile:')
      && c00?.id?.startsWith('cell:')
      && c21?.id?.startsWith('cell:')
      && map.cellIds().length === 6;
  });

  check('coordinate-to-world-assignment', () => {
    const world = new WorldStore();
    const map = new MapStructure(world, {
      width: 2,
      height: 2,
      cellSize: 5,
      origin: { x: 10, y: 20 }
    });
    const cell = map.cellAt(1, 1);
    return cell.grid.x === 1
      && cell.grid.y === 1
      && cell.world.x === 15
      && cell.world.y === 25
      && cell.mapId === map.mapId;
  });

  check('bounds-and-coordinate-uniqueness', () => {
    const world = new WorldStore();
    const map = new MapStructure(world, { width: 2, height: 2 });
    const ids = map.cellIds();
    return new Set(ids).size === 4
      && map.contains(0, 0)
      && map.contains(1, 1)
      && !map.contains(2, 1)
      && map.cellAt(-1, 0) === null;
  });

  check('tile-reference-update-only', () => {
    const world = new WorldStore();
    const map = new MapStructure(world, { width: 2, height: 1 });
    const before = map.cellAt(1, 0);
    const tile = map.createTile({ technicalName: 'ground.alt', classification: 'terrain' });
    const after = map.setTileAt(1, 0, tile.id);
    return before.id === after.id
      && before.mapId === after.mapId
      && after.tileId === tile.id
      && map.cellAt(0, 0).tileId === map.defaultTileId;
  });

  check('snapshot-detached-and-no-gameplay-entities', () => {
    const world = new WorldStore();
    const map = new MapStructure(world, { width: 2, height: 2 });
    const snap = map.snapshot();
    const kinds = new Set(world.ids().map(id => world.get(id)?.kind));
    return Object.isFrozen(snap)
      && Object.isFrozen(snap.cells)
      && snap.cells.length === 4
      && [...kinds].every(kind => ['map', 'tile', 'cell'].includes(kind));
  });

  const pass = results.every(result => result.pass);
  return Object.freeze({ pass, results: Object.freeze(results.map(Object.freeze)) });
}
