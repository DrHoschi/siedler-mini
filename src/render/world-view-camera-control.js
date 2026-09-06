import { createWorldViewCameraState, isWorldViewCameraState } from './world-view-camera-state.js';

function finite(value, name) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new TypeError(`${name} must be a finite number`);
  }
  return value;
}

function positive(value, name) {
  const number = finite(value, name);
  if (number <= 0) throw new RangeError(`${name} must be greater than 0`);
  return number;
}

function requireCameraState(cameraState) {
  if (!isWorldViewCameraState(cameraState)) {
    throw new TypeError('valid CR-29A camera state required');
  }
  return cameraState;
}

export const DEFAULT_CAMERA_CONTROL_LIMITS = Object.freeze({
  minZoom: 0.5,
  maxZoom: 3,
});

export function panWorldViewCamera(cameraState, { deltaX = 0, deltaY = 0 } = {}) {
  const current = requireCameraState(cameraState);
  return createWorldViewCameraState({
    ...current,
    offsetX: current.offsetX + finite(deltaX, 'deltaX'),
    offsetY: current.offsetY + finite(deltaY, 'deltaY'),
  });
}

export function zoomWorldViewCameraAt(cameraState, {
  factor,
  anchorX,
  anchorY,
  minZoom = DEFAULT_CAMERA_CONTROL_LIMITS.minZoom,
  maxZoom = DEFAULT_CAMERA_CONTROL_LIMITS.maxZoom,
} = {}) {
  const current = requireCameraState(cameraState);
  const zoomFactor = positive(factor, 'factor');
  const anchor = {
    x: finite(anchorX, 'anchorX'),
    y: finite(anchorY, 'anchorY'),
  };
  const min = positive(minZoom, 'minZoom');
  const max = positive(maxZoom, 'maxZoom');
  if (max < min) throw new RangeError('maxZoom must be greater than or equal to minZoom');

  const nextZoom = Math.min(max, Math.max(min, current.zoom * zoomFactor));
  const effectiveFactor = nextZoom / current.zoom;

  return createWorldViewCameraState({
    ...current,
    offsetX: anchor.x - (anchor.x - current.offsetX) * effectiveFactor,
    offsetY: anchor.y - (anchor.y - current.offsetY) * effectiveFactor,
    zoom: nextZoom,
  });
}

export function resizeWorldViewCameraViewport(cameraState, { viewportWidth, viewportHeight } = {}) {
  const current = requireCameraState(cameraState);
  return createWorldViewCameraState({
    ...current,
    viewportWidth: positive(viewportWidth, 'viewportWidth'),
    viewportHeight: positive(viewportHeight, 'viewportHeight'),
  });
}
