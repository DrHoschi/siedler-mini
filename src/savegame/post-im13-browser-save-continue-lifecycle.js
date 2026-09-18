import { PostIM13AuthoritativeSnapshotIntegration } from './post-im13-authoritative-snapshot-integration.js';
import { PostIM13SaveGameRestoreIntegration } from './post-im13-savegame-restore-integration.js';
import { PostIM13DerivedStateRebindingIntegration } from './post-im13-derived-state-rebinding-integration.js';
import { PostIM13ActiveRuntimeCaptureAdapter } from './post-im13-active-runtime-capture-adapter.js';
import { PostContinueTransportExecutionAdapter } from '../transport/post-continue-transport-execution-adapter.js';
import { PostIM13ExactlyOnceRecoveryReconciliation } from './post-im13-exactly-once-recovery-reconciliation.js';

function compositionFrom(rebound) {
  const state = rebound.runtimeState;
  const derived = rebound.derivedState;
  return Object.freeze({
    kind: 'active-runtime-composition',
    scenarioId: 'IM20E_RESTORED_CONTINUE',
    authoritative: Object.freeze({
      ...state,
      residentHousingAssignment: derived.housing.assignmentIntegration,
      populationProjection: derived.population,
      goldFlowAdmission: null,
      goldSettlement: null,
      productionSettlementIds: Object.freeze([...state.productionSettlementIds]),
      goldSettlementIds: Object.freeze([...state.goldSettlementIds]),
      productionEffectReceipts: state.productionEffectReceipts,
      goldEffectReceipts: state.goldEffectReceipts,
      pathClassification: derived.navigation.pathClassification,
      pathClassificationEntries: derived.navigation.pathClassificationEntries,
      traversability: derived.navigation.traversability,
      reachabilityEvidence: null,
      personNavigationValidation: null,
      carrierMovementEvidence: null,
      carrierNavigationValidation: null,
      runtimeNavigationValidations: Object.freeze([]),
      blockedStaticCells: derived.navigation.traversability.entries(),
      runtimeValidationPass: true,
      classificationPass: true,
      playerPopulationHousingGoldProjection: derived.presentation.playerPopulationHousingGold,
      reboundDerivedState: derived,
    }),
  });
}

export class PostIM13BrowserSaveContinueLifecycle {
  #storage;
  #runtime;
  #getComposition;
  #publish;
  #resetCamera;
  #clearSelection;
  #capturePresentation;
  #restorePresentation;

  constructor({ storage, runtime, getComposition, publishComposition, resetCamera, clearSelection, capturePresentation, restorePresentation } = {}) {
    if (!storage || !runtime?.scheduler || typeof getComposition !== 'function' || typeof publishComposition !== 'function') {
      throw new TypeError('IM-20E lifecycle dependencies required');
    }
    this.#storage = storage;
    this.#runtime = runtime;
    this.#getComposition = getComposition;
    this.#publish = publishComposition;
    this.#resetCamera = typeof resetCamera === 'function' ? resetCamera : () => {};
    this.#clearSelection = typeof clearSelection === 'function' ? clearSelection : () => {};
    this.#capturePresentation = typeof capturePresentation === 'function' ? capturePresentation : () => null;
    this.#restorePresentation = typeof restorePresentation === 'function' ? restorePresentation : () => {};
  }

