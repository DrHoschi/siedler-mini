function setHidden(element, hidden) {
  if (!element) return;
  element.hidden = hidden;
  element.setAttribute('aria-hidden', hidden ? 'true' : 'false');
}

export function createPlayerSystemMenuIntegration({
  runtimeBoundary,
  menuButton,
  startSurface,
  pauseSurface,
  helpSurface,
  statusOutput,
  newGameLifecycle,
  saveLifecycle,
  buildIntegration,
  workAreaIntegration,
  settlementIntegration,
  selectionController,
  placementInteraction,
  documentRef = document,
} = {}) {
  const runtime = runtimeBoundary?.runtime;
  if (!runtime || !newGameLifecycle || !saveLifecycle) throw new TypeError('IM-21F lifecycle boundaries required');
  if (!(menuButton instanceof Element) || !(startSurface instanceof Element) || !(pauseSurface instanceof Element)) throw new TypeError('IM-21F menu surfaces required');

  let mode = 'START';
  let helpOpen = false;
  let busy = false;

  function feedback(value) {
    for (const output of documentRef.querySelectorAll('[data-player-system-status]')) output.textContent = String(value ?? '');
  }

  function availability() {
    const value = saveLifecycle.availability();
    const button = startSurface.querySelector('[data-system-action="CONTINUE"]');
    if (button) {
      button.disabled = value.status !== 'AVAILABLE';
      button.setAttribute('aria-disabled', value.status === 'AVAILABLE' ? 'false' : 'true');
    }
    return value;
  }

  function closeCompetingSurfaces() {
    if (placementInteraction?.getLastResult && window.IM16BPlayerPlacementInteraction?.getState?.().status === 'ACTIVE') placementInteraction.cancel();
    if (workAreaIntegration?.getState?.().editing) workAreaIntegration.cancel();
    settlementIntegration?.hide?.();
    selectionController?.clear?.();
    buildIntegration?.setExternalSurfaceLock?.('IM21F_SYSTEM_MENU');
  }

  function render() {
    setHidden(startSurface, mode !== 'START');
    setHidden(pauseSurface, mode !== 'PAUSE');
    setHidden(helpSurface, !helpOpen);
    menuButton.setAttribute('aria-expanded', mode === 'PAUSE' ? 'true' : 'false');
    if (mode === 'START') availability();
  }

  function showPause() {
    if (mode === 'START') return false;
    closeCompetingSurfaces();
    if (runtime.state === 'RUNNING') runtime.pause();
    mode = 'PAUSE';
    helpOpen = false;
    feedback('Spiel pausiert');
    render();
    return true;
  }

  function resume() {
    if (mode !== 'PAUSE') return false;
    helpOpen = false;
    buildIntegration?.setExternalSurfaceLock?.(null);
    if (runtime.state === 'PAUSED' || runtime.state === 'READY') runtime.start();
    mode = 'GAME';
    feedback('');
    render();
    return true;
  }

  async function save() {
    if (busy) return false;
    busy = true;
    feedback('Speichern …');
    try {
      const result = await saveLifecycle.save();
      feedback(result.status === 'SAVED' ? 'Spiel gespeichert' : result.status);
      availability();
      return result;
    } catch (error) {
      feedback(`Speichern fehlgeschlagen: ${error.message}`);
      return Object.freeze({ status: 'ERROR', error: String(error.message) });
    } finally {
      busy = false;
    }
  }

  function startNewGame() {
    if (busy || mode !== 'START') return false;
    const result = newGameLifecycle.startFresh();
    if (result.status === 'STARTED') {
      mode = 'GAME';
      buildIntegration?.setExternalSurfaceLock?.(null);
      runtimeBoundary.renderCurrentWorld();
      feedback('');
      render();
    } else feedback(`Neues Spiel nicht gestartet: ${result.reason}`);
    return result;
  }

  function continueGame() {
    if (busy || mode !== 'START') return false;
    const available = availability();
    if (available.status !== 'AVAILABLE') {
      feedback(available.status === 'NO_SAVE' ? 'Kein Spielstand vorhanden' : 'Spielstand nicht verwendbar');
      return Object.freeze({ status: 'REJECTED', reason: available.status });
    }
    const result = saveLifecycle.continueFromStorage();
    if (result.status === 'CONTINUED') {
      mode = 'GAME';
      buildIntegration?.setExternalSurfaceLock?.(null);
      runtimeBoundary.renderCurrentWorld();
      feedback('');
      render();
    } else feedback(`Weiter nicht möglich: ${result.reason ?? result.status}`);
    return result;
  }

  async function fullscreen() {
    const root = documentRef.documentElement;
    try {
      if (documentRef.fullscreenElement) await documentRef.exitFullscreen?.();
      else if (root.requestFullscreen) await root.requestFullscreen();
      else if (root.webkitRequestFullscreen) root.webkitRequestFullscreen();
      else return Object.freeze({ status: 'UNAVAILABLE' });
      return Object.freeze({ status: 'REQUESTED' });
    } catch (error) {
      feedback('Vollbild ist auf diesem Gerät nicht verfügbar');
      return Object.freeze({ status: 'UNAVAILABLE', error: String(error.message) });
    }
  }

  function action(event) {
    const button = event.target instanceof Element ? event.target.closest('[data-system-action]') : null;
    if (!button || button.disabled) return;
    event.stopPropagation();
    const value = button.dataset.systemAction;
    if (value === 'NEW_GAME') startNewGame();
    else if (value === 'CONTINUE') continueGame();
    else if (value === 'RESUME') resume();
    else if (value === 'SAVE') void save();
    else if (value === 'HELP') { helpOpen = !helpOpen; render(); }
    else if (value === 'FULLSCREEN') void fullscreen();
  }

  menuButton.addEventListener('click', event => { event.stopPropagation(); showPause(); });
  startSurface.addEventListener('click', action);
  pauseSurface.addEventListener('click', action);
  helpSurface?.addEventListener('click', action);
  closeCompetingSurfaces();
  render();

  return Object.freeze({
    kind: 'player-system-menu-integration',
    showPause, resume, save, startNewGame, continueGame, availability, fullscreen,
    getState: () => Object.freeze({ mode, helpOpen, busy }),
    capabilities: Object.freeze({
      runtimeAuthority: false,
      saveGameAuthority: false,
      gameplayAuthority: false,
      presentationStateOnly: true,
      exclusiveWorkingSurface: true,
      hiddenSurfaceTouchIsolation: true,
      helpMutation: false,
      fullscreenOptional: true,
    }),
  });
}

