import { RuntimeConfig } from './runtime/config.js?v=im14b-1';
import {
  classifyInputTarget,
  createUnifiedPointerTouchInteraction,
  transitionContactLifecycle,
} from './ui/unified-pointer-touch-interaction.js?v=im14b-1';

const shell = document.querySelector('[data-ui-shell="player"]');
const topbar = document.querySelector('[data-ui-region="topbar"]');
const world = document.querySelector('[data-ui-region="world"]');
const actions = document.querySelector('[data-ui-region="actions"]');
const verification = document.querySelector('[data-ui-region="verification"]');
const canvas = document.querySelector('#game-canvas');
const output = document.querySelector('#test-status');

const expectedBuild = 'IM-14B-UNIFIED-POINTER-TOUCH-INTERACTION-CONTRACT';
const buildIdentityPass = RuntimeConfig.build === expectedBuild;
const requiredSurfacePass = Boolean(shell && topbar && world && actions && verification && canvas);

const classificationPass = requiredSurfacePass
  && classifyInputTarget(topbar).owner === 'UI'
  && classifyInputTarget(actions).owner === 'UI'
  && classifyInputTarget(verification).owner === 'UI'
  && classifyInputTarget(canvas).owner === 'WORLD';

const lifecyclePass = transitionContactLifecycle(null, 'pointerdown') === 'ACTIVE'
  && transitionContactLifecycle('ACTIVE', 'pointermove') === 'ACTIVE'
  && transitionContactLifecycle('ACTIVE', 'pointerup') === 'ENDED'
  && transitionContactLifecycle('ACTIVE', 'pointercancel') === 'CANCELLED'
  && transitionContactLifecycle('ENDED', 'pointerup') === 'ENDED';

const boundary = requiredSurfacePass
  ? createUnifiedPointerTouchInteraction({ root: shell, worldSurface: world })
  : null;

const boundaryPass = boundary?.kind === 'unified-pointer-touch-interaction'
  && boundary.activeContacts().length === 0;

const pass = Boolean(
  buildIdentityPass
  && requiredSurfacePass
  && classificationPass
  && lifecyclePass
  && boundaryPass
);

if (output) {
  const actualBuildSuffix = buildIdentityPass ? '' : ` (actual: ${RuntimeConfig.build})`;
  output.textContent = `IM-14B — Unified Pointer / Touch Interaction Contract — ${pass ? 'PASS' : 'FAIL'} — UI↔World Classification ${classificationPass ? 'PASS' : 'FAIL'} — Pointer Lifecycle ${lifecyclePass ? 'PASS' : 'FAIL'} — Unified Boundary ${boundaryPass ? 'PASS' : 'FAIL'} — Build Identity ${buildIdentityPass ? 'PASS' : 'FAIL'}${actualBuildSuffix} — keine neue Selection/Gameplay/Camera-Semantik`;
  output.dataset.pass = pass ? 'true' : 'false';
}

window.IM14BPointerTouchEvidence = Object.freeze({
  pass,
  buildIdentityPass,
  requiredSurfacePass,
  classificationPass,
  lifecyclePass,
  boundaryPass,
  boundary,
  classifyInputTarget,
  transitionContactLifecycle,
});

console.info('[IM-14B] Unified Pointer / Touch Interaction Contract', {
  pass,
  build: RuntimeConfig.build,
  classificationPass,
  lifecyclePass,
  boundaryPass,
  activeContacts: boundary?.activeContacts() ?? [],
  selectionNotIntroduced: true,
  gameplayMutationNotIntroduced: true,
  cameraSemanticsNotIntroduced: true,
});
