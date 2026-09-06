import assert from 'node:assert/strict';
import {
  projectBuildings,
  projectGameState,
  projectMap,
  projectPersons
} from '../render/game-state-render-projection.js';

function fixture() {
  return {
    map: {
      map: {
        id: 'map:00000001',
        kind: 'map',
        width: 2,
        height: 2,
        cellSize: 1,
        origin: { x: 0, y: 0 },
        metadata: { ignored: true }
      },
      defaultTileId: 'tile:00000001',
      cells: [
        { id: 'cell:00000002', grid: { x: 1, y: 0 }, world: { x: 1, y: 0 }, tileId: 'tile:00000001', ignored: 'x' },
        { id: 'cell:00000001', grid: { x: 0, y: 0 }, world: { x: 0, y: 0 }, tileId: 'tile:00000001', ignored: 'x' }
      ]
    },
    buildings: {
      revision: 2,
      items: {
        'building:00000002': {
          id: 'building:00000002',
          kind: 'building',
          identity: { buildingId: 'building:00000002', definitionId: 'WOODCUTTER' },
          lifecycle: { state: 'ACTIVE', internalCounter: 99 },
          position: { x: 5, y: 7 },
          gameplaySecret: { writable: true }
        },
        'building:00000001': {
          id: 'building:00000001',
          kind: 'building',
          identity: { buildingId: 'building:00000001', definitionId: 'HQ' },
          lifecycle: { state: 'ACTIVE' },
          position: { x: 2, y: 3 }
        }
      }
    },
    persons: {
      revision: 1,
      items: {
        'unit:00000002': {
          id: 'unit:00000002',
          kind: 'unit',
          identity: { personId: 'unit:00000002', existenceState: 'EXISTS' },
          position: { x: 4, y: 6 },
          workforce: { capability: 'CAN_SIMPLE_TRANSPORT' }
        },
        'unit:00000001': {
          id: 'unit:00000001',
          kind: 'unit',
          identity: { personId: 'unit:00000001', existenceState: 'EXISTS' },
          position: { x: 1, y: 1 }
        }
      }
    }
  };
}

const source = fixture();
const before = structuredClone(source);

const mapProjection = projectMap(source.map);
assert.equal(mapProjection.id, 'map:00000001');
assert.deepEqual(mapProjection.cells.map(cell => cell.id), ['cell:00000001', 'cell:00000002']);
assert.equal('metadata' in mapProjection, false);

const buildingProjection = projectBuildings(source.buildings);
assert.deepEqual(buildingProjection.map(entry => entry.id), ['building:00000001', 'building:00000002']);
assert.deepEqual(buildingProjection[1].position, { x: 5, y: 7 });
assert.equal(buildingProjection[1].definitionId, 'WOODCUTTER');
assert.equal('gameplaySecret' in buildingProjection[1], false);

const personProjection = projectPersons(source.persons);
assert.deepEqual(personProjection.map(entry => entry.id), ['unit:00000001', 'unit:00000002']);
assert.deepEqual(personProjection[1].position, { x: 4, y: 6 });
assert.equal('workforce' in personProjection[1], false);

const first = projectGameState(source);
const second = projectGameState(structuredClone(source));
assert.deepEqual(first, second);
assert.deepEqual(source, before, 'projection must not mutate source state');
assert.equal(Object.isFrozen(first), true);
assert.equal(Object.isFrozen(first.map.cells), true);
assert.equal(Object.isFrozen(first.buildings[0].position), true);
assert.equal(Object.isFrozen(first.persons[0].position), true);

assert.throws(() => {
  first.buildings[0].position.x = 999;
}, TypeError);
assert.deepEqual(source, before, 'projection output must not alias source state');

const changed = fixture();
changed.persons.items['unit:00000002'].position.x = 9;
assert.equal(projectGameState(changed).persons[1].position.x, 9);

const irrelevantChanged = fixture();
irrelevantChanged.buildings.items['building:00000002'].gameplaySecret.writable = false;
assert.deepEqual(projectGameState(irrelevantChanged), first);

console.log('CR-28A PASS / 0 BLOCKER');
