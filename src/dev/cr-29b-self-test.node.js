import assert from 'node:assert/strict';
import { createWorldViewCameraState } from '../render/world-view-camera-state.js';
import { projectRenderCommandsToScreen, projectPointToScreen } from '../render/world-to-screen-projection.js';
import { buildCameraProjectedWorldRenderCommands } from '../render/camera-world-rendering.js';

const camera = createWorldViewCameraState({
  viewportWidth: 390,
  viewportHeight: 844,
  offsetX: 20,
  offsetY: -10,
  zoom: 2,
});

const sourceCommands = Object.freeze([
  Object.freeze({ type: 'clear' }),
  Object.freeze({ type: 'fillRect', role: 'building', sourceId: 'B-1', x: 10, y: 15, width: 8, height: 6 }),
  Object.freeze({ type: 'fillCircle', role: 'person', sourceId: 'P-1', x: 5, y: 7, radius: 3 }),
]);

const projectedA = projectRenderCommandsToScreen(sourceCommands, camera);
const projectedB = projectRenderCommandsToScreen(sourceCommands, camera);
assert.deepEqual(projectedA, projectedB, 'same commands + camera must produce same screen result');
assert.equal(Object.isFrozen(projectedA), true);
assert.equal(Object.isFrozen(projectedA[1]), true);
assert.deepEqual(projectedA[1], {
  type: 'fillRect', role: 'building', sourceId: 'B-1', x: 40, y: 20, width: 16, height: 12,
});
assert.deepEqual(projectedA[2], {
  type: 'fillCircle', role: 'person', sourceId: 'P-1', x: 30, y: 4, radius: 6,
});
assert.deepEqual(sourceCommands[1], {
  type: 'fillRect', role: 'building', sourceId: 'B-1', x: 10, y: 15, width: 8, height: 6,
}, 'source commands must remain unchanged');

assert.deepEqual(projectPointToScreen({ x: 3, y: 4 }, camera), { x: 26, y: -2 });

const projection = Object.freeze({
  map: Object.freeze({
    id: 'MAP-1', kind: 'map', width: 2, height: 2,
    cells: Object.freeze([
      Object.freeze({ id: 'C-2', world: Object.freeze({ x: 1, y: 0 }) }),
      Object.freeze({ id: 'C-1', world: Object.freeze({ x: 0, y: 0 }) }),
    ]),
  }),
  buildings: Object.freeze([
    Object.freeze({ id: 'B-1', position: Object.freeze({ x: 1, y: 1 }) }),
  ]),
  persons: Object.freeze([
    Object.freeze({ id: 'P-1', position: Object.freeze({ x: 0.5, y: 1.5 }) }),
  ]),
});

const combinedA = buildCameraProjectedWorldRenderCommands(projection, camera, {
  cellPixels: 10,
  offset: { x: 0, y: 0 },
  buildingSize: 4,
  personRadius: 1,
});
const combinedB = buildCameraProjectedWorldRenderCommands(projection, camera, {
  cellPixels: 10,
  offset: { x: 0, y: 0 },
  buildingSize: 4,
  personRadius: 1,
});
assert.deepEqual(combinedA, combinedB, 'CR-28 render + CR-29A camera must compose deterministically');
assert.equal(combinedA.find(command => command.role === 'building').x, 36);
assert.equal(combinedA.find(command => command.role === 'building').y, 6);
assert.equal(combinedA.find(command => command.role === 'person').x, 30);
assert.equal(combinedA.find(command => command.role === 'person').y, 20);
assert.equal(Object.isFrozen(combinedA), true);

const changedCamera = createWorldViewCameraState({ ...camera, offsetX: 25 });
assert.notDeepEqual(
  projectRenderCommandsToScreen(sourceCommands, changedCamera),
  projectedA,
  'camera change must change screen-space result without changing world commands',
);

console.log('CR-29B PASS / 0 BLOCKER');
