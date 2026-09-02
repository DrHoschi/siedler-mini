import { RuntimeConfig } from './runtime/config.js';
import { Runtime } from './runtime/runtime.js';
import { Renderer } from './render/renderer.js';
import { runFoundationSelfTest } from './dev/self-test.js';
import { runCr01aSelfTest } from './dev/cr-01a-self-test.js';
import { WorldStore } from './world/world-store.js';

const statusEl = document.querySelector('#runtime-status');
const testEl = document.querySelector('#test-status');
const canvas = document.querySelector('#game-canvas');

const runtime = new Runtime(RuntimeConfig);
const renderer = new Renderer(canvas, RuntimeConfig);
const world = new WorldStore();

runtime.events.on('runtime.stateChanged', ({ current }) => {
  if (statusEl) statusEl.textContent = current;
});

runtime.boot();
renderer.render();
window.addEventListener('resize', () => renderer.render(), { passive:true });

const foundationReport = runFoundationSelfTest(RuntimeConfig);
const cr01aReport = runCr01aSelfTest();
const pass = foundationReport.pass && cr01aReport.pass;

if (testEl) testEl.textContent = pass ? 'CR-01A SELF-TEST: PASS' : 'CR-01A SELF-TEST: FAIL';

window.CleanRuntime = Object.freeze({
  config: RuntimeConfig,
  runtime,
  renderer,
  world,
  selfTest: () => ({
    foundation: runFoundationSelfTest(RuntimeConfig),
    cr01a: runCr01aSelfTest()
  }),
  foundationReport,
  cr01aReport
});

console.info('[CR-01A] World & Core State Foundation READY', {
  build: RuntimeConfig.build,
  state: runtime.state,
  worldId: world.worldId,
  foundation: foundationReport,
  cr01a: cr01aReport
});