  save() {
    if (this.#runtime.state === 'RUNNING') {
      return new Promise((resolve, reject) => {
        const off = this.#runtime.scheduler.onCompletedStep((boundary) => {
          off();
          try { resolve(this.#captureAndStore(boundary.stepIndex)); } catch (error) { reject(error); }
        });
      });
    }
    return Promise.resolve(this.#captureAndStore(this.#runtime.scheduler.completedStepIndex));
  }

  #captureAndStore(stepIndex) {
    const snapshot = PostIM13ActiveRuntimeCaptureAdapter.capture(this.#getComposition(), stepIndex);
    const serialized = PostIM13AuthoritativeSnapshotIntegration.serialize(snapshot);
    const write = this.#storage.write(serialized);
    return Object.freeze({ kind: 'im20e-save-result', status: 'SAVED', stepIndex, write });
  }

  continueFromStorage() {
    if (this.#runtime.state === 'RUNNING') return Object.freeze({ kind: 'im20e-continue-result', status: 'REJECTED', reason: 'RUNTIME_RUNNING' });
    const serialized = this.#storage.read();
    if (serialized == null) return Object.freeze({ kind: 'im20e-continue-result', status: 'NO_SAVE' });
    let snapshot;
    try { snapshot = JSON.parse(serialized); }
    catch (error) { return Object.freeze({ kind: 'im20e-continue-result', status: 'REJECTED', reason: 'INVALID_JSON', error: String(error.message) }); }

    let restored = PostIM13SaveGameRestoreIntegration.restore(snapshot);
    if (restored.status !== 'RESTORED') return Object.freeze({ kind: 'im20e-continue-result', status: 'REJECTED', reason: 'RESTORE_REJECTED', restored });

    const state = restored.runtimeState;
    const delivered = state.transportExecutions.filter(value => value.state === 'DELIVERED');
    if (delivered.length > 1) return Object.freeze({ kind: 'im20e-continue-result', status: 'REJECTED', reason: 'RECOVERY_REJECTED', recovery: 'MULTIPLE_DELIVERED_EXECUTIONS_UNSUPPORTED' });
    const execution = delivered[0] ?? null;
    const job = execution ? state.domains.jobs.get(execution.jobId) : null;
    const binding = execution ? state.carrierBindings.find(value => value.jobId === execution.jobId) ?? null : null;
    const unit = execution ? state.domains.units.get(execution.unitId) : null;
    const recoveryPlan = PostIM13ExactlyOnceRecoveryReconciliation.plan({
      productionReceipts: state.productionEffectReceipts,
      goldReceipts: state.goldEffectReceipts,
      productionSettlementIds: [...state.productionSettlementIds],
      goldSettlementIds: [...state.goldSettlementIds],
      transport: execution ? { job, execution, claim: state.resourceClaims.get(job?.claimId), carrierBinding: binding, carrier: unit?.carrier ?? null, schedulerRegistered: false } : null,
    });
    if (recoveryPlan.status !== 'PLANNED') return Object.freeze({ kind: 'im20e-continue-result', status: 'REJECTED', reason: 'RECOVERY_REJECTED', recoveryPlan });

    let recovered = restored;
    let recoveryExecution = null;
    if (execution && recoveryPlan.transport?.decision !== PostIM13ExactlyOnceRecoveryReconciliation.decisions.ALREADY_COMPLETE_NOOP) {
      try {
        // Recovery runs on a second, unpublished restore candidate. A partial failure can therefore
        // be discarded without mutating either the active runtime or the first validated restore.
        const recoveryCandidate = PostIM13SaveGameRestoreIntegration.restore(snapshot);
        if (recoveryCandidate.status !== 'RESTORED') throw new Error('fresh IM-20F recovery candidate restore failed');
        const candidateState = recoveryCandidate.runtimeState;
        const provisionalRebound = PostIM13DerivedStateRebindingIntegration.rebind(recoveryCandidate);
        if (provisionalRebound.status !== 'REBOUND') throw new Error('IM-20F recovery candidate rebind failed');
        const candidateTransport = new PostContinueTransportExecutionAdapter({ state: candidateState, transport: provisionalRebound.derivedState.transport });
        recoveryExecution = candidateTransport.recoverDelivered({ decision: recoveryPlan.transport.decision, jobId: execution.jobId });
        const evolved = candidateTransport.authoritativeTransportState();
        for (const carrier of evolved.carriers) candidateState.domains.units.update(carrier.unitId, draft => { draft.carrier = structuredClone(carrier); });
        candidateState.carrierBindings = evolved.carrierBindings;
        candidateState.transportExecutions = evolved.transportExecutions;
        recovered = Object.freeze({ ...recoveryCandidate, runtimeState: candidateState });
        restored = recovered;
      } catch (error) {
        return Object.freeze({ kind: 'im20e-continue-result', status: 'REJECTED', reason: 'RECOVERY_EXECUTION_FAILED', error: String(error.message), recoveryPlan, candidateDiscarded: true });
      }
    }

    const rebound = PostIM13DerivedStateRebindingIntegration.rebind(recovered);
    if (rebound.status !== 'REBOUND') return Object.freeze({ kind: 'im20e-continue-result', status: 'REJECTED', reason: 'REBIND_REJECTED', rebound });

    const previous = this.#getComposition();
    const previousPresentation = this.#capturePresentation();
    const candidate = compositionFrom(rebound);
    const transport = new PostContinueTransportExecutionAdapter({ state: rebound.runtimeState, transport: rebound.derivedState.transport });
    const unregister = [];
    try {
      for (const descriptor of rebound.derivedState.scheduler.registrations) {
        unregister.push(this.#runtime.scheduler.register({
          id: descriptor.id,
          phase: descriptor.phase,
          tick: transport.tickFor(descriptor),
        }));
      }
      this.#publish(candidate);
      this.#resetCamera();
      this.#clearSelection();
      this.#runtime.start();
      return Object.freeze({
        kind: 'im20e-continue-result', status: 'CONTINUED', captureStepIndex: rebound.captureStepIndex,
        schedulerRegistrationCount: unregister.length, restored, rebound, transport, recoveryPlan, recoveryExecution,
      });
    } catch (error) {
      for (const off of unregister.reverse()) off();
      const rollbackErrors = [];
      try { this.#publish(previous); } catch (rollbackError) { rollbackErrors.push(String(rollbackError.message)); }
      try { this.#restorePresentation(previousPresentation); } catch (rollbackError) { rollbackErrors.push(String(rollbackError.message)); }
      return Object.freeze({ kind: 'im20e-continue-result', status: 'REJECTED', reason: 'ACTIVATION_FAILED', error: String(error.message), rollbackErrors: Object.freeze(rollbackErrors) });
    }
  }

  static capabilities() {
    return Object.freeze({
      browserStorage: true, completedStepCapture: true, v2Restore: true, derivedStateRebinding: true,
      atomicRuntimeActivation: true, schedulerInstallation: true, continueLifecycle: true,
      exactlyOnceRecoveryReconciliation: true,
      unpublishedCandidateRecoveryPlanning: true,
      failedRecoveryCandidateDiscard: true,
      evolvedCandidateCaptureContinuity: true,
    });
  }
}
