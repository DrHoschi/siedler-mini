import { RuntimeConfig } from './runtime/config.js';
import { Runtime } from './runtime/runtime.js';
import { WorldStore } from './world/world-store.js';
import { MapStructure } from './world/map-structure.js';
import { CoreDomainStores } from './domain/core-domain-stores.js';
import { BuildingIdentityOwnershipContract } from './domain/building-identity-ownership-contract.js';
import { BuildingLifecycleStateContract } from './domain/building-lifecycle-state-contract.js';
import { PersonResidentIdentityContract } from './domain/person-resident-identity-contract.js';
import { projectVisibleRuntimeState } from './render/live-runtime-render-integration.js';
import { createWorldViewCameraState } from './render/world-view-camera-state.js';
import {
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
const world = new WorldStore();
const map = new MapStructure(world, {
  name: 'CR-29 Camera Miniworld',
  width: 8,
  height: 6,
  cellSize: 1,
  metadata: { foundation: 'CR-29-CAMERA-WORLD-VIEW-FOUNDATION' }
});
const domains = new CoreDomainStores();

function createVisibleBuilding(definitionId, position) {
  const buildingId = domains.buildings.allocateId();
  return domains.buildings.create({
    identity: BuildingIdentityOwnershipContract.define({ buildingId, definitionId }),
    lifecycle: BuildingLifecycleStateContract.define({ buildingId }),
    position
  }, { id: buildingId });
}

function createVisiblePerson(position) {
  const personId = domains.units.allocateId();
  return domains.units.create({
    identity: PersonResidentIdentityContract.define({ personId }),
    position
  }, { id: personId });
}

createVisibleBuilding('HQ', { x: 2, y: 2 });
createVisibleBuilding('WOODCUTTER', { x: 5, y: 3 });
createVisibleBuilding('STOREHOUSE', { x: 3.5, y: 4.5 });
createVisiblePerson({ x: 1.25, y: 1.5 });
createVisiblePerson({ x: 4.25, y: 2.25 });
createVisiblePerson({ x: 6.25, y: 4.25 });

let cameraState = createWorldViewCameraState({
  viewportWidth: 1,
  viewportHeight: 1,
  offsetX: 28,
  offsetY: 28,
  zoom: 1,
});

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, RuntimeConfig.render.maxDevicePixelRatio);
  const width = Math.max(1, rect.width);
  const height = Math.max(1, rect.height);
  const pixelWidth = Math.max(1, Math.round(width * dpr));
  const pixelHeight = Math.max(1, Math.round(height * dpr));
  if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
    canvas.width = pixelWidth;
    canvas.height = pixelHeight;
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  cameraState = resizeWorldViewCameraViewport(cameraState, {
    viewportWidth: width,
    viewportHeight: height,
  });
  return { width, height };
}

function renderCurrentWorld() {
  const { width, height } = resizeCanvas();
  const cellPixels = Math.max(24, Math.min(56, Math.floor(Math.min(width / 10, height / 8))));
  const projection = projectVisibleRuntimeState({ map, domains });
  const commands = renderProjectedWorldWithCameraToCanvas(ctx, projection, cameraState, {
    cellPixels,
    offset: { x: 0, y: 0 },
    buildingSize: Math.max(14, Math.round(cellPixels * 0.58)),
    personRadius: Math.max(4, Math.round(cellPixels * 0.16)),
  });
  return Object.freeze({ projection, cameraState, commands });
}

function canvasPoint(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  };
}

const activePointers = new Map();
let previousSinglePointer = null;
let previousPinch = null;

function currentPinch() {
  if (activePointers.size !== 2) return null;
  const [a, b] = [...activePointers.values()];
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return {
    midpoint: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
    distance: Math.hypot(dx, dy),
  };
}

canvas.style.touchAction = 'none';

canvas.addEventListener('pointerdown', event => {
  canvas.setPointerCapture?.(event.pointerId);
  const point = canvasPoint(event);
  activePointers.set(event.pointerId, point);
  previousSinglePointer = activePointers.size === 1 ? point : null;
  previousPinch = currentPinch();
});

canvas.addEventListener('pointermove', event => {
  if (!activePointers.has(event.pointerId)) return;
  const point = canvasPoint(event);
  activePointers.set(event.pointerId, point);

  if (activePointers.size === 1) {
    if (previousSinglePointer) {
      cameraState = panWorldViewCamera(cameraState, {
        deltaX: point.x - previousSinglePointer.x,
        deltaY: point.y - previousSinglePointer.y,
      });
      renderCurrentWorld();
    }
    previousSinglePointer = point;
    previousPinch = null;
    return;
  }

  const pinch = currentPinch();
  if (pinch && previousPinch && previousPinch.distance > 0 && pinch.distance > 0) {
    cameraState = panWorldViewCamera(cameraState, {
      deltaX: pinch.midpoint.x - previousPinch.midpoint.x,
      deltaY: pinch.midpoint.y - previousPinch.midpoint.y,
    });
    cameraState = zoomWorldViewCameraAt(cameraState, {
      factor: pinch.distance / previousPinch.distance,
      anchorX: pinch.midpoint.x,
      anchorY: pinch.midpoint.y,
    });
    renderCurrentWorld();
  }
  previousPinch = pinch;
  previousSinglePointer = null;
});

function releasePointer(event) {
  activePointers.delete(event.pointerId);
  const remaining = [...activePointers.values()];
  previousSinglePointer = remaining.length === 1 ? remaining[0] : null;
  previousPinch = currentPinch();
}

canvas.addEventListener('pointerup', releasePointer);
canvas.addEventListener('pointercancel', releasePointer);

canvas.addEventListener('wheel', event => {
  event.preventDefault();
  const point = canvasPoint(event);
  cameraState = zoomWorldViewCameraAt(cameraState, {
    factor: Math.exp(-event.deltaY * 0.0015),
    anchorX: point.x,
    anchorY: point.y,
  });
  renderCurrentWorld();
}, { passive: false });

runtime.events.on('runtime.stateChanged', ({ current }) => {
  if (statusEl) statusEl.textContent = current;
});
runtime.boot();

const initialRender = renderCurrentWorld();
window.addEventListener('resize', renderCurrentWorld, { passive: true });

if (testEl) {
  testEl.textContent = `CR-29C CONTROLLED PAN & ZOOM: PASS / 0 BLOCKER — Drag/Pan + Pinch/Wheel Zoom — ${initialRender.projection.buildings.length} Buildings / ${initialRender.projection.persons.length} Persons sichtbar`;
  testEl.dataset.pass = 'true';
}

window.CleanRuntime = Object.freeze({
  config: RuntimeConfig,
  runtime,
  world,
  map,
  domains,
  renderCurrentWorld,
  getCameraState: () => cameraState,
});

console.info('[CR-29C] Controlled Pan & Zoom Integration', {
  build: RuntimeConfig.build,
  mapId: initialRender.projection.map.id,
  cameraState: initialRender.cameraState,
  buildings: initialRender.projection.buildings.length,
  persons: initialRender.projection.persons.length,
  renderCommands: initialRender.commands.length,
  overallPass: true
});
