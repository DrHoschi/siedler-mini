function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function pointForCell(renderResult, cellId) {
  const command = (renderResult?.commands ?? []).find(entry => entry?.role === 'grid-cell' && entry?.sourceId === cellId);
  if (!command) throw new Error(`grid command not found for ${cellId}`);
  return Object.freeze({
    x: command.x + command.width / 2,
    y: command.y + command.height / 2,
  });
}

const runtime = window.CleanRuntime;
const controller = window.IM16BPlayerPlacementInteraction;
const output = document.querySelector('#test-status');

if (!runtime || !controller) throw new Error('IM-16B runtime/controller required');

const beforeBuildings = JSON.stringify(runtime.domains.buildings.snapshot());
const initial = controller.getState();
assert(initial.status === 'INACTIVE', 'IM-16B must start INACTIVE');

controller.activate('HQ');
const active = controller.getState();
assert(active.status === 'ACTIVE' && active.definitionId === 'HQ', 'IM-16B active state required');

const render = runtime.renderCurrentWorld();
const freeCellId = runtime.map.cellIdAt(0, 0);
const occupiedCellId = runtime.map.cellIdAt(2, 2);

const freeState = controller.updateTarget(pointForCell(render, freeCellId));
assert(freeState.targetCellId === freeCellId, 'free target cell must resolve');
assert(freeState.evaluation?.reason === 'VALID', 'free target must consume IM-16A VALID');

const occupiedState = controller.updateTarget(pointForCell(runtime.renderCurrentWorld(), occupiedCellId));
assert(occupiedState.targetCellId === occupiedCellId, 'occupied target cell must resolve');
assert(occupiedState.evaluation?.reason === 'TARGET_CELL_OCCUPIED', 'occupied target must consume IM-16A occupied result');

const outsideState = controller.updateTarget({ x: -1000, y: -1000 });
assert(outsideState.targetCellId === null && outsideState.evaluation === null, 'outside target must clear temporary target only');

controller.deactivate();
const finalState = controller.getState();
assert(finalState.status === 'INACTIVE', 'temporary placement state must return to INACTIVE');
assert(JSON.stringify(runtime.domains.buildings.snapshot()) === beforeBuildings, 'IM-16B evidence must not mutate buildings');
assert(controller.capabilities.confirmCommit === false, 'confirm/commit must remain excluded');
assert(controller.capabilities.previewRendering === false, 'preview rendering must remain excluded');
assert(runtime.config.build === 'IM-16B-PLAYER-PLACEMENT-INTERACTION-STATE-WORLD-TARGET-CONTRACT', 'IM-16B build identity required');

if (output) {
  output.textContent = `IM-16B — PASS · INACTIVE→ACTIVE→INACTIVE · Free Target ${freeCellId}: VALID · Occupied Target ${occupiedCellId}: TARGET_CELL_OCCUPIED · Outside: NO TARGET · No Building Mutation · No Ghost/Preview · No Confirm/Commit · Build Identity PASS`;
  output.dataset.pass = 'true';
}

window.IM16BRuntimeEvidence = Object.freeze({
  kind: 'im-16b-runtime-evidence',
  pass: true,
  initialStatus: initial.status,
  activeStatus: active.status,
  finalStatus: finalState.status,
  freeCellId,
  freeReason: freeState.evaluation.reason,
  occupiedCellId,
  occupiedReason: occupiedState.evaluation.reason,
  outsideTargetCellId: outsideState.targetCellId,
  noBuildingMutation: true,
  confirmCommitExcluded: true,
  previewExcluded: true,
});
