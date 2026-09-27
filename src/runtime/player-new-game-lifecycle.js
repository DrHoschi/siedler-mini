export class PlayerNewGameLifecycle {
  #runtime;
  #createComposition;
  #publish;
  #resetCamera;
  #clearSelection;

  constructor({ runtime, createComposition, publishComposition, resetCamera, clearSelection } = {}) {
    if (!runtime || typeof createComposition !== 'function' || typeof publishComposition !== 'function') {
      throw new TypeError('IM-21F New Game dependencies required');
    }
    this.#runtime = runtime;
    this.#createComposition = createComposition;
    this.#publish = publishComposition;
    this.#resetCamera = typeof resetCamera === 'function' ? resetCamera : () => {};
    this.#clearSelection = typeof clearSelection === 'function' ? clearSelection : () => {};
  }

  startFresh() {
    if (!['READY', 'PAUSED'].includes(this.#runtime.state)) {
      return Object.freeze({ kind: 'im21f-new-game-result', status: 'REJECTED', reason: 'RUNTIME_NOT_STARTABLE' });
    }
    const composition = this.#createComposition();
    this.#publish(composition);
    this.#resetCamera();
    this.#clearSelection();
    this.#runtime.start();
    return Object.freeze({ kind: 'im21f-new-game-result', status: 'STARTED', scenarioId: composition.scenarioId });
  }

  static capabilities() {
    return Object.freeze({
      startableRuntimeStates: Object.freeze(['READY', 'PAUSED']),
      freshComposition: true,
      runtimeAuthority: false,
      saveGameAuthority: false,
      storageMutation: false,
      inGameReset: false,
    });
  }
}
