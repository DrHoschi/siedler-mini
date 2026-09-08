import {
  IM15D_ACTIONS,
  createControlledDiagnosticActionAdapter,
} from '../diagnostics/controlled-diagnostic-action-adapter.js?v=im15d-1';

function renderActionResult(result, root = document) {
  const output = root.querySelector('#inspector-action-result');
  if (!output) throw new TypeError('IM-15D action result output required');
  if (!result) {
    output.textContent = 'Noch keine Diagnoseaktion ausgeführt.';
    output.dataset.status = 'idle';
    return null;
  }

  const scenario = result.scenarioId ? ` · ${result.scenarioId}` : '';
  const step = result.stepMs != null ? ` · ${result.stepMs} ms` : '';
  const message = result.message ? ` · ${result.message}` : '';
  output.textContent = `${result.actionId} · ${result.status} · ${result.previousRuntimeState} → ${result.currentRuntimeState}${scenario}${step}${message}`;
  output.dataset.status = result.status.toLowerCase();
  return result;
}

function refreshExistingObservationSurfaces() {
  window.IM14CRuntimeHud?.refresh?.();
  window.IM15AInspector?.refresh?.();
  window.IM15BInspectorDiagnostics?.refresh?.();
}

export function createControlledDiagnosticScenarioActionsController({
  runtimeBoundary = window.CleanRuntime,
  root = document,
  selectionController = window.IM14DWorldSelectionContext,
} = {}) {
  if (!runtimeBoundary) throw new TypeError('IM-15D runtime boundary required');

  const adapter = createControlledDiagnosticActionAdapter(runtimeBoundary);
  const buttons = [...root.querySelectorAll('[data-im15d-action]')];
  if (buttons.length !== 4) throw new TypeError('exactly four IM-15D action controls required');

  function refreshAvailability() {
    const state = runtimeBoundary.runtime.state;
    for (const button of buttons) {
      const actionId = button.dataset.im15dAction;
      button.disabled = (
        (actionId === IM15D_ACTIONS.START && !['READY', 'PAUSED'].includes(state))
        || (actionId === IM15D_ACTIONS.PAUSE && state !== 'RUNNING')
        || (actionId === IM15D_ACTIONS.SINGLE_STEP && !['READY', 'PAUSED'].includes(state))
        || (actionId === IM15D_ACTIONS.RESET_BASELINE_MINIWORLD && state === 'RUNNING')
      );
    }
    return state;
  }

  function execute(actionId) {
    const result = adapter.execute(actionId);
    if (result.status === 'COMPLETED' && actionId === IM15D_ACTIONS.RESET_BASELINE_MINIWORLD) {
      selectionController?.clear?.();
    }
    runtimeBoundary.renderCurrentWorld?.();
    refreshExistingObservationSurfaces();
    renderActionResult(result, root);
    refreshAvailability();
    return result;
  }

  const listeners = buttons.map(button => {
    const handler = () => execute(button.dataset.im15dAction);
    button.addEventListener('click', handler);
    return { button, handler };
  });

  const unsubscribeState = runtimeBoundary.runtime.events.on('runtime.stateChanged', () => {
    refreshAvailability();
    refreshExistingObservationSurfaces();
  });

  renderActionResult(null, root);
  refreshAvailability();

  return Object.freeze({
    kind: 'im15d-controlled-diagnostic-scenario-actions-controller',
    actionIds: adapter.actionIds,
    execute,
    refreshAvailability,
    getLastResult: adapter.getLastResult,
    destroy() {
      for (const { button, handler } of listeners) button.removeEventListener('click', handler);
      unsubscribeState?.();
    },
  });
}

const inspectorShell = document.querySelector('[data-ui-shell="inspector"]');
if (inspectorShell && window.CleanRuntime) {
  window.IM15DControlledActions = createControlledDiagnosticScenarioActionsController({
    runtimeBoundary: window.CleanRuntime,
    root: document,
    selectionController: window.IM14DWorldSelectionContext,
  });

  const status = document.querySelector('#test-status');
  if (status) {
    status.textContent = 'IM-15D — IMPLEMENTED / NOT FROZEN — Controlled Diagnostic Actions aktiv · START / PAUSE / SINGLE STEP / RESET BASELINE_MINIWORLD allowlisted';
    status.dataset.pass = 'pending';
  }
}
