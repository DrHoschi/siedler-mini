import assert from 'node:assert/strict';
import { projectGameState } from '../render/game-state-render-projection.js';
import {
  buildWorldRenderCommands,
  executeWorldRenderCommands,
  renderProjectedWorldToCanvas
} from '../render/world-canvas-rendering.js';

function fixture() {
  return projectGameState({
    map: {
      map: {
        id: 'map:00000001',
        kind: 'map',
        width: 2,
        height: 2,
        cellSize: 1,
        origin: { x: 0, y: 0 }
      },
      cells: [
        { id: 'cell:00000002', grid: { x: 1, y: 0 }, world: { x: 1, y: 0 }, tileId: 'tile:00000001' },
        { id: 'cell:00000001', grid: { x: 0, y: 0 }, world: { x: 0, y: 0 }, tileId: 'tile:00000001' }
      ]
    },
    buildings: {
      items: {
        'building:00000002': {
          id: 'building:00000002',
          identity: { buildingId: 'building:00000002', definitionId: 'WOODCUTTER' },
          lifecycle: { state: 'ACTIVE' },
          position: { x: 1.5, y: 1.25 }
        },
        'building:00000001': {
          id: 'building:00000001',
          identity: { buildingId: 'building:00000001', definitionId: 'HQ' },
          lifecycle: { state: 'ACTIVE' },
          position: { x: 0.5, y: 0.5 }
        }
      }
    },
    persons: {
      items: {
        'unit:00000002': {
          id: 'unit:00000002',
          identity: { personId: 'unit:00000002', existenceState: 'EXISTS' },
          position: { x: 1.25, y: 1.5 }
        },
        'unit:00000001': {
          id: 'unit:00000001',
          identity: { personId: 'unit:00000001', existenceState: 'EXISTS' },
          position: { x: 0.25, y: 0.25 }
        }
      }
    }
  });
}

function fakeContext() {
  const calls = [];
  return {
    calls,
    canvas: { width: 320, height: 200 },
    fillStyle: '#000000',
    strokeStyle: '#000000',
    clearRect: (...args) => calls.push(['clearRect', ...args]),
    fillRect: (...args) => calls.push(['fillRect', ...args]),
    strokeRect: (...args) => calls.push(['strokeRect', ...args]),
    beginPath: (...args) => calls.push(['beginPath', ...args]),
    arc: (...args) => calls.push(['arc', ...args]),
    fill: (...args) => calls.push(['fill', ...args])
  };
}

const projection = fixture();
const before = structuredClone(projection);
const options = { cellPixels: 20, offset: { x: 10, y: 12 }, buildingSize: 10, personRadius: 3, width: 320, height: 200 };

const first = buildWorldRenderCommands(projection, options);
const second = buildWorldRenderCommands(structuredClone(projection), options);
assert.deepEqual(first, second, 'equal projection must produce equal render commands');
assert.deepEqual(projection, before, 'render command generation must not mutate CR-28A projection');
assert.equal(Object.isFrozen(first), true);
assert.equal(Object.isFrozen(first[0]), true);

assert.equal(first[0].type, 'clear');
assert.equal(first[1].role, 'world-ground');
assert.notEqual(first[1].fillStyle, '#000000', 'world ground must not rely on invisible default black fill');
assert.equal(typeof first.find(command => command.role === 'grid-cell')?.strokeStyle, 'string');
assert.equal(typeof first.find(command => command.role === 'building')?.fillStyle, 'string');
assert.equal(typeof first.find(command => command.role === 'person')?.fillStyle, 'string');
assert.notEqual(first.find(command => command.role === 'building')?.fillStyle, first[1].fillStyle, 'buildings must remain distinguishable from ground');
assert.notEqual(first.find(command => command.role === 'person')?.fillStyle, first[1].fillStyle, 'persons must remain distinguishable from ground');
assert.deepEqual(
  first.filter(command => command.role === 'grid-cell').map(command => command.sourceId),
  ['cell:00000001', 'cell:00000002']
);
assert.deepEqual(
  first.filter(command => command.role === 'building').map(command => command.sourceId),
  ['building:00000001', 'building:00000002']
);
assert.deepEqual(
  first.filter(command => command.role === 'person').map(command => command.sourceId),
  ['unit:00000001', 'unit:00000002']
);

const changedProjection = structuredClone(projection);
changedProjection.persons[1].position.x = 1.75;
const changedCommands = buildWorldRenderCommands(changedProjection, options);
assert.notDeepEqual(changedCommands, first, 'projected visible position change must change render commands');

const ctxA = fakeContext();
const executed = executeWorldRenderCommands(ctxA, first, options);
assert.equal(executed, first.length);
assert.equal(ctxA.calls[0][0], 'clearRect');
assert.equal(ctxA.calls.some(call => call[0] === 'strokeRect'), true);
assert.equal(ctxA.calls.filter(call => call[0] === 'arc').length, 2);
assert.equal(ctxA.strokeStyle, first.find(command => command.role === 'grid-cell').strokeStyle);
assert.equal(ctxA.fillStyle, first.find(command => command.role === 'person').fillStyle);

const ctxB = fakeContext();
const directCommands = renderProjectedWorldToCanvas(ctxB, projection, options);
assert.deepEqual(directCommands, first);
assert.deepEqual(ctxB.calls, ctxA.calls, 'same projection must produce same canvas call sequence');
assert.equal(ctxB.fillStyle, ctxA.fillStyle, 'same projection must end with the same deterministic fill style');
assert.equal(ctxB.strokeStyle, ctxA.strokeStyle, 'same projection must end with the same deterministic stroke style');
assert.deepEqual(projection, before, 'canvas execution must not mutate projection/gameplay-visible data');

assert.equal(first.some(command => 'gameplaySecret' in command), false);
assert.equal(first.some(command => 'workforce' in command), false);
assert.equal(first.some(command => 'stock' in command), false);

console.log('CR-28B PASS / 0 BLOCKER');
