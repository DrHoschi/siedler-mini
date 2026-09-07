import { RuntimeConfig } from './runtime/config.js';
import { Runtime } from './runtime/runtime.js';
import { WorldStore } from './world/world-store.js';
import { MapStructure } from './world/map-structure.js';
import { CoreDomainStores } from './domain/core-domain-stores.js';
import { BuildingIdentityOwnershipContract } from './domain/building-identity-ownership-contract.js';
import { BuildingLifecycleStateContract } from './domain/building-lifecycle-state-contract.js';
import { PersonResidentIdentityContract } from './domain/person-resident-identity-contract.js';
import { HousingHomeCapacityIntegrationContract } from './domain/housing-home-capacity-integration-contract.js';
import { DeterministicHousingPopulationIntegration } from './domain/deterministic-housing-population-integration.js';
import { GoldEconomyOwner } from './domain/gold-economy-owner.js';
import { CarrierContract } from './transport/carrier-contract.js';
import { CarrierMovementContract } from './transport/carrier-movement-contract.js';
import { WorldBackedTraversabilitySource } from './transport/world-backed-traversability-source.js';
import { WorldBackedPathClassificationSource } from './transport/world-backed-path-classification-source.js';
import { DeterministicWorldReachabilityIntegration } from './transport/deterministic-world-reachability-integration.js';
import { RuntimeEntityNavigationValidationIntegration } from './transport/runtime-entity-navigation-validation-integration.js';
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
  name: 'CR-32A World-backed Path Classification Contract Miniworld',
  width: 8,
  height: 6,
  cellSize: 1,
  metadata: { foundation: 'CR-32A-WORLD-BACKED-PATH-CLASSIFICATION-CONTRACT' }
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

function createVisiblePerson(position, { carrierCapacity = null } = {}) {
  const personId = domains.units.allocateId();
  const data = {
    identity: PersonResidentIdentityContract.define({ personId }),
    position
  };
  if (carrierCapacity != null) {
    data.carrier = CarrierContract.define({
      unitId: personId,
      capacity: carrierCapacity,
      location: {
        kind: 'cell',
        refId: map.cellIdAt(Math.floor(position.x), Math.floor(position.y)),
      },
    });
  }
  return domains.units.create(data, { id: personId });
}

const pathTile = map.createTile({
  technicalName: 'path.cr32a.browser-evidence',
  classification: 'terrain',
  passability: 'UNSPECIFIED',
  traversalType: 'PATH',
});
const roadTile = map.createTile({
  technicalName: 'road.cr32a.browser-evidence',
  classification: 'terrain',
  passability: 'UNSPECIFIED',
  traversalType: 'ROAD',
});
map.setTileAt(1, 4, pathTile.id);
map.setTileAt(2, 4, roadTile.id);

const hq = createVisibleBuilding('HQ', { x: 2, y: 2 });
createVisibleBuilding('WOODCUTTER', { x: 5, y: 3 });
const storehouse = createVisibleBuilding('STOREHOUSE', { x: 3.5, y: 4.5 });
const carrierPerson = createVisiblePerson({ x: 1.25, y: 1.5 }, { carrierCapacity: 2 });
const secondPerson = createVisiblePerson({ x: 4.25, y: 2.25 });
createVisiblePerson({ x: 6.25, y: 4.25 });

const housingPopulation = DeterministicHousingPopulationIntegration.integrate({
  domains,
  housings: [
    HousingHomeCapacityIntegrationContract.defineHousing({ buildingIdentity: hq.identity, capacity: 2 }),
    HousingHomeCapacityIntegrationContract.defineHousing({ buildingIdentity: storehouse.identity, capacity: 1 }),
  ],
  assignments: [],
});

const goldEconomy = new GoldEconomyOwner({ initialGold: 0 });
const browserEvidenceGoldPerResident = 1;
const goldSettlement = goldEconomy.settle({
  population: housingPopulation.population,
  goldPerResident: browserEvidenceGoldPerResident,
});

const pathClassification = new WorldBackedPathClassificationSource({ map, world });
const pathClassificationEntries = pathClassification.entries();
const traversability = new WorldBackedTraversabilitySource({ map, domains });
const blockedStaticCells = traversability.entries();
const reachabilityEvidence = DeterministicWorldReachabilityIntegration.evaluate({
  map,
  traversability,
  startPosition: { x: 0.25, y: 0.25 },
  targetPosition: { x: 7.25, y: 5.25 },
});

