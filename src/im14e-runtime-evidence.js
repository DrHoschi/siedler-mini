import { RuntimeConfig } from './runtime/config.js?v=im14e-1';
import { createWorldViewCameraState } from './render/world-view-camera-state.js?v=im14e-1';
import {
  DEFAULT_CAMERA_CONTROL_LIMITS,
  panWorldViewCamera,
  zoomWorldViewCameraAt,
} from './render/world-view-camera-control.js?v=im14e-1';
import { computePinchGesture } from './ui/player-camera-controls-integration.js?v=im14e-1';

const EXPECTED_BUILD = 'IM-14E-PLAYER-CAMERA-CONTROLS-INTEGRATION';
const output = document.querySelector('#test-status');
const canvas = document.querySelector('#game-canvas');
const runtime = window.CleanRuntime;
const selection = window.IM14DWorldSelectionContext;
const camera = window.IM14EPlayerCameraControls;

function fail(message) {
  if (output) {
    output.textContent = `IM-14E — Player Camera Controls Integration — FAIL — ${message}`;
    output.dataset.pass = 'false';
  }
}

try {
  if (!runtime || !selection || !camera) throw new Error('IM-14D/IM-14E runtime boundaries unavailable');

  const synthetic = createWorldViewCameraState({
    viewportWidth: 400,
    viewportHeight: 300,
    offsetX: 20,
    offsetY: 30,
    zoom: 1,
  });
  const panned = panWorldViewCamera(synthetic, { deltaX: 12, deltaY: -7 });
  const singlePointerPanPass = panned.offsetX === 32 && panned.offsetY === 23 && panned.zoom === 1;

  const pinch = computePinchGesture([{ x: 10, y: 20 }, { x: 30, y: 20 }]);
  const pinchPass = pinch?.distance === 20 && pinch?.midpoint?.x === 20 && pinch?.midpoint?.y === 20;

  const zoomedIn = zoomWorldViewCameraAt(synthetic, { factor: 100, anchorX: 100, anchorY: 80 });
  const zoomedOut = zoomWorldViewCameraAt(synthetic, { factor: 0.001, anchorX: 100, anchorY: 80 });
  const frozenCameraPolicyPass = DEFAULT_CAMERA_CONTROL_LIMITS.minZoom === 0.5
    && DEFAULT_CAMERA_CONTROL_LIMITS.maxZoom === 3
    && runtime.cameraControlLimits === DEFAULT_CAMERA_CONTROL_LIMITS
    && zoomedIn.zoom === 3
    && zoomedOut.zoom === 0.5;

  const worldSurfacePass = canvas instanceof HTMLCanvasElement && canvas.style.touchAction === 'none';
  const unifiedInputPass = camera.input === selection.input
    && camera.capabilities?.unifiedWorldPointerInput === true
    && worldSurfacePass;
  const wheelZoomPass = camera.capabilities?.wheelZoom === true;
  const noDoubleProcessingPass = runtime.cameraInputOwner === 'IM-14E-UNIFIED-WORLD-INPUT'
    && camera.capabilities?.directCanvasPointerPipeline === false;
  const selectionRegressionPass = selection.kind === 'world-selection-context-controller'
    && typeof selection.getSelection === 'function'
    && camera.input === selection.input;
  const buildPass = RuntimeConfig.build === EXPECTED_BUILD;

  const pass = Boolean(
    unifiedInputPass
    && singlePointerPanPass
    && pinchPass
    && wheelZoomPass
    && selectionRegressionPass
    && noDoubleProcessingPass
    && frozenCameraPolicyPass
    && buildPass
  );

  if (output) {
    output.textContent = `IM-14E — Player Camera Controls Integration — ${pass ? 'PASS' : 'FAIL'} — Unified Camera Input ${unifiedInputPass ? 'PASS' : 'FAIL'} — Single-Pointer Pan ${singlePointerPanPass ? 'PASS' : 'FAIL'} — Pinch Zoom ${pinchPass ? 'PASS' : 'FAIL'} — Wheel Zoom ${wheelZoomPass ? 'PASS' : 'FAIL'} — Selection Regression ${selectionRegressionPass ? 'PASS' : 'FAIL'} — No Double Processing ${noDoubleProcessingPass ? 'PASS' : 'FAIL'} — Frozen Camera Policy ${frozenCameraPolicyPass ? 'PASS' : 'FAIL'} — Build Identity ${buildPass ? 'PASS' : `FAIL (${RuntimeConfig.build})`}`;
    output.dataset.pass = pass ? 'true' : 'false';
  }

  window.IM14ECameraControlsEvidence = Object.freeze({
    pass,
    unifiedInputPass,
    worldSurfacePass,
    singlePointerPanPass,
    pinchPass,
    wheelZoomPass,
    selectionRegressionPass,
    noDoubleProcessingPass,
    frozenCameraPolicyPass,
    buildPass,
  });

  console.info('[IM-14E] Player Camera Controls Integration evidence', window.IM14ECameraControlsEvidence);
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
  console.error('[IM-14E] Player Camera Controls Integration evidence failed', error);
}
