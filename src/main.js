import { RuntimeConfig } from './runtime/config.js';
import { Runtime } from './runtime/runtime.js';
import { Renderer } from './render/renderer.js';
import { runFoundationSelfTest } from './dev/self-test.js';
import { runCr01aSelfTest } from './dev/cr-01a-self-test.js';
import { runCr01bSelfTest } from './dev/cr-01b-self-test.js';
import { runCr01cSelfTest } from './dev/cr-01c-self-test.js';
import { runCr01FreezeGate } from './dev/cr-01-freeze-gate.js';
import { WorldStore } from './world/world-store.js';
import { MapStructure } from './world/map-structure.js';
import { CoreDomainStores } from './domain/core-domain-stores.js';

const statusEl = document.querySelector('#runtime-status');
const testEl = document.querySelector('#test-status');
const canvas = document.querySelector('#game-canvas');

const runtime = new Runtime(RuntimeConfig);
const renderer = new Renderer(canvas, RuntimeConfig);
const world = new WorldStore();
const map = new MapStructure(world, {
  name: 'CR-01 Frozen Foundation Map',
  width: 8,
  height: 8,
  cellSize: 1,
  metadata: { foundation: 'CR-01-FREEZE-GATE' }
});
const domains = new CoreDomainStores();

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
const pass = foundationReport.pass && cr01aReport.pass && cr01bReport.pass && cr01cReport.pass && freezeGateReport.pass;

if (testEl) testEl.textContent = pass ? 'CR-01 FREEZE-GATE: PASS' : 'CR-01 FREEZE-GATE: FAIL';

window.CleanRuntime = Object.freeze({
  config: RuntimeConfig,
  runtime,
  renderer,
  world,
  map,
  domains,
  selfTest: () => ({
    foundation: runFoundationSelfTest(RuntimeConfig),
    cr01a: runCr01aSelfTest(),
    cr01b: runCr01bSelfTest(),
    cr01c: runCr01cSelfTest(),
    freezeGate: runCr01FreezeGate({ world, map, domains })
  }),
  foundationReport,
  cr01aReport,
  cr01bReport,
  cr01cReport,
  freezeGateReport
});

console.info('[CR-01] Completion / Freeze Gate READY', {
  build: RuntimeConfig.build,
  state: runtime.state,
  worldId: world.worldId,
  mapId: map.mapId,
  domainStores: domains.names(),
  domainSizes: Object.fromEntries(domains.names().map(name => [name, domains[name].size])),
  foundation: foundationReport,
  cr01a: cr01aReport,
  cr01b: cr01bReport,
  cr01c: cr01cReport,
  freezeGate: freezeGateReport
});
