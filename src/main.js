import { RuntimeConfig } from './runtime/config.js';
import { Runtime } from './runtime/runtime.js';
import { Renderer } from './render/renderer.js';
import { runFoundationSelfTest } from './dev/self-test.js';
import { runCr01aSelfTest } from './dev/cr-01a-self-test.js';
import { runCr01bSelfTest } from './dev/cr-01b-self-test.js';
import { runCr01cSelfTest } from './dev/cr-01c-self-test.js';
import { runCr01FreezeGate } from './dev/cr-01-freeze-gate.js';
import { runCr02aSelfTest } from './dev/cr-02a-self-test.js';
import { WorldStore } from './world/world-store.js';
import { MapStructure } from './world/map-structure.js';
import { CoreDomainStores } from './domain/core-domain-stores.js';
import { ResourceState } from './resources/resource-state.js';

const statusEl = document.querySelector('#runtime-status');
const testEl = document.querySelector('#test-status');
const canvas = document.querySelector('#game-canvas');

const runtime = new Runtime(RuntimeConfig);
const renderer = new Renderer(canvas, RuntimeConfig);
const world = new WorldStore();
const map = new MapStructure(world, {
  name: 'CR-02A Resource Foundation Map',
  width: 8,
  height: 8,
  cellSize: 1,
  metadata: { foundation: 'CR-02A' }
});
const domains = new CoreDomainStores();
const resources = new ResourceState({ world, resourceStore: domains.resources });

runtime.events.on('runtime.stateChanged', ({ current }) => {
  if (statusEl) statusEl.textContent = current;
});

runtime.boot();
renderer.render();
window.addEventListener('resize', () => renderer.render(), { passive:true });

const foundationReport = runFoundationSelfTest(RuntimeConfig);
const cr01aReport = runCr01aSelfTest();
const cr01bReport = runCr01bSelfTest();
const cr01cReport = runCr01cSelfTest();
const freezeGateReport = runCr01FreezeGate({ world, map, domains });
const cr02aReport = runCr02aSelfTest();
const pass = foundationReport.pass && cr01aReport.pass && cr01bReport.pass && cr01cReport.pass && freezeGateReport.pass && cr02aReport.pass;

if (testEl) testEl.textContent = pass ? 'CR-02A SELF-TEST: PASS' : 'CR-02A SELF-TEST: FAIL';

window.CleanRuntime = Object.freeze({
  config: RuntimeConfig,
  runtime,
  renderer,
  world,
  map,
  domains,
  resources,
  selfTest: () => ({
    foundation: runFoundationSelfTest(RuntimeConfig),
    cr01a: runCr01aSelfTest(),
    cr01b: runCr01bSelfTest(),
    cr01c: runCr01cSelfTest(),
    freezeGate: runCr01FreezeGate({ world, map, domains }),
    cr02a: runCr02aSelfTest()
  }),
  foundationReport,
  cr01aReport,
  cr01bReport,
  cr01cReport,
  freezeGateReport,
  cr02aReport
});

console.info('[CR-02A] Resource State Foundation READY', {
  build: RuntimeConfig.build,
  state: runtime.state,
  worldId: world.worldId,
  mapId: map.mapId,
  resourceDefinitions: resources.definitionIds().length,
  resourceInstances: domains.resources.size,
  foundation: foundationReport,
  cr01a: cr01aReport,
  cr01b: cr01bReport,
  cr01c: cr01cReport,
  freezeGate: freezeGateReport,
  cr02a: cr02aReport
});
