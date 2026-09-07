import { RuntimeConfig } from './runtime/config.js';

const shell = document.querySelector('[data-ui-shell="player"]');
const topbar = document.querySelector('[data-ui-region="topbar"]');
const world = document.querySelector('[data-ui-region="world"]');
const actions = document.querySelector('[data-ui-region="actions"]');
const canvas = document.querySelector('#game-canvas');
const output = document.querySelector('#test-status');

const requiredRegionsPresent = Boolean(shell && topbar && world && actions && canvas);
const viewportContractPresent = document.querySelector('meta[name="viewport"]')?.content.includes('viewport-fit=cover') === true;
const buildIdentityPass = RuntimeConfig.build === 'IM-14A-PLAYER-UI-SHELL-RESPONSIVE-SURFACE-CONTRACT';

function regionFitsViewport(element) {
  if (!(element instanceof Element)) return false;
  const rect = element.getBoundingClientRect();
  return rect.left >= -1
    && rect.top >= -1
    && rect.right <= window.innerWidth + 1
    && rect.bottom <= window.innerHeight + 1;
}

function evaluateResponsiveSurface() {
  const shellFits = regionFitsViewport(shell);
  const topbarFits = regionFitsViewport(topbar);
  const actionsFit = regionFitsViewport(actions);
  const canvasRect = canvas?.getBoundingClientRect();
  const worldRect = world?.getBoundingClientRect();
  const canvasBoundToWorld = Boolean(canvasRect && worldRect
    && Math.abs(canvasRect.left - worldRect.left) <= 1
    && Math.abs(canvasRect.top - worldRect.top) <= 1
    && Math.abs(canvasRect.width - worldRect.width) <= 1
    && Math.abs(canvasRect.height - worldRect.height) <= 1);

  const pass = requiredRegionsPresent
    && viewportContractPresent
    && buildIdentityPass
    && shellFits
    && topbarFits
    && actionsFit
    && canvasBoundToWorld;

  if (output) {
    output.textContent = `IM-14A — Player UI Shell & Responsive Surface Contract — ${pass ? 'PASS' : 'FAIL'} — Player Shell ${requiredRegionsPresent ? 'PASS' : 'FAIL'} — viewport-fit=cover ${viewportContractPresent ? 'PASS' : 'FAIL'} — Safe-Area/Viewport ${shellFits && topbarFits && actionsFit ? 'PASS' : 'FAIL'} — Canvas↔World Surface ${canvasBoundToWorld ? 'PASS' : 'FAIL'} — Build Identity ${buildIdentityPass ? 'PASS' : 'FAIL'} — keine neue Gameplay/Domain/SaveGame/Inspector-Ownership`;
    output.dataset.pass = pass ? 'true' : 'false';
  }

  return Object.freeze({
    pass,
    requiredRegionsPresent,
    viewportContractPresent,
    buildIdentityPass,
    shellFits,
    topbarFits,
    actionsFit,
    canvasBoundToWorld,
    viewport: Object.freeze({ width: window.innerWidth, height: window.innerHeight }),
  });
}

let evidence = evaluateResponsiveSurface();
window.addEventListener('resize', () => { evidence = evaluateResponsiveSurface(); }, { passive: true });
window.addEventListener('orientationchange', () => requestAnimationFrame(() => { evidence = evaluateResponsiveSurface(); }), { passive: true });

window.IM14AResponsiveSurfaceEvidence = Object.freeze({
  evaluate: evaluateResponsiveSurface,
  get current() { return evidence; },
});

console.info('[IM-14A] Player UI Shell & Responsive Surface Contract', evidence);
