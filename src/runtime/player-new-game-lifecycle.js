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
    if (this.#runtime.state !== 'READY') {
      return Object.freeze({ kind: 'im21f-new-game-result', status: 'REJECTED', reason: 'RUNTIME_NOT_READY' });
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
      readyStateOnly: true,
      freshComposition: true,
      runtimeAuthority: false,
      saveGameAuthority: false,
      storageMutation: false,
      inGameReset: false,
    });
  }
}
