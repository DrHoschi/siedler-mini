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
import { runCr03FreezeGate } from './dev/cr-03-freeze-gate.js';
import { runCr04aSelfTest } from './dev/cr-04a-self-test.js';
import { runCr04bSelfTest } from './dev/cr-04b-self-test.js';
import { runCr04cSelfTest } from './dev/cr-04c-self-test.js?v=cr04-freeze-1';
import { runCr04FreezeGate } from './dev/cr-04-freeze-gate.js?v=cr04-freeze-1';
import { WorldStore } from './world/world-store.js';
import { MapStructure } from './world/map-structure.js';
import { CoreDomainStores } from './domain/core-domain-stores.js';
import { ResourceState } from './resources/resource-state.js';
import { ResourceClaims } from './resources/resource-claims.js';
import { ResourceDemands } from './resources/resource-demands.js';
import { ResourceMatching } from './resources/resource-matching.js';
import { ResourceAssignment } from './resources/resource-assignment.js';

const statusEl=document.querySelector('#runtime-status'),testEl=document.querySelector('#test-status'),canvas=document.querySelector('#game-canvas');
const runtime=new Runtime(RuntimeConfig),renderer=new Renderer(canvas,RuntimeConfig),world=new WorldStore();
const map=new MapStructure(world,{name:'CR-04 Transport Job Foundation Freeze Gate',width:8,height:8,cellSize:1,metadata:{foundation:'CR-04-TRANSPORT-JOB-FOUNDATION-FREEZE'}});
const domains=new CoreDomainStores(),resources=new ResourceState({world,resourceStore:domains.resources}),resourceClaims=new ResourceClaims({resourceState:resources}),resourceDemands=new ResourceDemands({resourceState:resources,claims:resourceClaims}),resourceMatching=new ResourceMatching({resourceState:resources,claims:resourceClaims,demands:resourceDemands}),resourceAssignment=new ResourceAssignment({resourceState:resources,claims:resourceClaims,demands:resourceDemands});
runtime.events.on('runtime.stateChanged',({current})=>{if(statusEl)statusEl.textContent=current;}); runtime.boot(); renderer.render(); window.addEventListener('resize',()=>renderer.render(),{passive:true});

const reports={
  foundation:runFoundationSelfTest(RuntimeConfig),
  cr01a:runCr01aSelfTest(),cr01b:runCr01bSelfTest(),cr01c:runCr01cSelfTest(),cr01Freeze:runCr01FreezeGate({world,map,domains}),
  cr02a:runCr02aSelfTest(),cr02b:runCr02bSelfTest(),cr02c:runCr02cSelfTest(),cr02Freeze:runCr02FreezeGate({domains,resources,resourceClaims,resourceDemands}),
  cr03Freeze:runCr03FreezeGate(),cr04a:runCr04aSelfTest(),cr04b:runCr04bSelfTest(),cr04c:runCr04cSelfTest(),cr04Freeze:runCr04FreezeGate()
};
const failedLayers=Object.entries(reports).filter(([,r])=>!r.pass||('blockerCount'in r&&r.blockerCount!==0)).map(([n])=>n);
const freezeFailures=reports.cr04Freeze.results?.filter(r=>!r.pass).map(r=>r.error?`${r.name}: ${r.error}`:r.name)??[];
const pass=failedLayers.length===0;
if(testEl)testEl.textContent=pass?'CR-04 TRANSPORT JOB FOUNDATION: FROZEN / PASS / 0 BLOCKER':`CR-04 FREEZE GATE: FAIL — ${[...failedLayers,...freezeFailures].join(' | ')}`;
window.CleanRuntime=Object.freeze({config:RuntimeConfig,runtime,renderer,world,map,domains,resources,resourceClaims,resourceDemands,resourceMatching,resourceAssignment,reports,selfTest:()=>runCr04FreezeGate()});
console.info('[CR-04] Transport Job Foundation freeze gate',{build:RuntimeConfig.build,state:runtime.state,cr03Regression:reports.cr03Freeze,cr04aRegression:reports.cr04a,cr04bRegression:reports.cr04b,cr04cRegression:reports.cr04c,freeze:reports.cr04Freeze,failedLayers,freezeFailures,overallPass:pass});
