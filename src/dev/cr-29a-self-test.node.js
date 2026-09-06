import assert from 'node:assert/strict';
import {
  DEFAULT_WORLD_VIEW_CAMERA_STATE,
  createWorldViewCameraState,
  isWorldViewCameraState,
} from '../render/world-view-camera-state.js';

const source = {
  viewportWidth: 390,
  viewportHeight: 844,
  offsetX: -12.5,
  offsetY: 8.25,
  zoom: 1.75,
  gameplaySecret: { mustNotLeak: true },
};

const state = createWorldViewCameraState(source);
const repeated = createWorldViewCameraState({
  viewportWidth: 390,
  viewportHeight: 844,
  offsetX: -12.5,
  offsetY: 8.25,
  zoom: 1.75,
});

assert.deepEqual(state, repeated, 'equal input must produce equal camera state');
assert.deepEqual(Object.keys(state), [
  'viewportWidth',
  'viewportHeight',
  'offsetX',
  'offsetY',
  'zoom',
]);
assert.equal(Object.isFrozen(state), true, 'camera state must be immutable');
assert.equal(isWorldViewCameraState(state), true);
assert.equal('gameplaySecret' in state, false, 'unowned input fields must not leak');
assert.deepEqual(source.gameplaySecret, { mustNotLeak: true }, 'source must remain unchanged');

assert.throws(() => {
  state.zoom = 9;
}, TypeError, 'frozen state must reject mutation in modules');

assert.deepEqual(createWorldViewCameraState(), DEFAULT_WORLD_VIEW_CAMERA_STATE);

for (const [field, value] of [
  ['viewportWidth', 0],
  ['viewportHeight', -1],
  ['zoom', 0],
  ['zoom', -0.1],
  ['offsetX', Number.NaN],
  ['offsetY', Number.POSITIVE_INFINITY],
]) {
  assert.throws(
    () => createWorldViewCameraState({ [field]: value }),
    undefined,
    `${field}=${String(value)} must be rejected`,
  );
}

assert.equal(isWorldViewCameraState({}), false);
assert.equal(isWorldViewCameraState(null), false);

console.log('CR-29A PASS / 0 BLOCKER');