export function installIM21FPlayerSystemMenu() {
  if (window.IM21FPlayerSystemMenu) return window.IM21FPlayerSystemMenu;
  const runtimeBoundary = window.CleanRuntime;
  const dependencies = {
    runtimeBoundary,
    menuButton: document.querySelector('[data-player-entry="runtime"]'),
    startSurface: document.querySelector('[data-player-system-menu="start"]'),
    pauseSurface: document.querySelector('[data-player-system-menu="pause"]'),
    helpSurface: document.querySelector('[data-player-system-help]'),
    statusOutput: document.querySelector('[data-player-system-status]'),
    newGameLifecycle: runtimeBoundary?.im21fNewGameLifecycle,
    saveLifecycle: runtimeBoundary?.im20eLifecycle,
    buildIntegration: window.IM21CPlayerBuildCatalogPlacement,
    workAreaIntegration: window.IM21DPlayerWorkArea,
    settlementIntegration: window.IM21EPlayerEconomySettlementOverview,
    selectionController: window.IM14DWorldSelectionContext,
    placementInteraction: window.IM16EPlayerPlacementConfirmCancel,
  };
  if (!dependencies.runtimeBoundary || !dependencies.menuButton || !dependencies.startSurface || !dependencies.pauseSurface ||
      !dependencies.newGameLifecycle || !dependencies.saveLifecycle || !dependencies.buildIntegration ||
      !dependencies.workAreaIntegration || !dependencies.settlementIntegration || !dependencies.selectionController ||
      !dependencies.placementInteraction) return null;
  window.IM21FPlayerSystemMenu = createPlayerSystemMenuIntegration(dependencies);
  return window.IM21FPlayerSystemMenu;
}

if (typeof window !== 'undefined') {
  let attempts = 0;
  const installer = window.setInterval(() => {
    attempts += 1;
    if (installIM21FPlayerSystemMenu() || attempts >= 160) window.clearInterval(installer);
  }, 25);
}
