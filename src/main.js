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
import { runCr03bSelfTest } from './dev/cr-03b-self-test.js';
import { runCr03cSelfTest } from './dev/cr-03c-self-test.js';
import { runCr03FreezeGate } from './dev/cr-03-freeze-gate.js';
import { runCr04aSelfTest } from './dev/cr-04a-self-test.js';
import { runCr04bSelfTest } from './dev/cr-04b-self-test.js?v=cr04b-2';
import { WorldStore } from './world/world-store.js';
import { MapStructure } from './world/map-structure.js';
import { CoreDomainStores } from './domain/core-domain-stores.js';
import { ResourceState } from './resources/resource-state.js';
import { ResourceClaims } from './resources/resource-claims.js';
import { ResourceDemands } from './resources/resource-demands.js';
import { ResourceMatching } from './resources/resource-matching.js';
import { ResourceAssignment } from './resources/resource-assignment.js';

const statusEl = document.querySelector('#runtime-status');
const testEl = document.querySelector('#test-status');
const canvas = document.querySelector('#game-canvas');
const runtime = new Runtime(RuntimeConfig);
const renderer = new Renderer(canvas, RuntimeConfig);
const world = new WorldStore();
const map = new MapStructure(world, { name:'CR-04B Controlled Transport Job Creation Test Map', width:8, height:8, cellSize:1, metadata:{ foundation:'CR-04B-CONTROLLED-TRANSPORT-JOB-CREATION' } });
const domains = new CoreDomainStores();
const resources = new ResourceState({ world, resourceStore:domains.resources });
const resourceClaims = new ResourceClaims({ resourceState:resources });
const resourceDemands = new ResourceDemands({ resourceState:resources, claims:resourceClaims });
const resourceMatching = new ResourceMatching({ resourceState:resources, claims:resourceClaims, demands:resourceDemands });
const resourceAssignment = new ResourceAssignment({ resourceState:resources, claims:resourceClaims, demands:resourceDemands });

runtime.events.on('runtime.stateChanged', ({current}) => { if (statusEl) statusEl.textContent=current; });
runtime.boot(); renderer.render(); window.addEventListener('resize',()=>renderer.render(),{passive:true});

const reports = {
  foundation: runFoundationSelfTest(RuntimeConfig),
  cr01a: runCr01aSelfTest(), cr01b: runCr01bSelfTest(), cr01c: runCr01cSelfTest(),
  cr01Freeze: runCr01FreezeGate({world,map,domains}),
  cr02a: runCr02aSelfTest(), cr02b: runCr02bSelfTest(), cr02c: runCr02cSelfTest(),
  cr02Freeze: runCr02FreezeGate({domains,resources,resourceClaims,resourceDemands}),
  cr03a: runCr03aSelfTest(), cr03b: runCr03bSelfTest(), cr03c: runCr03cSelfTest(),
  cr03Freeze: runCr03FreezeGate(), cr04a: runCr04aSelfTest(), cr04b: runCr04bSelfTest()
};
const failedLayers = Object.entries(reports).filter(([,report]) => !report.pass || ('blockerCount' in report && report.blockerCount !== 0)).map(([name])=>name);
const pass = failedLayers.length === 0;
const cr04bFailures = reports.cr04b.results?.filter(result=>!result.pass).map(result=>result.error ? `${result.name}: ${result.error}` : result.name) ?? [];
if (testEl) testEl.textContent = pass
  ? 'CR-04B CONTROLLED TRANSPORT JOB CREATION: PASS / 0 BLOCKER'
  : `CR-04B CONTROLLED TRANSPORT JOB CREATION: FAIL — ${[...failedLayers, ...cr04bFailures].join(' | ')}`;

window.CleanRuntime = Object.freeze({ config:RuntimeConfig,runtime,renderer,world,map,domains,resources,resourceClaims,resourceDemands,resourceMatching,resourceAssignment,reports,selfTest:()=>({ cr03Freeze:runCr03FreezeGate(),cr04a:runCr04aSelfTest(),cr04b:runCr04bSelfTest() }) });
console.info('[CR-04B] Controlled Transport Job Creation device/browser gate',{build:RuntimeConfig.build,state:runtime.state,cr03Regression:reports.cr03Freeze,cr04aRegression:reports.cr04a,cr04bCreation:reports.cr04b,failedLayers,cr04bFailures,overallPass:pass});
