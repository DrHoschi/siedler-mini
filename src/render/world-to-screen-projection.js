import { isWorldViewCameraState } from './world-view-camera-state.js';

function deepFreeze(value) {
  if (value == null || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function requireCameraState(cameraState) {
  if (!isWorldViewCameraState(cameraState)) {
    throw new TypeError('valid CR-29A camera state required');
  }
  return cameraState;
}

function transformCoordinate(value, offset, zoom) {
  return value * zoom + offset;
}

function transformLength(value, zoom) {
  return value * zoom;
}

export function projectRenderCommandsToScreen(commands, cameraState) {
  if (!Array.isArray(commands)) throw new TypeError('render commands array required');
  const camera = requireCameraState(cameraState);

  const projected = commands.map(command => {
    if (!command || typeof command !== 'object') {
      throw new TypeError('render command object required');
    }

    switch (command.type) {
      case 'clear':
        return { ...command };
      case 'fillRect':
      case 'strokeRect':
        return {
          ...command,
          x: transformCoordinate(command.x, camera.offsetX, camera.zoom),
          y: transformCoordinate(command.y, camera.offsetY, camera.zoom),
          width: transformLength(command.width, camera.zoom),
          height: transformLength(command.height, camera.zoom),
        };
      case 'fillCircle':
        return {
          ...command,
          x: transformCoordinate(command.x, camera.offsetX, camera.zoom),
          y: transformCoordinate(command.y, camera.offsetY, camera.zoom),
          radius: transformLength(command.radius, camera.zoom),
        };
      default:
        throw new TypeError(`unsupported render command: ${command.type}`);
    }
  });

  return deepFreeze(projected.map(command => deepFreeze(command)));
}

export function projectPointToScreen(point, cameraState) {
  const camera = requireCameraState(cameraState);
  if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) {
    throw new TypeError('finite point required');
  }

  return Object.freeze({
    x: transformCoordinate(point.x, camera.offsetX, camera.zoom),
    y: transformCoordinate(point.y, camera.offsetY, camera.zoom),
  });
}
