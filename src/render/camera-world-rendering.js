import { buildWorldRenderCommands, executeWorldRenderCommands } from './world-canvas-rendering.js';
import { projectRenderCommandsToScreen } from './world-to-screen-projection.js';

export function buildCameraProjectedWorldRenderCommands(projection, cameraState, options = {}) {
  const worldCommands = buildWorldRenderCommands(projection, options);
  return projectRenderCommandsToScreen(worldCommands, cameraState);
}

export function renderProjectedWorldWithCameraToCanvas(ctx, projection, cameraState, options = {}) {
  const commands = buildCameraProjectedWorldRenderCommands(projection, cameraState, options);
  executeWorldRenderCommands(ctx, commands, {
    width: cameraState.viewportWidth,
    height: cameraState.viewportHeight,
  });
  return commands;
}
