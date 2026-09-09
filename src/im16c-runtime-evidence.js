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
const placement = window.IM16BPlayerPlacementInteraction;
const preview = window.IM16CPlayerPlacementPreview;
const output = document.querySelector('#test-status');

if (!runtime || !placement || !preview) throw new Error('IM-16C runtime/placement/preview controllers required');

const beforeBuildings = JSON.stringify(runtime.domains.buildings.snapshot());
const initialProjection = preview.refresh();
assert(initialProjection.status === 'INACTIVE', 'IM-16C must start without active preview');

placement.activate('HQ');
const render = runtime.renderCurrentWorld();
const freeCellId = runtime.map.cellIdAt(0, 0);
const occupiedCellId = runtime.map.cellIdAt(2, 2);

placement.updateTarget(pointForCell(render, freeCellId));
const validProjection = preview.refresh();
assert(validProjection.status === 'VALID', 'free target must render VALID preview');
assert(validProjection.targetCellId === freeCellId, 'VALID preview must use frozen IM-16B target');
assert(validProjection.validity === 'VALID', 'VALID preview must preserve frozen IM-16A reason');

placement.updateTarget(pointForCell(runtime.renderCurrentWorld(), occupiedCellId));
const occupiedProjection = preview.refresh();
assert(occupiedProjection.status === 'INVALID', 'occupied target must render INVALID preview');
assert(occupiedProjection.validity === 'TARGET_CELL_OCCUPIED', 'occupied preview must preserve frozen IM-16A reason');

placement.updateTarget({ x: -1000, y: -1000 });
const noTargetProjection = preview.refresh();
assert(noTargetProjection.status === 'NO_TARGET', 'outside target must suppress preview');
assert(noTargetProjection.cellRect === null && noTargetProjection.ghostRect === null, 'NO_TARGET must draw no valid preview geometry');

placement.updateTarget(pointForCell(runtime.renderCurrentWorld(), freeCellId));
const finalProjection = preview.refresh();
assert(finalProjection.status === 'VALID', 'final visible evidence must leave a VALID preview');

assert(JSON.stringify(runtime.domains.buildings.snapshot()) === beforeBuildings, 'IM-16C evidence must not mutate buildings');
assert(preview.capabilities.buildingMutation === false, 'building mutation must remain excluded');
assert(preview.capabilities.confirmCommit === false, 'confirm/commit must remain excluded');
assert(preview.capabilities.inspectorAuthority === false, 'Inspector authority must remain excluded');
assert(runtime.config.build === 'IM-16C-PLAYER-PLACEMENT-PREVIEW-VALIDITY-PROJECTION-CONTRACT', 'IM-16C build identity required');

if (output) {
  output.textContent = `IM-16C — PASS · Preview INACTIVE · Free ${freeCellId}: VALID Ghost · Occupied ${occupiedCellId}: INVALID / TARGET_CELL_OCCUPIED · Outside: NO TARGET / suppressed · Camera-projected geometry only · No Building Mutation · No Confirm/Commit · Inspector read-only · Build Identity PASS`;
  output.dataset.pass = 'true';
}

window.IM16CRuntimeEvidence = Object.freeze({
  kind: 'im-16c-runtime-evidence',
  pass: true,
  freeCellId,
  freeStatus: validProjection.status,
  occupiedCellId,
  occupiedStatus: occupiedProjection.status,
  occupiedReason: occupiedProjection.validity,
  noTargetStatus: noTargetProjection.status,
  finalVisibleStatus: finalProjection.status,
  noBuildingMutation: true,
  confirmCommitExcluded: true,
  inspectorAuthorityExcluded: true,
});
