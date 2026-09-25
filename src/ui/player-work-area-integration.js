import { BuildingWorkAreaAuthority } from '../domain/building-work-area-authority.js';

function setHidden(element, hidden) {
  if (!element) return;
  element.hidden = hidden;
  element.setAttribute('aria-hidden', hidden ? 'true' : 'false');
}

function cloneArea(area) {
  return area ? { shape: area.shape, cx: area.cx, cy: area.cy, radius: area.radius } : null;
}

function createAuthority(runtime) {
  const active = runtime.getActiveRuntimeComposition()?.authoritative;
  return new BuildingWorkAreaAuthority({ domains: active?.domains, map: active?.map });
}

export function createPlayerWorkAreaIntegration({
  runtime,
  selectionController,
  contextPanel,
  workAreaButton,
  workspace,
  overlay,
  handle,
  buildButton,
  documentRef = document,
} = {}) {
  if (!runtime?.getActiveRuntimeComposition || !runtime?.renderCurrentWorld) throw new TypeError('active runtime boundary required');
  if (!selectionController?.subscribe || !selectionController?.getContext) throw new TypeError('frozen Selection boundary required');
  if (!(contextPanel instanceof Element) || !(workspace instanceof Element) || !(overlay instanceof HTMLCanvasElement) || !(handle instanceof Element)) {
    throw new TypeError('IM-21D Player Work Area surfaces required');
  }

  const ctx = overlay.getContext('2d');
  let editing = false;
  let buildingId = null;
  let original = null;
  let draft = null;
  let drag = null;

  function selectedBuildingId() {
    const selected = selectionController.getContext()?.selected;
    return selected?.kind === 'building' ? selected.id : null;
  }

  function projectionFor(id) {
    if (!id) return null;
    return createAuthority(runtime).project(id);
  }

  function renderOverlay(renderResult = null) {
    const rect = overlay.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, runtime.config?.render?.maxDevicePixelRatio ?? 2);
    const width = Math.max(1, rect.width), height = Math.max(1, rect.height);
    overlay.width = Math.max(1, Math.round(width * dpr));
    overlay.height = Math.max(1, Math.round(height * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    if (!editing || !draft) { setHidden(handle, true); return; }

    const rendered = renderResult ?? runtime.renderCurrentWorld();
    const scale = rendered.view.cellPixels * rendered.cameraState.zoom;
    const x = draft.cx * scale + rendered.cameraState.offsetX;
    const y = draft.cy * scale + rendered.cameraState.offsetY;
    const radius = draft.radius * scale;
    const validation = createAuthority(runtime).validate(buildingId, draft);

    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = validation.accepted ? 'rgba(92,170,104,.18)' : 'rgba(190,76,76,.20)';
    ctx.strokeStyle = validation.accepted ? 'rgba(151,224,160,.95)' : 'rgba(255,126,126,.95)';
    ctx.lineWidth = 2;
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    handle.style.left = `${x}px`;
    handle.style.top = `${y}px`;
    handle.dataset.valid = validation.accepted ? 'true' : 'false';
    setHidden(handle, false);
    const status = workspace.querySelector('[data-workarea-status]');
    if (status) status.textContent = validation.accepted ? 'Arbeitsbereich gültig' : 'Außerhalb der Weltgrenze';
    const confirm = workspace.querySelector('[data-workarea-action="CONFIRM"]');
    if (confirm) confirm.disabled = !validation.accepted;
  }

  function syncEntry() {
    if (editing) return;
    const id = selectedBuildingId();
    const projection = projectionFor(id);
    const eligible = projection?.eligible === true;
    if (workAreaButton) {
      workAreaButton.hidden = !eligible;
      workAreaButton.disabled = !eligible;
    }
  }

  function leave({ restoreContext = true } = {}) {
    editing = false; buildingId = null; original = null; draft = null; drag = null;
    setHidden(workspace, true); setHidden(handle, true);
    ctx.clearRect(0, 0, overlay.width, overlay.height);
    window.IM21CPlayerBuildCatalogPlacement?.setExternalSurfaceLock?.(null);
    if (buildButton) buildButton.disabled = false;
    if (restoreContext && selectedBuildingId()) setHidden(contextPanel, false);
    syncEntry();
  }

  function enter() {
    const id = selectedBuildingId();
    const projection = projectionFor(id);
    if (!projection?.eligible || !projection.area) return false;
    buildingId = id;
    original = cloneArea(projection.area);
    draft = cloneArea(projection.area);
    window.IM21CPlayerBuildCatalogPlacement?.setExternalSurfaceLock?.('IM21D_WORK_AREA');
    editing = true;
    setHidden(contextPanel, true);
    setHidden(workspace, false);
    if (buildButton) buildButton.disabled = true;
    renderOverlay();
    return true;
  }

  function commit() {
    if (!editing || !buildingId || !draft) return null;
    const result = createAuthority(runtime).commit(buildingId, draft);
    if (result.status === 'COMMITTED') {
      runtime.renderCurrentWorld();
      leave();
    } else {
      renderOverlay();
    }
    return result;
  }

  function cancel() {
    const before = original;
    leave();
    return Object.freeze({ status: 'CANCELLED', mutation: false, area: before });
  }

  const onContextClick = event => {
    const action = event.target instanceof Element ? event.target.closest('[data-context-action]')?.dataset?.contextAction : null;
    if (action !== 'WORKAREA') return;
    event.stopPropagation();
    enter();
  };
  contextPanel.addEventListener('click', onContextClick);

  const onWorkspaceClick = event => {
    const action = event.target instanceof Element ? event.target.closest('[data-workarea-action]')?.dataset?.workareaAction : null;
    if (action === 'CONFIRM') commit();
    if (action === 'CANCEL') cancel();
  };
  workspace.addEventListener('click', onWorkspaceClick);

  const onPointerDown = event => {
    if (!editing || !draft) return;
    event.preventDefault();
    handle.setPointerCapture?.(event.pointerId);
    drag = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, start: cloneArea(draft) };
  };
  const onPointerMove = event => {
    if (!drag || drag.pointerId !== event.pointerId || !editing) return;
    event.preventDefault();
    const rendered = runtime.renderCurrentWorld();
    const scale = rendered.view.cellPixels * rendered.cameraState.zoom;
    draft.cx = drag.start.cx + (event.clientX - drag.x) / scale;
    draft.cy = drag.start.cy + (event.clientY - drag.y) / scale;
    renderOverlay(rendered);
  };
  const onPointerEnd = event => {
    if (drag?.pointerId === event.pointerId) drag = null;
  };
  handle.addEventListener('pointerdown', onPointerDown);
  handle.addEventListener('pointermove', onPointerMove);
  handle.addEventListener('pointerup', onPointerEnd);
  handle.addEventListener('pointercancel', onPointerEnd);

  const unsubscribe = selectionController.subscribe(() => {
    if (editing && selectedBuildingId() !== buildingId) leave({ restoreContext: false });
    syncEntry();
  });
  const onResize = () => renderOverlay();
  window.addEventListener('resize', onResize, { passive: true });

  setHidden(workspace, true); setHidden(handle, true); syncEntry();

  return Object.freeze({
    kind: 'player-work-area-integration',
    enter, commit, cancel, renderOverlay,
    getState: () => Object.freeze({ editing, buildingId, original: cloneArea(original), draft: cloneArea(draft) }),
    capabilities: Object.freeze({
      gameplayAuthority: false,
      authoritativeMutationViaDomainBoundary: true,
      transientDraftOnly: true,
      explicitConfirmCancel: true,
      hiddenSurfaceTouchIsolation: true,
      legacyAuthority: false,
    }),
    destroy() {
      unsubscribe();
      window.removeEventListener('resize', onResize);
      contextPanel.removeEventListener('click', onContextClick);
      workspace.removeEventListener('click', onWorkspaceClick);
      handle.removeEventListener('pointerdown', onPointerDown);
      handle.removeEventListener('pointermove', onPointerMove);
      handle.removeEventListener('pointerup', onPointerEnd);
      handle.removeEventListener('pointercancel', onPointerEnd);
      leave({ restoreContext: false });
    },
  });
}

