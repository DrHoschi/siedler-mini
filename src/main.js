import { RuntimeConfig } from './runtime/config.js';
import { Runtime } from './runtime/runtime.js';
import { Renderer } from './render/renderer.js';
import { runFoundationSelfTest } from './dev/self-test.js';
import { runCr01aSelfTest } from './dev/cr-01a-self-test.js';
import { runCr01bSelfTest } from './dev/cr-01b-self-test.js';
import { WorldStore } from './world/world-store.js';
import { MapStructure } from './world/map-structure.js';

const statusEl = document.querySelector('#runtime-status');
const testEl = document.querySelector('#test-status');
const canvas = document.querySelector('#game-canvas');

const runtime = new Runtime(RuntimeConfig);
const renderer = new Renderer(canvas, RuntimeConfig);
const world = new WorldStore();
const map = new MapStructure(world, {
  name: 'CR-01B Prototype Map',
  width: 8,
  height: 8,
  cellSize: 1,
  metadata: { foundation: 'CR-01B' }
});

runtime.events.on('runtime.stateChanged', ({ current }) => {
  if (statusEl) statusEl.textContent = current;
});

runtime.boot();
renderer.render();
window.addEventListener('resize', () => renderer.render(), { passive:true });

const foundationReport = runFoundationSelfTest(RuntimeConfig);
const cr01aReport = runCr01aSelfTest();
const cr01bReport = runCr01bSelfTest();
const pass = foundationReport.pass && cr01aReport.pass && cr01bReport.pass;

if (testEl) testEl.textContent = pass ? 'CR-01B SELF-TEST: PASS' : 'CR-01B SELF-TEST: FAIL';

window.CleanRuntime = Object.freeze({
  config: RuntimeConfig,
  runtime,
  renderer,
  world,
  map,
  selfTest: () => ({
    foundation: runFoundationSelfTest(RuntimeConfig),
    cr01a: runCr01aSelfTest(),
    cr01b: runCr01bSelfTest()
  }),
  foundationReport,
  cr01aReport,
  cr01bReport
});

console.info('[CR-01B] World/Map Structure Foundation READY', {
  build: RuntimeConfig.build,
  state: runtime.state,
  worldId: world.worldId,
  mapId: map.mapId,
  dimensions: map.dimensions(),
  entityCount: world.ids().length,
  foundation: foundationReport,
  cr01a: cr01aReport,
  cr01b: cr01bReport
});
