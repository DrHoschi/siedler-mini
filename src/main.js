import { RuntimeConfig } from './runtime/config.js';
import { Runtime } from './runtime/runtime.js';
import { Renderer } from './render/renderer.js';
import { runFoundationSelfTest } from './dev/self-test.js';

const statusEl = document.querySelector('#runtime-status');
const testEl = document.querySelector('#test-status');
const canvas = document.querySelector('#game-canvas');

const runtime = new Runtime(RuntimeConfig);
const renderer = new Renderer(canvas, RuntimeConfig);

runtime.events.on('runtime.stateChanged', ({ current }) => {
  if (statusEl) statusEl.textContent = current;
});

runtime.boot();
renderer.render();
window.addEventListener('resize', () => renderer.render(), { passive:true });

const report = runFoundationSelfTest(RuntimeConfig);
if (testEl) testEl.textContent = report.pass ? 'CR-00 SELF-TEST: PASS' : 'CR-00 SELF-TEST: FAIL';

window.CleanRuntime = Object.freeze({
  config: RuntimeConfig,
  runtime,
  renderer,
  selfTest: () => runFoundationSelfTest(RuntimeConfig),
  foundationReport: report
});

console.info('[CR-00] Clean Runtime READY', {
  build: RuntimeConfig.build,
  state: runtime.state,
  selfTest: report
});
