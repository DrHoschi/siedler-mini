import { RuntimeConfig } from './runtime/config.js';
import { Runtime } from './runtime/runtime.js';
import { Renderer } from './render/renderer.js';
import { runFoundationSelfTest } from './dev/self-test.js';
import { runCr01aSelfTest } from './dev/cr-01a-self-test.js';
import { runCr01bSelfTest } from './dev/cr-01b-self-test.js';
import { runCr01cSelfTest } from './dev/cr-01c-self-test.js';
import { runCr01FreezeGate } from './dev/cr-01-freeze-gate.js';
import { runCr02aSelfTest } from './dev/cr-02a-self-test.js';
import { runCr02bSelfTest } from './dev/cr-02b-self-test.js';
import { runCr02cSelfTest } from './dev/cr-02c-self-test.js';
import { runCr02FreezeGate } from './dev/cr-02-freeze-gate.js';
import { runCr03aSelfTest } from './dev/cr-03a-self-test.js';
import { WorldStore } from './world/world-store.js';
import { MapStructure } from './world/map-structure.js';
import { CoreDomainStores } from './domain/core-domain-stores.js';
import { ResourceState } from './resources/resource-state.js';
import { ResourceClaims } from './resources/resource-claims.js';
import { ResourceDemands } from './resources/resource-demands.js';
import { ResourceMatching } from './resources/resource-matching.js';

const statusEl = document.querySelector('#runtime-status');
const testEl = document.querySelector('#test-status');
const canvas = document.querySelector('#game-canvas');

const runtime = new Runtime(RuntimeConfig);
const renderer = new Renderer(canvas, RuntimeConfig);
const world = new WorldStore();
const map = new MapStructure(world, {
  name: 'CR-03A Deterministic Resource Matching Map',
  width: 8,
  height: 8,
  cellSize: 1,
  metadata: { foundation: 'CR-03A-RESOURCE-MATCHING' }
});
const domains = new CoreDomainStores();
const resources = new ResourceState({ world, resourceStore: domains.resources });
const resourceClaims = new ResourceClaims({ resourceState: resources });
const resourceDemands = new ResourceDemands({ resourceState: resources, claims: resourceClaims });
const resourceMatching = new ResourceMatching({ resourceState: resources, claims: resourceClaims, demands: resourceDemands });

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
const cr02bReport = runCr02bSelfTest();
const cr02cReport = runCr02cSelfTest();
const cr02FreezeGateReport = runCr02FreezeGate({ domains, resources, resourceClaims, resourceDemands });
const cr03aReport = runCr03aSelfTest();
const pass = foundationReport.pass
  && cr01aReport.pass
  && cr01bReport.pass
  && cr01cReport.pass
  && freezeGateReport.pass
  && cr02aReport.pass
  && cr02bReport.pass
  && cr02cReport.pass
  && cr02FreezeGateReport.pass
  && cr03aReport.pass;

if (testEl) testEl.textContent = pass ? 'CR-03A MATCHING: PASS' : 'CR-03A MATCHING: FAIL';

window.CleanRuntime = Object.freeze({
  config: RuntimeConfig,
  runtime,
  renderer,
  world,
  map,
  domains,
  resources,
  resourceClaims,
  resourceDemands,
  resourceMatching,
  selfTest: () => ({
    foundation: runFoundationSelfTest(RuntimeConfig),
    cr01a: runCr01aSelfTest(),
    cr01b: runCr01bSelfTest(),
    cr01c: runCr01cSelfTest(),
    freezeGate: runCr01FreezeGate({ world, map, domains }),
    cr02a: runCr02aSelfTest(),
    cr02b: runCr02bSelfTest(),
    cr02c: runCr02cSelfTest(),
    cr02FreezeGate: runCr02FreezeGate({ domains, resources, resourceClaims, resourceDemands }),
    cr03a: runCr03aSelfTest()
  }),
  foundationReport,
  cr01aReport,
  cr01bReport,
  cr01cReport,
  freezeGateReport,
  cr02aReport,
  cr02bReport,
  cr02cReport,
  cr02FreezeGateReport,
  cr03aReport
});

console.info('[CR-03A] Deterministic Demand -> Resource Matching READY', {
  build: RuntimeConfig.build,
  state: runtime.state,
  worldId: world.worldId,
  mapId: map.mapId,
  resourceDefinitions: resources.definitionIds().length,
  resourceInstances: domains.resources.size,
  claimCount: resourceClaims.ids().length,
  demandCount: resourceDemands.ids().length,
  matchPolicy: ResourceMatching.policy,
  foundation: foundationReport,
  cr01a: cr01aReport,
  cr01b: cr01bReport,
  cr01c: cr01cReport,
  freezeGate: freezeGateReport,
  cr02a: cr02aReport,
  cr02b: cr02bReport,
  cr02c: cr02cReport,
  cr02FreezeGate: cr02FreezeGateReport,
  cr03a: cr03aReport
});
