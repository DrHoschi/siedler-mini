import { WorldStore } from '../world/world-store.js';
import { MapStructure } from '../world/map-structure.js';
import { DeterministicGridPathfinder } from '../transport/deterministic-grid-pathfinder.js';

export function runCr09bSelfTest() {
  const results=[];
  const check=(name,fn)=>{try{results.push({name,pass:!!fn()});}catch(error){results.push({name,pass:false,error:String(error?.message||error)});}};
  const rejects=fn=>{try{fn();return false;}catch{return true;}};
  const makeMap=()=>new MapStructure(new WorldStore(),{name:'CR-09B Test Grid',width:8,height:8,cellSize:1});

  check('pathfinder-returns-route-contract-shape',()=>{const route=DeterministicGridPathfinder.find({map:makeMap(),startPosition:{x:1,y:1},targetPosition:{x:3,y:2}});return route.kind==='route'&&route.state==='DEFINED'&&Object.isFrozen(route)&&Object.isFrozen(route.waypoints);});
  check('pathfinder-uses-deterministic-x-then-y-order',()=>{const route=DeterministicGridPathfinder.find({map:makeMap(),startPosition:{x:1,y:1},targetPosition:{x:3,y:3}});return route.waypoints.map(p=>`${p.x},${p.y}`).join('|')==='2,1|3,1|3,2';});
  check('pathfinder-is-deterministic-across-repeated-runs',()=>{const map=makeMap();const input={map,startPosition:{x:6,y:5},targetPosition:{x:2,y:1}};return JSON.stringify(DeterministicGridPathfinder.find(input))===JSON.stringify(DeterministicGridPathfinder.find(input));});
  check('pathfinder-handles-reverse-directions',()=>{const route=DeterministicGridPathfinder.find({map:makeMap(),startPosition:{x:4,y:4},targetPosition:{x:1,y:2}});return route.waypoints.map(p=>`${p.x},${p.y}`).join('|')==='3,4|2,4|1,4|1,3';});
  check('pathfinder-horizontal-and-vertical-routes-are-shortest',()=>{const map=makeMap();const horizontal=DeterministicGridPathfinder.find({map,startPosition:{x:0,y:0},targetPosition:{x:4,y:0}});const vertical=DeterministicGridPathfinder.find({map,startPosition:{x:2,y:1},targetPosition:{x:2,y:5}});return horizontal.waypoints.length===3&&vertical.waypoints.length===3;});
  check('pathfinder-adjacent-target-needs-no-intermediate-waypoint',()=>DeterministicGridPathfinder.find({map:makeMap(),startPosition:{x:2,y:2},targetPosition:{x:3,y:2}}).waypoints.length===0);
  check('pathfinder-manhattan-step-count-is-minimal',()=>{const start={x:1,y:6},target={x:6,y:2};const route=DeterministicGridPathfinder.find({map:makeMap(),startPosition:start,targetPosition:target});const manhattan=Math.abs(target.x-start.x)+Math.abs(target.y-start.y);return route.waypoints.length===manhattan-1;});
  check('pathfinder-requires-integer-grid-positions',()=>rejects(()=>DeterministicGridPathfinder.find({map:makeMap(),startPosition:{x:1.5,y:1},targetPosition:{x:2,y:2}}))&&rejects(()=>DeterministicGridPathfinder.find({map:makeMap(),startPosition:{x:1,y:1},targetPosition:{x:2,y:NaN}})));
  check('pathfinder-requires-start-and-target-inside-map',()=>rejects(()=>DeterministicGridPathfinder.find({map:makeMap(),startPosition:{x:-1,y:0},targetPosition:{x:2,y:2}}))&&rejects(()=>DeterministicGridPathfinder.find({map:makeMap(),startPosition:{x:1,y:1},targetPosition:{x:8,y:2}})));
  check('pathfinder-requires-distinct-start-and-target',()=>rejects(()=>DeterministicGridPathfinder.find({map:makeMap(),startPosition:{x:2,y:2},targetPosition:{x:2,y:2}})));
  check('cr09b-does-not-mutate-input',()=>{const map=makeMap();const startPosition={x:1,y:1};const targetPosition={x:4,y:3};const before=JSON.stringify({startPosition,targetPosition});DeterministicGridPathfinder.find({map,startPosition,targetPosition});return JSON.stringify({startPosition,targetPosition})===before;});
  check('cr09b-route-carries-no-road-cost-obstacle-or-movement-policy',()=>{const route=DeterministicGridPathfinder.find({map:makeMap(),startPosition:{x:0,y:0},targetPosition:{x:3,y:2}});const serialized=JSON.stringify(route).toLowerCase();return !serialized.includes('road')&&!serialized.includes('cost')&&!serialized.includes('obstacle')&&!serialized.includes('passability')&&!serialized.includes('speed')&&!serialized.includes('velocity')&&!serialized.includes('carrier');});

  return Object.freeze({pass:results.every(r=>r.pass),results:Object.freeze(results.map(Object.freeze))});
}
