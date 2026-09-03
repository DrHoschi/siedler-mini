import { WorldStore } from '../world/world-store.js';
import { MapStructure } from '../world/map-structure.js';
import { BlockedCellSource } from '../transport/blocked-cell-source.js';
import { DeterministicCostAwarePathfinder } from '../transport/deterministic-cost-aware-pathfinder.js';

export function runCr12bSelfTest() {
  const results=[];
  const check=(name,fn)=>{try{results.push({name,pass:!!fn()});}catch(error){results.push({name,pass:false,error:String(error?.message||error)});}};
  const rejects=fn=>{try{fn();return false;}catch{return true;}};
  const world=new WorldStore();
  const map=new MapStructure(world,{name:'CR-12B',width:4,height:3,cellSize:1});
  const source=new BlockedCellSource({map});

  check('default-is-traversable',()=>source.stateAt({x:1,y:1})==='TRAVERSABLE'&&source.isTraversable({x:1,y:1})===true);
  check('cell-can-be-blocked',()=>{const r=source.block({x:1,y:1});return r.state==='BLOCKED'&&r.traversable===false&&source.stateAt({x:1,y:1})==='BLOCKED';});
  check('classification-is-cell-local',()=>source.stateAt({x:0,y:1})==='TRAVERSABLE'&&source.stateAt({x:2,y:1})==='TRAVERSABLE');
  check('blocked-cell-can-be-cleared',()=>{source.clear({x:1,y:1});return source.stateAt({x:1,y:1})==='TRAVERSABLE'&&source.entries().length===0;});
  check('state-normalizes-through-contract',()=>source.set({x:2,y:1},' blocked ').state==='BLOCKED');
  check('invalid-state-rejected',()=>rejects(()=>source.set({x:0,y:0},'WATER')));
  check('outside-map-rejected',()=>rejects(()=>source.block({x:9,y:9}))&&rejects(()=>source.stateAt({x:-1,y:0})));
  check('map-structure-is-not-mutated',()=>map.cellAt(2,1).state===undefined&&map.cellAt(2,1).traversability===undefined);
  check('source-does-not-affect-pathfinder-yet',()=>{const before=DeterministicCostAwarePathfinder.find({map,startPosition:{x:0,y:0},targetPosition:{x:3,y:0}});source.block({x:1,y:0});const after=DeterministicCostAwarePathfinder.find({map,startPosition:{x:0,y:0},targetPosition:{x:3,y:0}});return JSON.stringify(before)===JSON.stringify(after);});
  check('cr12b-adds-no-reroute-policy',()=>{const text=BlockedCellSource.toString().toLowerCase();return !text.includes('pathfinder')&&!text.includes('reroute')&&!text.includes('route');});

  return Object.freeze({pass:results.every(r=>r.pass),results:Object.freeze(results.map(Object.freeze))});
}
