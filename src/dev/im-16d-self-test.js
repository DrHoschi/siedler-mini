import { createBaselineMiniworldScenario } from '../diagnostics/baseline-miniworld-scenario.js';
import { AuthoritativeConstructionPlacementContract } from '../domain/authoritative-construction-placement-contract.js';
import { AuthoritativePlacementCommitBuildingRegistrationContract } from '../domain/authoritative-placement-commit-building-registration-contract.js';

function sameJson(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function runIM16DSelfTest() {
  const composition = createBaselineMiniworldScenario();
  const { map, domains } = composition.authoritative;
  const committer = new AuthoritativePlacementCommitBuildingRegistrationContract({ map, domains });
  const placement = new AuthoritativeConstructionPlacementContract({ map, domains });

  const freeCellId = map.cellIdAt(0, 0);
  const occupiedCellId = map.cellIdAt(2, 2);
  const before = domains.buildings.snapshot();

  const occupiedRejected = committer.commit({ definitionId: 'HQ', cellId: occupiedCellId });
  const afterOccupiedReject = domains.buildings.snapshot();

  const committed = committer.commit({ definitionId: 'HQ', cellId: freeCellId });
  const afterCommit = domains.buildings.snapshot();
  const created = domains.buildings.get(committed.buildingId);
  const mapCell = map.snapshot().cells.find(cell => cell.id === freeCellId);

  const postCommitEvaluation = placement.evaluate({ definitionId: 'HQ', cellId: freeCellId });
  const countBeforeRepeat = domains.buildings.size;
  const repeatedRejected = committer.commit({ definitionId: 'HQ', cellId: freeCellId });
  const countAfterRepeat = domains.buildings.size;

  const checks = Object.freeze({
    occupiedRejectedWithoutMutation:
      occupiedRejected.status === 'REJECTED'
      && occupiedRejected.reason === 'TARGET_CELL_OCCUPIED'
      && occupiedRejected.buildingId === null
      && sameJson(before, afterOccupiedReject),
    successfulCommitRegisteredExactlyOne:
      committed.status === 'COMMITTED'
      && committed.reason === 'VALID'
      && typeof committed.buildingId === 'string'
      && afterCommit.revision === before.revision + 1
      && Object.keys(afterCommit.items).length === Object.keys(before.items).length + 1,
    existingOwnersPreserved:
      created?.identity?.buildingId === committed.buildingId
      && created?.identity?.definitionId === 'HQ'
      && created?.lifecycle?.buildingId === committed.buildingId
      && created?.lifecycle?.state === 'EXISTS',
    authoritativeWorldPositionRegistered:
      created?.position?.x === mapCell?.world?.x
      && created?.position?.y === mapCell?.world?.y,
    finalRevalidationSeesCurrentBuildingState:
      postCommitEvaluation.valid === false
      && postCommitEvaluation.reason === 'TARGET_CELL_OCCUPIED'
      && postCommitEvaluation.occupiedBy?.id === committed.buildingId,
    repeatedCommitRejectedWithoutSecondRegistration:
      repeatedRejected.status === 'REJECTED'
      && repeatedRejected.reason === 'TARGET_CELL_OCCUPIED'
      && countAfterRepeat === countBeforeRepeat,
    immutableResults:
      Object.isFrozen(occupiedRejected)
      && Object.isFrozen(committed)
      && Object.isFrozen(repeatedRejected),
  });

  const pass = Object.values(checks).every(Boolean);
  return Object.freeze({
    kind: 'im-16d-self-test-result',
    pass,
    checks,
    evidence: Object.freeze({
      freeCellId,
      occupiedCellId,
      committedBuildingId: committed.buildingId,
      occupiedRejectReason: occupiedRejected.reason,
      repeatedRejectReason: repeatedRejected.reason,
      buildingCountBefore: Object.keys(before.items).length,
      buildingCountAfterCommit: Object.keys(afterCommit.items).length,
    }),
    capabilities: Object.freeze({
      finalAuthoritativeRevalidation: true,
      existingBuildingIdOwnerConsumed: true,
      existingIdentityLifecycleOwnersConsumed: true,
      existingRegistrationOwnerConsumed: true,
      authoritativeWorldPositionRegistered: true,
      playerConfirmCancel: false,
      pointerTouchCommitTrigger: false,
      costResourceGoldDeduction: false,
      constructionProgression: false,
      saveGameSpecialPath: false,
      inspectorMutation: false,
    }),
  });
}
