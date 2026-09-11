import { RuntimeConfig } from './runtime/config.js?v=im18b-1';
import { Runtime } from './runtime/runtime.js';
import { BASELINE_MINIWORLD_SCENARIO_ID, createBaselineMiniworldScenario } from './diagnostics/baseline-miniworld-scenario.js?v=im15d-1';
import { projectVisibleRuntimeState } from './render/live-runtime-render-integration.js';
import { createWorldViewCameraState } from './render/world-view-camera-state.js';
import { DEFAULT_CAMERA_CONTROL_LIMITS, panWorldViewCamera, resizeWorldViewCameraViewport, zoomWorldViewCameraAt } from './render/world-view-camera-control.js';
import { renderProjectedWorldWithCameraToCanvas } from './render/camera-world-rendering.js';

const statusEl = document.querySelector('#runtime-status'); const testEl = document.querySelector('#test-status'); const canvas = document.querySelector('#game-canvas');
if (!(canvas instanceof HTMLCanvasElement)) throw new TypeError('game canvas required'); const ctx = canvas.getContext('2d'); if (!ctx) throw new TypeError('2d canvas context required');
const runtime = new Runtime(RuntimeConfig); let activeRuntimeComposition = createBaselineMiniworldScenario(); let diagnosticOverlayRenderer = null;
let cameraState = createWorldViewCameraState({ viewportWidth: 1, viewportHeight: 1, offsetX: 28, offsetY: 28, zoom: 1 });
function requireComposition(c) { if (c?.kind !== 'active-runtime-composition' || !c?.authoritative?.map || !c?.authoritative?.domains) throw new TypeError('complete active runtime composition required'); return c; }
function currentComposition() { return requireComposition(activeRuntimeComposition); } function currentAuthoritative() { return currentComposition().authoritative; }
function installActiveRuntimeComposition(c) { activeRuntimeComposition = requireComposition(c); return activeRuntimeComposition; }
function installDiagnosticOverlayRenderer(r) { if (typeof r !== 'function') throw new TypeError('IM-15C diagnostic overlay renderer required'); diagnosticOverlayRenderer = r; return r; }
function resizeCanvas() { const rect = canvas.getBoundingClientRect(); const dpr = Math.min(window.devicePixelRatio || 1, RuntimeConfig.render.maxDevicePixelRatio); const width = Math.max(1, rect.width); const height = Math.max(1, rect.height); const pw = Math.max(1, Math.round(width*dpr)); const ph = Math.max(1,Math.round(height*dpr)); if (canvas.width !== pw || canvas.height !== ph) { canvas.width=pw; canvas.height=ph; } ctx.setTransform(dpr,0,0,dpr,0,0); cameraState=resizeWorldViewCameraViewport(cameraState,{viewportWidth:width,viewportHeight:height}); return {width,height}; }
function renderCurrentWorld() { const {width,height}=resizeCanvas(); const cellPixels=Math.max(24,Math.min(56,Math.floor(Math.min(width/10,height/8)))); const owners=currentAuthoritative(); const projection=projectVisibleRuntimeState({map:owners.map,domains:owners.domains}); const commands=renderProjectedWorldWithCameraToCanvas(ctx,projection,cameraState,{cellPixels,offset:{x:0,y:0},buildingSize:Math.max(14,Math.round(cellPixels*.58)),personRadius:Math.max(4,Math.round(cellPixels*.16))}); const result=Object.freeze({projection,cameraState,commands,view:Object.freeze({cellPixels,offset:Object.freeze({x:0,y:0}),width,height})}); diagnosticOverlayRenderer?.(result); return result; }
function panCameraBy({deltaX=0,deltaY=0}={}) { cameraState=panWorldViewCamera(cameraState,{deltaX,deltaY}); return renderCurrentWorld(); }
function zoomCameraAt({factor,anchorX,anchorY}={}) { cameraState=zoomWorldViewCameraAt(cameraState,{factor,anchorX,anchorY}); return renderCurrentWorld(); }
function resetBaselineMiniworld() { if (runtime.state==='RUNNING') throw new Error('baseline reset not allowed while RUNNING'); const c=createBaselineMiniworldScenario(); installActiveRuntimeComposition(c); renderCurrentWorld(); return Object.freeze({kind:'im15d-scenario-reset-result',scenarioId:c.scenarioId}); }
runtime.events.on('runtime.stateChanged',({current})=>{if(statusEl)statusEl.textContent=current;}); runtime.boot(); const initialOwners=currentAuthoritative(); const initialRender=renderCurrentWorld(); window.addEventListener('resize',renderCurrentWorld,{passive:true});
if(testEl){testEl.textContent=`IM-18B · TESTBUILD 1 — Workforce Requirement / Eligibility Contract · requirement + eligible existing persons only · no assignment / production · Population ${initialOwners.housingPopulation.population.count} · Gold ${initialOwners.goldSettlement.state.balance} · ${initialRender.projection.buildings.length} Buildings / ${initialRender.projection.persons.length} Persons`;testEl.dataset.pass='pending';}
window.CleanRuntime=Object.freeze({config:RuntimeConfig,runtime,get world(){return currentAuthoritative().world;},get map(){return currentAuthoritative().map;},get domains(){return currentAuthoritative().domains;},get housingPopulation(){return currentAuthoritative().housingPopulation;},get goldEconomy(){return currentAuthoritative().goldEconomy;},get goldSettlement(){return currentAuthoritative().goldSettlement;},get pathClassification(){return currentAuthoritative().pathClassification;},get pathClassificationEntries(){return currentAuthoritative().pathClassificationEntries;},get traversability(){return currentAuthoritative().traversability;},get reachabilityEvidence(){return currentAuthoritative().reachabilityEvidence;},get personNavigationValidation(){return currentAuthoritative().personNavigationValidation;},get carrierMovementEvidence(){return currentAuthoritative().carrierMovementEvidence;},get carrierNavigationValidation(){return currentAuthoritative().carrierNavigationValidation;},get runtimeNavigationValidations(){return currentAuthoritative().runtimeNavigationValidations;},renderCurrentWorld,panCameraBy,zoomCameraAt,cameraControlLimits:DEFAULT_CAMERA_CONTROL_LIMITS,cameraInputOwner:'IM-14E-UNIFIED-WORLD-INPUT',installActiveRuntimeComposition,getActiveRuntimeComposition:()=>currentComposition(),resetBaselineMiniworld,installDiagnosticOverlayRenderer,getCameraState:()=>cameraState});

