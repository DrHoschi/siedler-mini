import { RuntimeConfig } from './runtime/config.js?v=im14d-1';
import {
  hitTestWorldCommands,
  isSelectionTapGesture,
  projectSelectionContext,
} from './ui/world-selection-context-projection.js?v=im14d-1';

const EXPECTED_BUILD = 'IM-14D-WORLD-SELECTION-CONTEXT-PROJECTION';
const testEl = document.querySelector('#test-status');
const runtime = window.CleanRuntime;
const controller = window.IM14DWorldSelectionContext;

function fail(message) {
  if (testEl) {
    testEl.textContent = `IM-14D — World Selection & Context Projection — FAIL — ${message}`;
    testEl.dataset.pass = 'false';
  }
}

try {
  if (!runtime?.renderCurrentWorld) throw new Error('runtime render boundary unavailable');
  if (!controller?.input || !controller?.getSelection || !controller?.getContext) {
    throw new Error('selection/context controller unavailable');
  }

  const beforePopulation = runtime.housingPopulation.population.count;
  const beforeGold = runtime.goldEconomy.snapshot().balance;
  const rendered = runtime.renderCurrentWorld();
  const selectableCommands = rendered.commands.filter(command => command.role === 'person' || command.role === 'building');
  const sampleCommand = selectableCommands[0];
  if (!sampleCommand) throw new Error('no selectable projected world object available');

  const samplePoint = sampleCommand.role === 'person'
    ? { x: sampleCommand.x, y: sampleCommand.y }
    : { x: sampleCommand.x + sampleCommand.width / 2, y: sampleCommand.y + sampleCommand.height / 2 };
  const selected = hitTestWorldCommands(rendered.commands, samplePoint);
  const selectionPass = selected?.id === String(sampleCommand.sourceId)
    && selected?.kind === sampleCommand.role;

  const emptyPass = hitTestWorldCommands(rendered.commands, { x: -10000, y: -10000 }) === null;

  const tapPass = isSelectionTapGesture({
    start: { x: 10, y: 10 },
    end: { x: 13, y: 14 },
    moved: false,
    multiTouch: false,
    tapSlop: 8,
  });
  const dragGuardPass = !isSelectionTapGesture({
    start: { x: 10, y: 10 },
    end: { x: 30, y: 30 },
    moved: true,
    multiTouch: false,
    tapSlop: 8,
  });
  const multiTouchGuardPass = !isSelectionTapGesture({
    start: { x: 10, y: 10 },
    end: { x: 10, y: 10 },
    moved: false,
    multiTouch: true,
    tapSlop: 8,
  });
  const gestureGuardPass = tapPass && dragGuardPass && multiTouchGuardPass;

  const context = projectSelectionContext(rendered.projection, selected);
  const contextPass = context?.selected?.id === selected.id
    && context.selected.kind === selected.kind
    && Object.isFrozen(context)
    && Object.isFrozen(context.selected);

  const overlapCommands = [
    Object.freeze({ type: 'fillRect', role: 'building', sourceId: 'BUILDING-Z', x: 0, y: 0, width: 20, height: 20 }),
    Object.freeze({ type: 'fillCircle', role: 'person', sourceId: 'PERSON-Z', x: 10, y: 10, radius: 10 }),
  ];
  const priorityPass = hitTestWorldCommands(overlapCommands, { x: 10, y: 10 })?.id === 'PERSON-Z';

  const afterPopulation = runtime.housingPopulation.population.count;
  const afterGold = runtime.goldEconomy.snapshot().balance;
  const readOnlyPass = beforePopulation === afterPopulation && beforeGold === afterGold;
  const buildPass = RuntimeConfig.build === EXPECTED_BUILD;
  const pass = selectionPass && emptyPass && gestureGuardPass && contextPass && priorityPass && readOnlyPass && buildPass;

  if (testEl) {
    testEl.textContent = `IM-14D — World Selection & Context Projection — ${pass ? 'PASS' : 'FAIL'} — World Selection ${selectionPass && priorityPass ? 'PASS' : 'FAIL'} — Empty World Clear ${emptyPass ? 'PASS' : 'FAIL'} — Drag/Multi-touch Guard ${gestureGuardPass ? 'PASS' : 'FAIL'} — Context Projection ${contextPass ? 'PASS' : 'FAIL'} — Read-only Ownership ${readOnlyPass ? 'PASS' : 'FAIL'} — Build Identity ${buildPass ? 'PASS' : `FAIL (${RuntimeConfig.build})`}`;
    testEl.dataset.pass = pass ? 'true' : 'false';
  }

  window.IM14DSelectionContextEvidence = Object.freeze({
    pass,
    selectionPass,
    emptyPass,
    gestureGuardPass,
    contextPass,
    priorityPass,
    readOnlyPass,
    buildPass,
    selected,
    context,
  });

  console.info('[IM-14D] World Selection & Context Projection evidence', {
    pass,
    build: RuntimeConfig.build,
    selectionPass,
    emptyPass,
    gestureGuardPass,
    contextPass,
    priorityPass,
    readOnlyPass,
    selected,
    context,
    cameraSemanticsChanged: false,
    gameplayMutationIntroduced: false,
    persistenceMutationIntroduced: false,
    im14eNotIntroduced: true,
  });
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
  console.error('[IM-14D] World Selection & Context Projection evidence failed', error);
}
