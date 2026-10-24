import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createNewGameEconomyComposition as fresh, createStartMenuComposition as empty } from '../runtime/new-game-economy-composition.js';
import { Runtime } from '../runtime/runtime.js';
import { RuntimeConfig } from '../runtime/config.js';
import { PlayerNewGameLifecycle } from '../runtime/player-new-game-lifecycle.js';
import { PostIM13ActiveRuntimeCaptureAdapter as Capture } from '../savegame/post-im13-active-runtime-capture-adapter.js';
import { PostIM13SaveGameValidationContract as Validation } from '../savegame/post-im13-savegame-validation-contract.js';
import { PostIM13SaveGameRestoreIntegration as Restore } from '../savegame/post-im13-savegame-restore-integration.js';
import { PostIM13DerivedStateRebindingIntegration as Rebind } from '../savegame/post-im13-derived-state-rebinding-integration.js';
import { PostIM13BrowserSaveContinueLifecycle as Lifecycle } from '../savegame/post-im13-browser-save-continue-lifecycle.js';
import { BrowserSaveGameStorageAdapter } from '../savegame/browser-savegame-storage-adapter.js';
import { DeterministicHousingPopulationIntegration as Population } from '../domain/deterministic-housing-population-integration.js';
import { HousingHomeCapacityIntegrationContract as Housing } from '../domain/housing-home-capacity-integration-contract.js';
import { BuildingIdentityOwnershipContract as Identity } from '../domain/building-identity-ownership-contract.js';
import { BuildingLifecycleStateContract } from '../domain/building-lifecycle-state-contract.js';
import { BuildingConstructionProgressTransitionContract as Progress } from '../domain/building-construction-progress-transition-contract.js';
import { ResidentHomeAssignmentContract as Home } from '../domain/resident-home-assignment-contract.js';
import { GoldEconomyOwner } from '../domain/gold-economy-owner.js';
import { ProductionInputDemandReconnectionIntegration as Stock } from '../domain/production-input-demand-reconnection-integration.js';
import { ActiveRuntimeProductionLogisticsLoopOrchestration as Loop } from '../runtime/active-runtime-production-logistics-loop-orchestration.js';
import { ActiveRuntimeProductionOutputAvailabilityOrchestration as Output } from '../runtime/active-runtime-production-output-availability-orchestration.js';
import { ActiveRuntimeProductionCycleTimeProgression as Progression } from '../runtime/active-runtime-production-cycle-time-progression.js';
import { ActiveRuntimeProductionCycleExecutionOrchestration as Cycles } from '../runtime/active-runtime-production-cycle-execution-orchestration.js';
import { ActiveRuntimeProductionReEvaluationOrchestration as ReEvaluation } from '../runtime/active-runtime-production-re-evaluation-orchestration.js';
import { projectFromRuntime } from '../ui/player-population-housing-gold-projection.js';

class MemoryStorage {
  values=new Map();
  getItem(k) { return this.values.get(k)??null; }
  setItem(k,v) { this.values.set(k,String(v)); }
  removeItem(k) { this.values.delete(k); }
}
function snapshot(c) {
  const value=Capture.capture(c,0), valid=Validation.validate(value);
  assert.equal(valid.status,'VALID',JSON.stringify(valid)); return value;
}
function harness({failActivation=false}={}) {
  const runtime=new Runtime(RuntimeConfig);runtime.boot();let active=empty(),loop;
  const storage=new BrowserSaveGameStorageAdapter({storage:new MemoryStorage()});
  const get=()=>active,publish=c=>{active=c;};
  const output=new Output({getComposition:get,publishComposition:publish});
  const progression=new Progression({runtime,getComposition:get,publishComposition:publish,publishSettledComposition:c=>loop.publishSettledComposition(c)});
  const cycles=new Cycles({runtime,getComposition:get,publishComposition:c=>loop.publishSettledComposition(c),progression});
  const reevaluate=new ReEvaluation({runtime,getComposition:get,cycleExecution:cycles,resolveProductionContext:(id,c)=>progression.resolve(id,c)});
  loop=new Loop({runtime,getComposition:get,publishComposition:publish,outputAvailability:output,reEvaluation:reevaluate,resolveProductionContext:(id,c)=>progression.resolve(id,c)});
  const lifecycle=new Lifecycle({storage,runtime,getComposition:get,publishComposition:publish,createTransportAdapter:options=>loop.createTransportAdapter(options),prepareProductionActivation:c=>{
    const a=cycles.prepareActivation(c);return {commit(){if(failActivation)throw new Error('injected activation failure');a.commit();},rollback(){a.rollback();}};
  }});
  const newGame=new PlayerNewGameLifecycle({runtime,createComposition:fresh,publishComposition:publish,prepareProductionActivation:c=>cycles.prepareActivation(c)});
  return {runtime,storage,lifecycle,newGame,get active(){return active;},set active(c){active=c;},dispose(){if(runtime.state==='RUNNING')runtime.pause();loop.dispose();reevaluate.dispose();progression.dispose();}};
}
function house(a,capacity,policy) {
  const buildingId=a.domains.buildings.allocateId();
  const b=a.domains.buildings.create({identity:Identity.define({buildingId,definitionId:'HOUSE'}),lifecycle:BuildingLifecycleStateContract.define({buildingId}),position:{x:5,y:1}},{id:buildingId});
  return Housing.defineHousing({buildingIdentity:b.identity,capacity,...(policy===undefined?{}:{populationPolicy:policy})});
}