document.title='Neue Siedler – IM-18B Workforce Requirement / Eligibility';
const verificationTitle=document.querySelector('.verification-card h1'); if(verificationTitle) verificationTitle.textContent='IM-18B – Workforce Requirement / Eligibility Contract';
const verificationText=document.querySelector('.verification-card p'); if(verificationText) verificationText.textContent='An admitted operational Building may define a required workforce count, specialization and capabilities, then read which existing FREE persons are eligible. IM-18B does not assign any worker and does not execute production.';
const surfaceNote=document.querySelector('.surface-note'); if(surfaceNote) surfaceNote.textContent='IM-18B · TESTBUILD 1 · Workforce requirement + eligibility only · no assignment / production';
console.info('[IM-18B] Workforce Requirement / Eligibility Contract',{build:RuntimeConfig.build,scenarioId:BASELINE_MINIWORLD_SCENARIO_ID,frozenIM18AOperationalAdmissionReused:true,workforceRequirementAdded:true,eligibilityReadOnly:true,assignmentAdded:false,productionAdded:false});

void import('./ui/player-placement-confirm-cancel-interaction.js?v=im17-whole-1');
void import('./ui/player-building-selection-placement-activation.js?v=im17-whole-1');
void import('./ui/authoritative-construction-result-player-ui-projection.js?v=im17-whole-1');
void import('./domain/player-construction-runtime-admission-contract.js?v=im17-whole-1');
void import('./domain/economic-construction-requirement-contract.js?v=im17-whole-1');
void import('./domain/player-placement-construction-initialization-integration.js?v=im17-whole-1');
void import('./domain/construction-demand-existing-logistics-integration.js?v=im17-whole-1');
void import('./domain/delivered-material-construction-progress-settlement.js?v=im17-whole-1');
void import('./domain/construction-completion-integration.js?v=im17-whole-1');
void import('./ui/player-construction-state-projection.js?v=im17-whole-1');
void import('./im17-whole-block-runtime-evidence.js?v=im17-whole-1');
void import('./domain/operational-building-admission-contract.js?v=im18a-1');
void import('./domain/operational-building-workforce-requirement-eligibility-contract.js?v=im18b-1');
