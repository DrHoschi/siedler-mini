import assert from 'node:assert/strict';
import { createWorldViewCameraState } from '../render/world-view-camera-state.js';
import {
  DEFAULT_CAMERA_CONTROL_LIMITS,
  panWorldViewCamera,
  resizeWorldViewCameraViewport,
  zoomWorldViewCameraAt,
} from '../render/world-view-camera-control.js';
import { projectPointToScreen } from '../render/world-to-screen-projection.js';

const initial = createWorldViewCameraState({
  viewportWidth: 800,
  viewportHeight: 600,
  offsetX: 20,
  offsetY: 30,
  zoom: 1,
});

const panned = panWorldViewCamera(initial, { deltaX: 12, deltaY: -8 });
assert.deepEqual(panned, {
  viewportWidth: 800,
  viewportHeight: 600,
  offsetX: 32,
  offsetY: 22,
  zoom: 1,
});
assert.deepEqual(initial, {
  viewportWidth: 800,
  viewportHeight: 600,
  offsetX: 20,
  offsetY: 30,
  zoom: 1,
}, 'pan must not mutate the previous immutable camera state');
assert.equal(Object.isFrozen(panned), true);

const worldPoint = { x: 100, y: 50 };
const beforeAnchorZoom = projectPointToScreen(worldPoint, initial);
const zoomed = zoomWorldViewCameraAt(initial, {
  factor: 2,
  anchorX: beforeAnchorZoom.x,
  anchorY: beforeAnchorZoom.y,
});
const afterAnchorZoom = projectPointToScreen(worldPoint, zoomed);
assert.deepEqual(afterAnchorZoom, beforeAnchorZoom, 'zoom anchor must stay fixed on screen');
assert.equal(zoomed.zoom, 2);
assert.equal(Object.isFrozen(zoomed), true);

const clampedHigh = zoomWorldViewCameraAt(initial, {
  factor: 100,
  anchorX: 0,
  anchorY: 0,
});
assert.equal(clampedHigh.zoom, DEFAULT_CAMERA_CONTROL_LIMITS.maxZoom);

const clampedLow = zoomWorldViewCameraAt(initial, {
  factor: 0.001,
  anchorX: 0,
  anchorY: 0,
});
assert.equal(clampedLow.zoom, DEFAULT_CAMERA_CONTROL_LIMITS.minZoom);

const resized = resizeWorldViewCameraViewport(initial, {
  viewportWidth: 1024,
  viewportHeight: 768,
});
assert.deepEqual(resized, {
  viewportWidth: 1024,
  viewportHeight: 768,
  offsetX: 20,
  offsetY: 30,
  zoom: 1,
});

assert.deepEqual(
  panWorldViewCamera(initial, { deltaX: 5, deltaY: 7 }),
  panWorldViewCamera(initial, { deltaX: 5, deltaY: 7 }),
  'same camera operation must be deterministic',
);

assert.throws(() => panWorldViewCamera(initial, { deltaX: Number.NaN }), TypeError);
assert.throws(() => zoomWorldViewCameraAt(initial, { factor: 0, anchorX: 0, anchorY: 0 }), RangeError);
assert.throws(() => zoomWorldViewCameraAt(initial, { factor: 1.2, anchorX: Number.NaN, anchorY: 0 }), TypeError);

console.log('CR-29C PASS / 0 BLOCKER');
