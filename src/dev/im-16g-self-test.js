import { projectAuthoritativeConstructionResult, createAuthoritativeConstructionResultPlayerUIProjection } from '../ui/authoritative-construction-result-player-ui-projection.js';

function frozenCommit({ status, definitionId, buildingId = null, reason }) {
  const commitResult = Object.freeze({
    kind: 'authoritative-placement-commit-result',
    status,
    reason,
    candidate: Object.freeze({ definitionId, cellId: 'cell:0001' }),
    buildingId,
  });
  return Object.freeze({
    kind: 'player-placement-confirm-result',
    status: status === 'COMMITTED' ? 'COMMITTED' : 'REJECTED',
    reason,
    commitResult,
  });
}

export function runIM16GSelfTest() {
  const committedConfirm = frozenCommit({ status: 'COMMITTED', definitionId: 'WOODCUTTER', buildingId: 'building:00000042', reason: 'VALID' });
  const rejectedConfirm = frozenCommit({ status: 'REJECTED', definitionId: 'STOREHOUSE', reason: 'TARGET_CELL_OCCUPIED' });
  const notReady = Object.freeze({ kind: 'player-placement-confirm-result', status: 'NOT_READY', reason: 'ACTIVE_TARGET_REQUIRED', commitResult: null });
  const cancel = Object.freeze({ kind: 'player-placement-cancel-result', status: 'CANCELLED', buildingMutation: false });

  const committedProjection = projectAuthoritativeConstructionResult(committedConfirm);
  const rejectedProjection = projectAuthoritativeConstructionResult(rejectedConfirm);
  const notReadyProjection = projectAuthoritativeConstructionResult(notReady);
  const cancelProjection = projectAuthoritativeConstructionResult(cancel);

  let lastResult = null;
  const interaction = Object.freeze({ getLastResult: () => lastResult });
  const controller = createAuthoritativeConstructionResultPlayerUIProjection({ confirmInteraction: interaction });
  const initial = controller.sync();
  lastResult = committedConfirm;
  const firstSync = controller.sync();
  lastResult = notReady;
  const afterNotReady = controller.sync();
  lastResult = rejectedConfirm;
  const rejectedSync = controller.sync();

  const checks = Object.freeze({
    successProjectsActualCommitResult:
      committedProjection?.status === 'COMMITTED'
      && committedProjection.buildingId === 'building:00000042'
      && committedProjection.definitionId === 'WOODCUTTER'
      && committedProjection.source === committedConfirm.commitResult,
    rejectionProjectsAuthoritativeReason:
      rejectedProjection?.status === 'REJECTED'
      && rejectedProjection.reason === 'TARGET_CELL_OCCUPIED'
      && rejectedProjection.definitionId === 'STOREHOUSE'
      && rejectedProjection.source === rejectedConfirm.commitResult,
    nonCommitResultsDoNotCreateConstructionTruth:
      notReadyProjection === null
      && cancelProjection === null
      && initial === null,
    controllerConsumesOnlyNewActualCommitResults:
      firstSync?.status === 'COMMITTED'
      && firstSync.buildingId === committedProjection.buildingId
      && firstSync.definitionId === committedProjection.definitionId
      && firstSync.source === committedConfirm.commitResult
      && afterNotReady === firstSync
      && rejectedSync?.status === 'REJECTED'
      && rejectedSync.reason === 'TARGET_CELL_OCCUPIED'
      && rejectedSync.source === rejectedConfirm.commitResult,
    immutableProjection:
      Object.isFrozen(committedProjection)
      && Object.isFrozen(rejectedProjection),
    ownershipBoundaryPreserved:
      controller.capabilities.consumesActualIM16DCommitResultOnly === true
      && controller.capabilities.previewValiditySuccessInference === false
      && controller.capabilities.controlStateSuccessInference === false
      && controller.capabilities.worldRenderSuccessInference === false
      && controller.capabilities.buildingMutationAuthority === false
      && controller.capabilities.commitAuthority === false
      && controller.capabilities.placementValidityAuthority === false
      && controller.capabilities.runtimeRenderAuthority === false
      && controller.capabilities.saveGameAuthority === false
      && controller.capabilities.inspectorAuthority === false,
  });

  return Object.freeze({
    kind: 'im-16g-self-test-result',
    pass: Object.values(checks).every(Boolean),
    checks,
    evidence: Object.freeze({
      committedBuildingId: committedProjection.buildingId,
      committedDefinitionId: committedProjection.definitionId,
      rejectedDefinitionId: rejectedProjection.definitionId,
      rejectedReason: rejectedProjection.reason,
    }),
  });
}
