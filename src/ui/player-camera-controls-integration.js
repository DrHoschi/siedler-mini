function distance(a, b) {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

function midpoint(a, b) {
  return Object.freeze({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
}

export function computePinchGesture(points) {
  if (!Array.isArray(points) || points.length !== 2) return null;
  const [a, b] = points;
  const d = distance(a, b);
  if (!(d > 0)) return null;
  return Object.freeze({ midpoint: midpoint(a, b), distance: d });
}

export function createPlayerCameraControlsIntegration({
  selectionController,
  runtime,
  canvas,
} = {}) {
  const input = selectionController?.input;
  if (!input || typeof input.subscribe !== 'function') {
    throw new TypeError('frozen IM-14D shared input boundary required');
  }
  if (!runtime || typeof runtime.panCameraBy !== 'function' || typeof runtime.zoomCameraAt !== 'function') {
    throw new TypeError('IM-14E runtime camera mutation boundary required');
  }
  if (!(canvas instanceof HTMLCanvasElement)) throw new TypeError('game canvas required');

  const active = new Map();
  let previousSingle = null;
  let previousPinch = null;
  const metrics = {
    panMutations: 0,
    pinchZoomMutations: 0,
    wheelZoomMutations: 0,
    worldSamples: 0,
  };

  function currentPinch() {
    return computePinchGesture([...active.values()]);
  }

  function pan(deltaX, deltaY) {
    runtime.panCameraBy({ deltaX, deltaY });
    metrics.panMutations += 1;
  }

  function zoom({ factor, anchorX, anchorY, source }) {
    runtime.zoomCameraAt({ factor, anchorX, anchorY });
    if (source === 'pinch') metrics.pinchZoomMutations += 1;
    if (source === 'wheel') metrics.wheelZoomMutations += 1;
  }

  const unsubscribe = input.subscribe(input.owners.WORLD, sample => {
    metrics.worldSamples += 1;

    if (sample.phase === 'pointerdown') {
      canvas.setPointerCapture?.(sample.pointerId);
      active.set(sample.pointerId, sample.local);
      previousSingle = active.size === 1 ? sample.local : null;
      previousPinch = currentPinch();
      return;
    }

    if (!active.has(sample.pointerId)) return;

    if (sample.phase === 'pointermove') {
      active.set(sample.pointerId, sample.local);
      if (active.size === 1) {
        if (previousSingle) {
          pan(sample.local.x - previousSingle.x, sample.local.y - previousSingle.y);
        }
        previousSingle = sample.local;
        previousPinch = null;
        return;
      }

      const pinch = currentPinch();
      if (pinch && previousPinch && previousPinch.distance > 0) {
        pan(
          pinch.midpoint.x - previousPinch.midpoint.x,
          pinch.midpoint.y - previousPinch.midpoint.y,
        );
        zoom({
          factor: pinch.distance / previousPinch.distance,
          anchorX: pinch.midpoint.x,
          anchorY: pinch.midpoint.y,
          source: 'pinch',
        });
      }
      previousPinch = pinch;
      previousSingle = null;
      return;
    }

    if (sample.phase === 'pointerup' || sample.phase === 'pointercancel') {
      active.delete(sample.pointerId);
      const remaining = [...active.values()];
      previousSingle = remaining.length === 1 ? remaining[0] : null;
      previousPinch = currentPinch();
    }
  });

  function wheelHandler(event) {
    event.preventDefault();
    const rect = canvas.getBoundingClientRect();
    zoom({
      factor: Math.exp(-event.deltaY * 0.0015),
      anchorX: event.clientX - rect.left,
      anchorY: event.clientY - rect.top,
      source: 'wheel',
    });
  }

  canvas.style.touchAction = 'none';
  canvas.addEventListener('wheel', wheelHandler, { passive: false });

  return Object.freeze({
    kind: 'player-camera-controls-integration',
    input,
    cameraPolicy: runtime.cameraControlLimits,
    getActivePointers: () => Object.freeze([...active.entries()].map(([pointerId, point]) => Object.freeze({ pointerId, point }))),
    getMetrics: () => Object.freeze({ ...metrics }),
    destroy() {
      unsubscribe();
      canvas.removeEventListener('wheel', wheelHandler);
      active.clear();
    },
  });
}

const canvas = document.querySelector('#game-canvas');

if (canvas && window.CleanRuntime && window.IM14DWorldSelectionContext) {
  window.IM14EPlayerCameraControls = createPlayerCameraControlsIntegration({
    selectionController: window.IM14DWorldSelectionContext,
    runtime: window.CleanRuntime,
    canvas,
  });
}
