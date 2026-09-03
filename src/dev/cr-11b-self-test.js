import { WorldStore } from '../world/world-store.js';
import { MapStructure } from '../world/map-structure.js';
import { TraversalClassificationSource } from '../transport/traversal-classification-source.js';
import { TraversalCostResolver } from '../transport/traversal-cost-resolver.js';

export function runCr11bSelfTest() {
  const results=[];
  const check=(name,fn)=>{try{results.push({name,pass:!!fn()});}catch(error){results.push({name,pass:false,error:String(error?.message||error)});}};
  const rejects=fn=>{try{fn();return false;}catch{return true;}};
  const world=new WorldStore();
  const map=new MapStructure(world,{name:'CR-11B Test',width:4,height:3,cellSize:1});
  const source=new TraversalClassificationSource({map});

  check('cells-default-to-neutral',()=>source.typeAt({x:0,y:0})==='NEUTRAL'&&source.typeAt({x:3,y:2})==='NEUTRAL');
  check('cell-can-be-classified-path',()=>source.classify({x:1,y:1},'PATH').traversalType==='PATH'&&source.typeAt({x:1,y:1})==='PATH');
  check('cell-can-be-classified-road',()=>source.classify({x:2,y:1},'road').traversalType==='ROAD'&&source.typeAt({x:2,y:1})==='ROAD');
  check('classification-is-cell-local',()=>source.typeAt({x:0,y:1})==='NEUTRAL'&&source.typeAt({x:1,y:1})==='PATH');
  check('neutral-clears-explicit-classification',()=>{source.classify({x:1,y:1},'NEUTRAL');return source.typeAt({x:1,y:1})==='NEUTRAL';});
  check('clear-restores-neutral',()=>{source.classify({x:0,y:2},'ROAD');source.clear({x:0,y:2});return source.typeAt({x:0,y:2})==='NEUTRAL';});
  check('unknown-type-is-rejected',()=>rejects(()=>source.classify({x:0,y:0},'SWAMP')));
  check('outside-map-is-rejected',()=>rejects(()=>source.classify({x:99,y:99},'ROAD'))&&rejects(()=>source.typeAt({x:-1,y:0})));
  check('classification-source-feeds-cr10c-typeAt-contract',()=>{source.classify({x:2,y:2},'ROAD');const resolver=new TraversalCostResolver({profiles:{ROAD:{baseCost:0.5}}});const costAt=resolver.costAt({typeAt:p=>source.typeAt(p)});return costAt({x:2,y:2}).traversalType==='ROAD'&&costAt({x:2,y:2}).traversalCost===0.5;});
  check('classification-does-not-mutate-map-cell-shape',()=>{const before=JSON.stringify(map.cellAt(3,1));source.classify({x:3,y:1},'PATH');return JSON.stringify(map.cellAt(3,1))===before;});
  check('cr11b-adds-no-routing-obstacle-or-reroute-policy',()=>{const text=JSON.stringify(source.entries()).toLowerCase();return !text.includes('route')&&!text.includes('obstacle')&&!text.includes('blocked')&&!text.includes('reroute');});

  return Object.freeze({pass:results.every(r=>r.pass),results:Object.freeze(results.map(Object.freeze))});
}