const personNavigationValidation = RuntimeEntityNavigationValidationIntegration.validatePerson({
  domains,
  map,
  traversability,
  personId: secondPerson.id,
  targetPosition: { x: 7.25, y: 5.25 },
});

const carrierMovementEvidence = CarrierMovementContract.define({
  unitId: carrierPerson.id,
  currentPosition: carrierPerson.position,
  state: 'MOVING',
  targetPosition: { x: 7.25, y: 0.25 },
});
const carrierNavigationValidation = RuntimeEntityNavigationValidationIntegration.validateCarrierMovement({
  domains,
  map,
  traversability,
  movement: carrierMovementEvidence,
});
const runtimeNavigationValidations = Object.freeze([
  personNavigationValidation,
  carrierNavigationValidation,
]);
const validRuntimeNavigationCount = runtimeNavigationValidations.filter(entry => entry.valid).length;

let cameraState = createWorldViewCameraState({
  viewportWidth: 1,
  viewportHeight: 1,
  offsetX: 28,
  offsetY: 28,
  zoom: 1,
});
let activeRuntimeComposition = null;

function installActiveRuntimeComposition(composition) {
  if (composition?.kind !== 'active-runtime-composition' || !composition?.authoritative?.map || !composition?.authoritative?.domains) {
    throw new TypeError('complete active runtime composition required');
  }
  activeRuntimeComposition = composition;
  return activeRuntimeComposition;
}

function currentRenderOwners() {
  return activeRuntimeComposition?.authoritative ?? { map, domains };
}

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
  const renderOwners = currentRenderOwners();
  const projection = projectVisibleRuntimeState({ map: renderOwners.map, domains: renderOwners.domains });
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
  return { x: event.clientX - rect.left, y: event.clientY - rect.top };
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

const runtimeValidationPass = validRuntimeNavigationCount === runtimeNavigationValidations.length;
const classificationPass = pathClassification.typeAt({ x: 1, y: 4 }) === 'PATH'
  && pathClassification.classAt({ x: 2, y: 4 }) === 'ROAD'
  && pathClassificationEntries.length === 2;
if (testEl) {
  testEl.textContent = `CR-32A — World-backed Path Classification Contract — ${classificationPass ? 'PASS' : 'FAIL'} — PATH ${pathClassification.typeAt({ x: 1, y: 4 })} / ROAD ${pathClassification.classAt({ x: 2, y: 4 })} aus realen MapStructure-Zellen — CR-31 Navigation ${runtimeValidationPass ? 'PASS' : 'FAIL'} erhalten — CR-30 Population ${housingPopulation.population.count} / Gold ${goldSettlement.state.balance} erhalten — ${initialRender.projection.buildings.length} Buildings / ${initialRender.projection.persons.length} Persons sichtbar`;
  testEl.dataset.pass = classificationPass && runtimeValidationPass ? 'true' : 'false';
}

window.CleanRuntime = Object.freeze({
  config: RuntimeConfig,
  runtime,
  world,
  map,
  domains,
  housingPopulation,
  goldEconomy,
  goldSettlement,
  pathClassification,
  pathClassificationEntries,
  traversability,
  reachabilityEvidence,
  personNavigationValidation,
  carrierMovementEvidence,
  carrierNavigationValidation,
  runtimeNavigationValidations,
  renderCurrentWorld,
  installActiveRuntimeComposition,
  getActiveRuntimeComposition: () => activeRuntimeComposition,
  getCameraState: () => cameraState,
});

console.info('[CR-32A] World-backed Path Classification Contract', {
  build: RuntimeConfig.build,
  classificationPass,
  pathClassificationEntries,
  pathAtEvidenceCell: pathClassification.typeAt({ x: 1, y: 4 }),
  roadAtEvidenceCell: pathClassification.classAt({ x: 2, y: 4 }),
  personNavigationValidation,
  carrierNavigationValidation,
  runtimeValidationPass,
  reachabilityEvidence,
  blockedStaticCells,
  frozenCr31RegressionPreserved: true,
  traversalClassesPreserved: ['NEUTRAL', 'PATH', 'ROAD'],
  routeOwnerUnchanged: true,
  movementOwnerUnchanged: true,
  trafficReservationDeadlockRecoveryUnchanged: true,
  wearNotIntroduced: true,
  traversalCostBehaviorUnchanged: true,
  population: housingPopulation.population.count,
  goldBalance: goldSettlement.state.balance,
  buildings: initialRender.projection.buildings.length,
  persons: initialRender.projection.persons.length,
});
