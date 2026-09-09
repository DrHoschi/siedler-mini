import { PlayerPlacementInteractionStateContract } from '../ui/player-placement-interaction-state-world-target.js';
import { projectPlayerPlacementPreview } from '../ui/player-placement-preview-validity-projection.js';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function fakeEvaluation({ definitionId, cellId, reason }) {
  return Object.freeze({
    kind: 'authoritative-construction-placement-evaluation',
    candidate: Object.freeze({ definitionId, cellId }),
    valid: reason === 'VALID',
    reason,
  });
}

function fakeRenderResult() {
  return Object.freeze({
    commands: Object.freeze([
      Object.freeze({ type: 'strokeRect', role: 'grid-cell', sourceId: 'cell:0:0', x: 10, y: 20, width: 40, height: 40 }),
      Object.freeze({ type: 'strokeRect', role: 'grid-cell', sourceId: 'cell:1:0', x: 50, y: 20, width: 40, height: 40 }),
    ]),
  });
}

export function runIM16CSelfTest() {
  const renderResult = fakeRenderResult();

  const inactive = projectPlayerPlacementPreview({
    placementState: PlayerPlacementInteractionStateContract.inactive(),
    renderResult,
  });
  assert(inactive.status === 'INACTIVE', 'inactive placement must project INACTIVE');
  assert(inactive.cellRect === null && inactive.ghostRect === null, 'inactive placement must not project preview geometry');

  const validState = PlayerPlacementInteractionStateContract.active({
    definitionId: 'HQ',
    targetCellId: 'cell:0:0',
    evaluation: fakeEvaluation({ definitionId: 'HQ', cellId: 'cell:0:0', reason: 'VALID' }),
  });
  const valid = projectPlayerPlacementPreview({ placementState: validState, renderResult });
  assert(valid.status === 'VALID', 'VALID evaluation must project VALID');
  assert(valid.validity === 'VALID', 'VALID reason must be preserved unchanged');
  assert(valid.targetCellId === 'cell:0:0', 'target cell must be preserved');
  assert(valid.cellRect.x === 10 && valid.cellRect.y === 20, 'preview must consume projected grid geometry');
  assert(valid.ghostRect.width < valid.cellRect.width, 'ghost must remain inside target cell');

  const occupiedState = PlayerPlacementInteractionStateContract.active({
    definitionId: 'HQ',
    targetCellId: 'cell:1:0',
    evaluation: fakeEvaluation({ definitionId: 'HQ', cellId: 'cell:1:0', reason: 'TARGET_CELL_OCCUPIED' }),
  });
  const occupied = projectPlayerPlacementPreview({ placementState: occupiedState, renderResult });
  assert(occupied.status === 'INVALID', 'occupied evaluation must project INVALID');
  assert(occupied.validity === 'TARGET_CELL_OCCUPIED', 'occupied reason must be preserved unchanged');

  const noTargetState = PlayerPlacementInteractionStateContract.active({ definitionId: 'HQ' });
  const noTarget = projectPlayerPlacementPreview({ placementState: noTargetState, renderResult });
  assert(noTarget.status === 'NO_TARGET', 'missing target must suppress preview');
  assert(noTarget.cellRect === null && noTarget.ghostRect === null, 'NO_TARGET must not expose valid preview geometry');

  const missingCommandState = PlayerPlacementInteractionStateContract.active({
    definitionId: 'HQ',
    targetCellId: 'cell:9:9',
    evaluation: fakeEvaluation({ definitionId: 'HQ', cellId: 'cell:9:9', reason: 'VALID' }),
  });
  const missingCommand = projectPlayerPlacementPreview({ placementState: missingCommandState, renderResult });
  assert(missingCommand.status === 'NO_TARGET', 'unprojected cell must not create second geometry truth');

  assert(Object.isFrozen(valid) && Object.isFrozen(valid.cellRect) && Object.isFrozen(valid.ghostRect), 'preview projection must be immutable');

  return Object.freeze({
    kind: 'im-16c-self-test-evidence',
    pass: true,
    inactive: inactive.status,
    valid: valid.status,
    occupied: occupied.status,
    noTarget: noTarget.status,
    projectedGeometryOnly: true,
    buildingMutation: false,
    confirmCommit: false,
    saveGamePersistence: false,
    inspectorAuthority: false,
  });
}