function publishInstallerDiagnostic(status, dependencies = {}, error = null) {
  const evidence = Object.freeze({
    kind: 'im-21d-work-area-installer-diagnostic',
    status,
    dependencies: Object.freeze({ ...dependencies }),
    error: error ? Object.freeze({ name: error.name ?? 'Error', message: error.message ?? String(error) }) : null,
  });
  window.IM21DWorkAreaDiagnostic = evidence;
  return evidence;
}

export function installIM21DPlayerWorkArea() {
  if (window.IM21DPlayerWorkArea) return window.IM21DPlayerWorkArea;
  const runtime = window.CleanRuntime;
  const selectionController = window.IM14DWorldSelectionContext;
  const contextPanel = document.querySelector('[data-player-context-panel]');
  const workAreaButton = document.querySelector('[data-context-action="WORKAREA"]');
  const workspace = document.querySelector('[data-player-workarea-controls]');
  const overlay = document.querySelector('#player-workarea-overlay-canvas');
  const handle = document.querySelector('[data-player-workarea-handle]');
  const buildButton = document.querySelector('[data-player-entry="build"]');
  const dependencies = {
    cleanRuntime: Boolean(runtime),
    selectionController: Boolean(selectionController),
    contextPanel: Boolean(contextPanel),
    workAreaButton: Boolean(workAreaButton),
    workspace: Boolean(workspace),
    overlay: Boolean(overlay),
    handle: Boolean(handle),
  };
  publishInstallerDiagnostic('INSTALLING', dependencies);
  if (!runtime || !selectionController || !contextPanel || !workspace || !overlay || !handle) return null;
  try {
    window.IM21DPlayerWorkArea = createPlayerWorkAreaIntegration({
      runtime, selectionController, contextPanel, workAreaButton, workspace, overlay, handle, buildButton, documentRef: document,
    });
    publishInstallerDiagnostic('INSTALLED', dependencies);
    return window.IM21DPlayerWorkArea;
  } catch (error) {
    publishInstallerDiagnostic('INSTALL_FAILED', dependencies, error);
    throw error;
  }
}

if (typeof window !== 'undefined') {
  const installer = window.setInterval(() => {
    if (installIM21DPlayerWorkArea()) window.clearInterval(installer);
  }, 25);
}
