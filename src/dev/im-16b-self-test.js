import { createBaselineMiniworldScenario } from '../diagnostics/baseline-miniworld-scenario.js';
import { projectVisibleRuntimeState } from '../render/live-runtime-render-integration.js';
import { createWorldViewCameraState } from '../render/world-view-camera-state.js';
import { buildCameraProjectedWorldRenderCommands } from '../render/camera-world-rendering.js';
import {
  PlayerPlacementInteractionStateContract,
  resolveProjectedWorldTargetCell,
} from '../ui/player-placement-interaction-state-world-target.js';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function snapshotJson(value) {
  return JSON.stringify(value);
}

export function runIm16bSelfTest() {
  const composition = createBaselineMiniworldScenario();
  const { map, domains } = composition.authoritative;
  const beforeMap = snapshotJson(map.snapshot());
  const beforeBuildings = snapshotJson(domains.buildings.snapshot());

  const projection = projectVisibleRuntimeState({ map, domains });
  const cameraState = createWorldViewCameraState({
    viewportWidth: 900,
    viewportHeight: 700,
    offsetX: 28,
    offsetY: 28,
    zoom: 1.25,
  });
  const commands = buildCameraProjectedWorldRenderCommands(projection, cameraState, {
    cellPixels: 40,
    offset: { x: 0, y: 0 },
    buildingSize: 24,
    personRadius: 6,
  });
  const renderResult = Object.freeze({ projection, cameraState, commands });

  const gridCommands = commands.filter(command => command.role === 'grid-cell');
  assert(gridCommands.length === map.snapshot().cells.length, 'all real map cells must be camera-projected');

  const targetCommand = gridCommands.find(command => command.sourceId === map.cellIdAt(0, 0));
  assert(targetCommand, 'expected target grid command');
  const targetPoint = Object.freeze({
    x: targetCommand.x + targetCommand.width / 2,
    y: targetCommand.y + targetCommand.height / 2,
  });
  const resolvedCellId = resolveProjectedWorldTargetCell({ renderResult, point: targetPoint, map });
  assert(resolvedCellId === targetCommand.sourceId, 'screen point must resolve through projected grid geometry to real cellId');

  const outside = resolveProjectedWorldTargetCell({
    renderResult,
    point: { x: -500, y: -500 },
    map,
  });
  assert(outside === null, 'outside screen point must resolve to no target cell');

  const inactive = PlayerPlacementInteractionStateContract.inactive();
  assert(inactive.status === 'INACTIVE', 'initial placement state must be INACTIVE');
  assert(inactive.definitionId === null && inactive.targetCellId === null && inactive.evaluation === null, 'inactive state must carry no placement target');
  assert(Object.isFrozen(inactive), 'inactive state must be immutable');

  const activeNoTarget = PlayerPlacementInteractionStateContract.active({ definitionId: 'HQ' });
  assert(activeNoTarget.status === 'ACTIVE', 'active placement state required');
  assert(activeNoTarget.definitionId === 'HQ', 'active state must carry selected definitionId');
  assert(activeNoTarget.targetCellId === null && activeNoTarget.evaluation === null, 'active state may exist without target');
  assert(Object.isFrozen(activeNoTarget), 'active state must be immutable');

  const evaluation = Object.freeze({
    kind: 'authoritative-construction-placement-evaluation',
    valid: true,
    reason: 'VALID',
    candidate: Object.freeze({ definitionId: 'HQ', cellId: resolvedCellId }),
    cell: null,
  });
  const activeTarget = PlayerPlacementInteractionStateContract.active({
    definitionId: 'HQ',
    targetCellId: resolvedCellId,
    evaluation,
  });
  assert(activeTarget.evaluation === evaluation, 'IM-16B must retain the frozen IM-16A evaluation without reinterpretation');
  assert(activeTarget.targetCellId === resolvedCellId, 'active state must retain authoritative targetCellId');

  let mismatchRejected = false;
  try {
    PlayerPlacementInteractionStateContract.active({
      definitionId: 'WOODCUTTER',
      targetCellId: resolvedCellId,
      evaluation,
    });
  } catch {
    mismatchRejected = true;
  }
  assert(mismatchRejected, 'evaluation/definition mismatch must be rejected');

  assert(snapshotJson(map.snapshot()) === beforeMap, 'IM-16B targeting/state must not mutate map');
  assert(snapshotJson(domains.buildings.snapshot()) === beforeBuildings, 'IM-16B targeting/state must not mutate buildings');

  const source = PlayerPlacementInteractionStateContract.active.toString()
    + resolveProjectedWorldTargetCell.toString();
  for (const forbidden of ['BuildingRegistrationWorldOwnership', '.create(', '.register(', 'confirm', 'commit', 'ghost', 'preview']) {
    assert(!source.includes(forbidden), `IM-16B forbidden capability present: ${forbidden}`);
  }

  return Object.freeze({
    kind: 'im-16b-self-test-result',
    pass: true,
    resolvedCellId,
    outsideTarget: outside,
    inactiveStatus: inactive.status,
    activeStatus: activeTarget.status,
    noMutation: true,
    confirmCommitExcluded: true,
    previewExcluded: true,
  });
}
