import { RuntimeConfig } from './runtime/config.js?v=im16e-1';
import { Runtime } from './runtime/runtime.js';
import {
  BASELINE_MINIWORLD_SCENARIO_ID,
  createBaselineMiniworldScenario,
} from './diagnostics/baseline-miniworld-scenario.js?v=im15d-1';
import { projectVisibleRuntimeState } from './render/live-runtime-render-integration.js';
import { createWorldViewCameraState } from './render/world-view-camera-state.js';
import {
  DEFAULT_CAMERA_CONTROL_LIMITS,
  panWorldViewCamera,
  resizeWorldViewCameraViewport,
  zoomWorldViewCameraAt,
} from './render/world-view-camera-control.js';
import { renderProjectedWorldWithCameraToCanvas } from './render/camera-world-rendering.js';

const statusEl = document.querySelector('#runtime-status');
const testEl = document.querySelector('#test-status');
const canvas = document.querySelector('#game-canvas');

if (!(canvas instanceof HTMLCanvasElement)) throw new TypeError('game canvas required');
const ctx = canvas.getContext('2d');
if (!ctx) throw new TypeError('2d canvas context required');

const runtime = new Runtime(RuntimeConfig);
let activeRuntimeComposition = createBaselineMiniworldScenario();
let diagnosticOverlayRenderer = null;
let cameraState = createWorldViewCameraState({ viewportWidth: 1, viewportHeight: 1, offsetX: 28, offsetY: 28, zoom: 1 });

function requireComposition(composition) {
  if (composition?.kind !== 'active-runtime-composition' || !composition?.authoritative?.map || !composition?.authoritative?.domains) throw new TypeError('complete active runtime composition required');
  return composition;
}
function currentComposition() { return requireComposition(activeRuntimeComposition); }
function currentAuthoritative() { return currentComposition().authoritative; }
function installActiveRuntimeComposition(composition) { activeRuntimeComposition = requireComposition(composition); return activeRuntimeComposition; }
function installDiagnosticOverlayRenderer(renderer) { if (typeof renderer !== 'function') throw new TypeError('IM-15C diagnostic overlay renderer required'); diagnosticOverlayRenderer = renderer; return diagnosticOverlayRenderer; }

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, RuntimeConfig.render.maxDevicePixelRatio);
  const width = Math.max(1, rect.width); const height = Math.max(1, rect.height);
  const pixelWidth = Math.max(1, Math.round(width * dpr)); const pixelHeight = Math.max(1, Math.round(height * dpr));
  if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) { canvas.width = pixelWidth; canvas.height = pixelHeight; }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  cameraState = resizeWorldViewCameraViewport(cameraState, { viewportWidth: width, viewportHeight: height });
  return { width, height };
}

function renderCurrentWorld() {
  const { width, height } = resizeCanvas();
  const cellPixels = Math.max(24, Math.min(56, Math.floor(Math.min(width / 10, height / 8))));
  const owners = currentAuthoritative();
  const projection = projectVisibleRuntimeState({ map: owners.map, domains: owners.domains });
  const commands = renderProjectedWorldWithCameraToCanvas(ctx, projection, cameraState, { cellPixels, offset: { x: 0, y: 0 }, buildingSize: Math.max(14, Math.round(cellPixels * 0.58)), personRadius: Math.max(4, Math.round(cellPixels * 0.16)) });
  const result = Object.freeze({ projection, cameraState, commands, view: Object.freeze({ cellPixels, offset: Object.freeze({ x: 0, y: 0 }), width, height }) });
  diagnosticOverlayRenderer?.(result);
  return result;
}
function panCameraBy({ deltaX = 0, deltaY = 0 } = {}) { cameraState = panWorldViewCamera(cameraState, { deltaX, deltaY }); return renderCurrentWorld(); }
function zoomCameraAt({ factor, anchorX, anchorY } = {}) { cameraState = zoomWorldViewCameraAt(cameraState, { factor, anchorX, anchorY }); return renderCurrentWorld(); }
function resetBaselineMiniworld() {
  if (runtime.state === 'RUNNING') throw new Error('baseline reset not allowed while RUNNING');
  const composition = createBaselineMiniworldScenario(); installActiveRuntimeComposition(composition); renderCurrentWorld();
  return Object.freeze({ kind: 'im15d-scenario-reset-result', scenarioId: composition.scenarioId });
}

runtime.events.on('runtime.stateChanged', ({ current }) => { if (statusEl) statusEl.textContent = current; });
runtime.boot();
const initialOwners = currentAuthoritative(); const initialRender = renderCurrentWorld();
window.addEventListener('resize', renderCurrentWorld, { passive: true });
if (testEl) { testEl.textContent = `IM-16E — Player Placement Confirm / Cancel Interaction Contract — Runtime foundation loaded — Population ${initialOwners.housingPopulation.population.count} · Gold ${initialOwners.goldSettlement.state.balance} · ${initialRender.projection.buildings.length} Buildings / ${initialRender.projection.persons.length} Persons`; testEl.dataset.pass = 'pending'; }

window.CleanRuntime = Object.freeze({
  config: RuntimeConfig, runtime,
  get world() { return currentAuthoritative().world; }, get map() { return currentAuthoritative().map; }, get domains() { return currentAuthoritative().domains; },
  get housingPopulation() { return currentAuthoritative().housingPopulation; }, get goldEconomy() { return currentAuthoritative().goldEconomy; }, get goldSettlement() { return currentAuthoritative().goldSettlement; },
  get pathClassification() { return currentAuthoritative().pathClassification; }, get pathClassificationEntries() { return currentAuthoritative().pathClassificationEntries; }, get traversability() { return currentAuthoritative().traversability; },
  get reachabilityEvidence() { return currentAuthoritative().reachabilityEvidence; }, get personNavigationValidation() { return currentAuthoritative().personNavigationValidation; }, get carrierMovementEvidence() { return currentAuthoritative().carrierMovementEvidence; }, get carrierNavigationValidation() { return currentAuthoritative().carrierNavigationValidation; }, get runtimeNavigationValidations() { return currentAuthoritative().runtimeNavigationValidations; },
  renderCurrentWorld, panCameraBy, zoomCameraAt, cameraControlLimits: DEFAULT_CAMERA_CONTROL_LIMITS, cameraInputOwner: 'IM-14E-UNIFIED-WORLD-INPUT',
  installActiveRuntimeComposition, getActiveRuntimeComposition: () => currentComposition(), resetBaselineMiniworld, installDiagnosticOverlayRenderer, getCameraState: () => cameraState,
});

console.info('[IM-16E] Player Placement Confirm / Cancel Interaction Contract runtime foundation', {
  build: RuntimeConfig.build, scenarioId: BASELINE_MINIWORLD_SCENARIO_ID,
  placementStateAuthority: 'IM-16B', placementValidityAuthority: 'IM-16A', previewAuthority: 'IM-16C', authoritativeCommitAuthority: 'IM-16D',
  explicitPlayerConfirmCancelEnabled: true, implicitWorldPointerCommitExcluded: true, inspectorMutationExcluded: true,
});