export async function runIM38SelfTest() {
  const results=[];
  async function check(name,fn){try{await fn();results.push({name,pass:true});}catch(e){results.push({name,pass:false,error:e.stack});}}
  await check('Start menu has no founders, buildings, initial stock or Gold',()=>{
    const c=empty(),a=c.authoritative;assert.equal(a.domains.units.ids().length,0);assert.equal(a.domains.buildings.ids().length,0);assert.deepEqual(a.buildingStocks,[]);assert.equal(a.goldEconomy.balance,0);snapshot(c);
    const main=readFileSync(new URL('../main.js',import.meta.url),'utf8');
    assert.match(main,/activeRuntimeComposition=createStartMenuComposition\(\)/);assert.match(main,/createComposition:createNewGameEconomyComposition/);
  });
  await check('One completed HQ and exactly six real founder identities with individual Home bindings',()=>{
    const c=fresh(),a=c.authoritative,hq=a.domains.buildings.get(a.domains.buildings.ids()[0]);
    assert.equal(a.domains.buildings.ids().length,1);assert.equal(hq.identity.definitionId,'HQ');assert.equal(a.constructionProgress[0].progress,1);
    assert.equal(a.domains.units.ids().length,6);assert.equal(a.homeAssignments.length,6);assert.equal(new Set(a.homeAssignments.map(x=>x.personId)).size,6);
    for(const id of a.domains.units.ids()){assert.equal(a.domains.units.get(id).identity.personId,id);assert.equal(a.domains.units.get(id).residentOrigin,'NEW_GAME_FOUNDER');assert.equal(a.homeAssignments.find(x=>x.personId===id).homeBuildingId,hq.id);}
    assert.equal(a.populationProjection.count,6);assert.equal(a.housingCapabilities[0].capacity,6);assert.equal(a.housingCapabilities[0].populationPolicy,'NO_AUTO_POPULATION');snapshot(c);
  });
  await check('All specialist capabilities covered; FREE states and one AVAILABLE capacity-4 Carrier',()=>{
    const a=fresh().authoritative,expected={CARRIER:'CAN_SIMPLE_TRANSPORT',BUILDER:'CAN_BUILD',LUMBERJACK:'CAN_LUMBERJACK',QUARRY_WORKER:'CAN_QUARRY',FISHER:'CAN_FISH',HUNTER:'CAN_HUNT'};
    assert.deepEqual(a.workforceProfiles.map(x=>x.specialization).sort(),Object.keys(expected).sort());
    for(const p of a.workforceProfiles){assert.deepEqual([...p.capabilities].sort(),['CAN_MOVE',expected[p.specialization]].sort());assert.deepEqual(a.workforceAssignments.find(x=>x.personId===p.personId),{kind:'workforce-assignment-state',personId:p.personId,availability:'FREE',assignmentId:null});}
    const carriers=a.domains.units.ids().map(id=>a.domains.units.get(id).carrier).filter(Boolean);assert.equal(carriers.length,1);assert.equal(carriers[0].capacity,4);assert.equal(carriers[0].state,'AVAILABLE');
  });
  await check('20 wood, 20 stone, 100 initial Gold; no prepared logistics, recipes or economic settlements',()=>{
    const c=fresh(),a=c.authoritative;assert.equal(a.buildingStocks.length,2);assert.equal(a.resourceState.ids().length,2);
    assert.deepEqual(a.buildingStocks.map(s=>a.resourceState.getDefinition(s.resourceTypeId).technicalName).sort(),['stone','wood']);
    for(const s of a.buildingStocks){assert.equal(s.quantity,20);const r=a.resourceState.ids().map(id=>a.resourceState.get(id)).find(r=>r.definitionId===s.resourceTypeId);assert.equal(r.amount,20);assert.equal(r.ownerId,s.buildingId);assert.equal(r.metadata.source,'IM-33_HQ_STOCK_RECONNECTION');}
    assert.equal(a.goldEconomy.balance,100);assert.equal(a.goldSettlement,null);for(const name of ['workforceRequirements','workforceBindings','carrierBindings','transportExecutions','productionRecipes','productionCycleProgressions','buildingStockTransportReservations','productionSettlementIds','goldSettlementIds','productionEffectReceipts','goldEffectReceipts'])assert.deepEqual(a[name],[],name);
    assert.equal(a.resourceDemands.ids().length,0);assert.equal(a.resourceClaims.ids().length,0);assert.equal(a.domains.jobs.ids().length,0);snapshot(c);
  });
  await check('Existing IM-37 normal ticks create no work or synthetic economic effect for fresh game',()=>{
    const h=harness();try{assert.equal(h.newGame.startFresh().status,'STARTED');h.runtime.scheduler.pause();for(let i=0;i<5;i++)h.runtime.scheduler.step(100);assert.equal(h.active.authoritative.goldEconomy.balance,100);assert.equal(h.active.authoritative.domains.units.ids().length,6);assert.equal(h.active.authoritative.domains.jobs.ids().length,0);snapshot(h.active);}finally{h.dispose();}
  });
  await check('Existing player projection displays initial balance without requiring an income settlement',()=>{
    for(const c of [empty(),fresh()]){const a=c.authoritative,p=projectFromRuntime(a);assert.equal(p.gold.balance,a.goldEconomy.balance);assert.equal(p.gold.settlementReplay,false);assert.deepEqual(a.goldSettlementIds,[]);}
  });
  await check('Explicit repeated New Game creates six founders without overwriting the old save',()=>{
    const h=harness();try{const c=fresh(),saved=JSON.stringify(snapshot({...c,authoritative:{...c.authoritative,goldEconomy:new GoldEconomyOwner({initialGold:37})}}));h.storage.write(saved);
      for(let i=0;i<2;i++){assert.equal(h.newGame.startFresh().status,'STARTED');h.runtime.pause();assert.equal(h.active.authoritative.domains.units.ids().length,6);assert.equal(h.active.authoritative.goldEconomy.balance,100);assert.equal(h.storage.read(),saved);}
    }finally{h.dispose();}
  });
  await check('Repeated Save/Reload/Continue preserves exact identities, provenance, exhausted stock and reduced Gold',async()=>{
    let h=harness();try{h.newGame.startFresh();h.runtime.pause();const a=h.active.authoritative,stocks=a.buildingStocks.map((s,i)=>({...s,quantity:i===0?0:7}));
      // An already-spent balance fixture, without adding a spending system.
      h.active={...h.active,authoritative:{...a,buildingStocks:stocks,goldEconomy:new GoldEconomyOwner({initialGold:37})}};
      const resource=a.resourceState.ids().map(id=>a.resourceState.get(id)).find(r=>r.definitionId===stocks[0].resourceTypeId);
      const d=a.resourceDemands.create({consumerId:stocks[0].buildingId,definitionId:stocks[0].resourceTypeId,amount:20,metadata:{source:'IM38_TEST_CONSUMPTION'}});
      const claim=a.resourceDemands.reserve({demandId:d.id,resourceId:resource.id,amount:20});a.resourceDemands.consumeClaim(claim.id);
      for(const s of stocks)Stock.materializeHqStock({domains:a.domains,resourceState:a.resourceState,claims:a.resourceClaims,buildingStocks:stocks,hqBuildingId:s.buildingId,resourceTypeId:s.resourceTypeId});
      const expected=snapshot(h.active);
      for(let i=0;i<3;i++){await h.lifecycle.save();const saved=h.storage.read();h.dispose();h=harness();h.storage.write(saved);assert.equal(h.lifecycle.continueFromStorage().status,'CONTINUED');h.runtime.pause();assert.deepEqual(snapshot(h.active),expected);assert.equal(h.active.authoritative.goldEconomy.balance,37);}
    }finally{h.dispose();}
  });
  await check('Vacated founder place never spawns replacement population before or after Continue',async()=>{
    const c=fresh(),a=c.authoritative,extra=house(a,1,'NO_AUTO_POPULATION');
    const homeAssignments=a.homeAssignments.map((x,i)=>i===0?Home.define({personId:x.personId,state:'ASSIGNED',homeBuildingId:extra.buildingId}):x);
    const moved={...c,authoritative:{...a,housingCapabilities:[...a.housingCapabilities,extra],homeAssignments,constructionProgress:[...a.constructionProgress,Progress.define({buildingId:extra.buildingId,progress:1})]}};
    let h=harness();try{h.storage.write(JSON.stringify(snapshot(moved)));
      for(let i=0;i<3;i++){assert.equal(h.lifecycle.continueFromStorage().status,'CONTINUED');h.runtime.pause();const current=h.active.authoritative;
        for(let n=0;n<3;n++){const p=Population.integrate({domains:current.domains,housings:current.housingCapabilities,assignments:current.homeAssignments});assert.deepEqual(p.createdGeneralResidentIds,[]);assert.deepEqual(p.assignments,current.homeAssignments);}
        assert.equal(current.domains.units.ids().length,6);const hq=current.residentHousingAssignment.housingStates.find(x=>x.buildingId===a.housingCapabilities[0].buildingId);assert.equal(hq.availableSlots,1);assert.equal(hq.residentialAdmission.housingCapability.populationPolicy,'NO_AUTO_POPULATION');
        await h.lifecycle.save();const saved=h.storage.read();h.dispose();h=harness();h.storage.write(saved);
      }
    }finally{h.dispose();}
  });
  await check('Ordinary Housing still creates residents and missing legacy policy round-trips unchanged',()=>{
    const c=empty(),a=c.authoritative,legacy=house(a,2);assert.equal(Object.hasOwn(legacy,'populationPolicy'),false);
    const p=Population.integrate({domains:a.domains,housings:[legacy],assignments:[]});assert.equal(p.createdGeneralResidentIds.length,2);for(const [i,id]of p.createdGeneralResidentIds.entries())a.domains.units.update(id,d=>{d.position={x:1+i,y:3};});
    const saved=snapshot({...c,authoritative:{...a,housingCapabilities:[legacy],homeAssignments:p.assignments,constructionProgress:[Progress.define({buildingId:legacy.buildingId,progress:1})]}}),restored=Restore.restore(saved);
    assert.equal(restored.status,'RESTORED');const rebound=Rebind.rebind(restored);assert.equal(rebound.status,'REBOUND',JSON.stringify(rebound));assert.equal(rebound.derivedState.population.count,2);assert.equal(Object.hasOwn(restored.runtimeState.housingCapabilities[0],'populationPolicy'),false);
    assert.equal(Population.integrate({domains:a.domains,housings:[{...legacy,populationPolicy:'AUTO_FILL'}],assignments:p.assignments}).createdGeneralResidentIds.length,0);
  });
  await check('Unknown Housing policy rejected by domain and Save validation',()=>{
    const c=fresh(),a=c.authoritative;for(const v of ['UNKNOWN',null,false]){assert.throws(()=>Population.integrate({domains:a.domains,housings:[{...a.housingCapabilities[0],populationPolicy:v}],assignments:a.homeAssignments}));const invalid=structuredClone(snapshot(c));invalid.authoritative.definitions.housingCapabilities[0].populationPolicy=v;assert.equal(Validation.validate(invalid).status,'INVALID');}
  });
  await check('Missing, corrupt and contradictory saves cannot bootstrap or replace active owners',()=>{
    const h=harness();try{const before=h.active;assert.equal(h.lifecycle.continueFromStorage().status,'NO_SAVE');assert.equal(h.active,before);
      for(const text of ['{broken',JSON.stringify({schemaVersion:999})]){h.storage.write(text);assert.equal(h.lifecycle.continueFromStorage().status,'REJECTED');assert.equal(h.active,before);assert.equal(h.storage.read(),text);}
      const invalid=structuredClone(snapshot(fresh()));invalid.authoritative.homeAssignments[0].homeBuildingId='building:99999999';h.storage.write(JSON.stringify(invalid));assert.equal(h.lifecycle.continueFromStorage().status,'REJECTED');assert.equal(h.active,before);assert.equal(before.authoritative.domains.units.ids().length,0);
    }finally{h.dispose();}
  });
  await check('Activation failure rolls back the composition and leaves Runtime non-running and save intact',()=>{
    const h=harness({failActivation:true});try{const before=h.active,saved=JSON.stringify(snapshot(fresh()));h.storage.write(saved);assert.equal(h.lifecycle.continueFromStorage().reason,'ACTIVATION_FAILED');assert.equal(h.active,before);assert.equal(h.storage.read(),saved);assert.notEqual(h.runtime.state,'RUNNING');}finally{h.dispose();}
  });
  return {kind:'im-38-self-test-result',pass:results.every(x=>x.pass),checks:results.length,results};
}
