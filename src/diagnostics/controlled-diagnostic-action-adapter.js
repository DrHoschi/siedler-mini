export const IM15D_ACTIONS = Object.freeze({
  START: 'START',
  PAUSE: 'PAUSE',
  SINGLE_STEP: 'SINGLE_STEP',
  RESET_BASELINE_MINIWORLD: 'RESET_BASELINE_MINIWORLD',
});

const ALLOWED_ACTION_IDS = Object.freeze(Object.values(IM15D_ACTIONS));

function deepFreeze(value) {
  if (value == null || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function result({
  actionId,
  scenarioId = null,
  status,
  previousRuntimeState,
  currentRuntimeState,
  stepMs = null,
  message = null,
}) {
  return deepFreeze({
    kind: 'im15d-diagnostic-action-result',
    actionId,
    scenarioId,
    status,
    previousRuntimeState,
    currentRuntimeState,
    stepMs,
    message,
  });
}

function requireBoundary(boundary) {
  if (!boundary?.runtime || typeof boundary.runtime.start !== 'function' || typeof boundary.runtime.pause !== 'function') {
    throw new TypeError('IM-15D runtime lifecycle boundary required');
  }
  if (!boundary.runtime.scheduler || typeof boundary.runtime.scheduler.step !== 'function') {
    throw new TypeError('IM-15D scheduler boundary required');
  }
  if (typeof boundary.resetBaselineMiniworld !== 'function') {
    throw new TypeError('IM-15D baseline scenario reset boundary required');
  }
  return boundary;
}

export function createControlledDiagnosticActionAdapter(boundary) {
  const source = requireBoundary(boundary);
  let lastResult = null;

  function reject(actionId, previousRuntimeState, message) {
    lastResult = result({
      actionId,
      status: 'REJECTED',
      previousRuntimeState,
      currentRuntimeState: source.runtime.state,
      message,
    });
    return lastResult;
  }

  function fail(actionId, previousRuntimeState, error, scenarioId = null) {
    lastResult = result({
      actionId,
      scenarioId,
      status: 'FAILED',
      previousRuntimeState,
      currentRuntimeState: source.runtime.state,
      message: error instanceof Error ? error.message : String(error),
    });
    return lastResult;
  }

  function execute(actionId) {
    if (!ALLOWED_ACTION_IDS.includes(actionId)) {
      throw new RangeError(`unsupported IM-15D action: ${actionId}`);
    }

    const previousRuntimeState = source.runtime.state;

    try {
      if (actionId === IM15D_ACTIONS.START) {
        if (!['READY', 'PAUSED'].includes(previousRuntimeState)) {
          return reject(actionId, previousRuntimeState, `START not allowed from ${previousRuntimeState}`);
        }
        source.runtime.start();
        lastResult = result({
          actionId,
          status: 'COMPLETED',
          previousRuntimeState,
          currentRuntimeState: source.runtime.state,
        });
        return lastResult;
      }

      if (actionId === IM15D_ACTIONS.PAUSE) {
        if (previousRuntimeState !== 'RUNNING') {
          return reject(actionId, previousRuntimeState, `PAUSE not allowed from ${previousRuntimeState}`);
        }
        source.runtime.pause();
        lastResult = result({
          actionId,
          status: 'COMPLETED',
          previousRuntimeState,
          currentRuntimeState: source.runtime.state,
        });
        return lastResult;
      }

      if (actionId === IM15D_ACTIONS.SINGLE_STEP) {
        if (!['READY', 'PAUSED'].includes(previousRuntimeState)) {
          return reject(actionId, previousRuntimeState, `SINGLE_STEP not allowed from ${previousRuntimeState}`);
        }
        const stepMs = source.runtime.scheduler.stepMs;
        source.runtime.scheduler.step(stepMs);
        lastResult = result({
          actionId,
          status: 'COMPLETED',
          previousRuntimeState,
          currentRuntimeState: source.runtime.state,
          stepMs,
        });
        return lastResult;
      }

      if (actionId === IM15D_ACTIONS.RESET_BASELINE_MINIWORLD) {
        if (previousRuntimeState === 'RUNNING') {
          return reject(actionId, previousRuntimeState, 'RESET_BASELINE_MINIWORLD not allowed while RUNNING');
        }
        const reset = source.resetBaselineMiniworld();
        lastResult = result({
          actionId,
          scenarioId: reset?.scenarioId ?? 'BASELINE_MINIWORLD',
          status: 'COMPLETED',
          previousRuntimeState,
          currentRuntimeState: source.runtime.state,
        });
        return lastResult;
      }
    } catch (error) {
      return fail(actionId, previousRuntimeState, error, actionId === IM15D_ACTIONS.RESET_BASELINE_MINIWORLD ? 'BASELINE_MINIWORLD' : null);
    }

    return reject(actionId, previousRuntimeState, 'action unavailable');
  }

  return Object.freeze({
    kind: 'im15d-controlled-diagnostic-action-adapter',
    actionIds: ALLOWED_ACTION_IDS,
    execute,
    getLastResult: () => lastResult,
  });
}
