const DEFAULT_WORLD_VIEW_CAMERA_STATE = Object.freeze({
  viewportWidth: 1,
  viewportHeight: 1,
  offsetX: 0,
  offsetY: 0,
  zoom: 1,
});

function requireFiniteNumber(value, fieldName) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new TypeError(`${fieldName} must be a finite number`);
  }
  return value;
}

function requirePositiveFiniteNumber(value, fieldName) {
  const finite = requireFiniteNumber(value, fieldName);
  if (finite <= 0) {
    throw new RangeError(`${fieldName} must be greater than 0`);
  }
  return finite;
}

/**
 * CR-29A renderer-facing camera/view state contract.
 *
 * This value object deliberately contains presentation state only. It does not
 * reference gameplay/world owners, perform world-to-screen transformation,
 * draw to Canvas, or handle user input. Those concerns belong to later CR-29
 * substeps.
 */
export function createWorldViewCameraState(input = {}) {
  if (input === null || typeof input !== 'object' || Array.isArray(input)) {
    throw new TypeError('camera state input must be an object');
  }

  const state = {
    viewportWidth: requirePositiveFiniteNumber(
      input.viewportWidth ?? DEFAULT_WORLD_VIEW_CAMERA_STATE.viewportWidth,
      'viewportWidth',
    ),
    viewportHeight: requirePositiveFiniteNumber(
      input.viewportHeight ?? DEFAULT_WORLD_VIEW_CAMERA_STATE.viewportHeight,
      'viewportHeight',
    ),
    offsetX: requireFiniteNumber(
      input.offsetX ?? DEFAULT_WORLD_VIEW_CAMERA_STATE.offsetX,
      'offsetX',
    ),
    offsetY: requireFiniteNumber(
      input.offsetY ?? DEFAULT_WORLD_VIEW_CAMERA_STATE.offsetY,
      'offsetY',
    ),
    zoom: requirePositiveFiniteNumber(
      input.zoom ?? DEFAULT_WORLD_VIEW_CAMERA_STATE.zoom,
      'zoom',
    ),
  };

  return Object.freeze(state);
}

export function isWorldViewCameraState(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  return (
    Number.isFinite(value.viewportWidth) && value.viewportWidth > 0 &&
    Number.isFinite(value.viewportHeight) && value.viewportHeight > 0 &&
    Number.isFinite(value.offsetX) &&
    Number.isFinite(value.offsetY) &&
    Number.isFinite(value.zoom) && value.zoom > 0
  );
}

export { DEFAULT_WORLD_VIEW_CAMERA_STATE };
