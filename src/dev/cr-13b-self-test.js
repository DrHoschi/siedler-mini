import { WorldStore } from '../world/world-store.js';
import { MapStructure } from '../world/map-structure.js';
import { RouteContract } from '../transport/route-contract.js';
import { BlockedCellSource } from '../transport/blocked-cell-source.js';
import { RouteValidityEvaluator } from '../transport/route-validity-evaluator.js';

export function runCr13bSelfTest() {
  const results=[];
  const check=(name,fn)=>{try{results.push({name,pass:!!fn()});}catch(error){results.push({name,pass:false,error:String(error?.message||error)});}};

  const world=new WorldStore();
  const map=new MapStructure(world,{name:'CR-13B',width:5,height:2,cellSize:1});
  const blocked=new BlockedCellSource({map});
  const route=RouteContract.define({startPosition:{x:0,y:0},targetPosition:{x:4,y:0},waypoints:[{x:1,y:0},{x:2,y:0},{x:3,y:0}]});

  check('fully-traversable-route-is-valid',()=>RouteValidityEvaluator.evaluate({route,traversabilitySource:blocked}).state==='VALID');

  blocked.block({x:2,y:0});
  check('blocked-remaining-waypoint-is-invalid',()=>RouteValidityEvaluator.evaluate({route,traversabilitySource:blocked}).state==='INVALID');
  check('evaluation-is-deterministic',()=>JSON.stringify(RouteValidityEvaluator.evaluate({route,traversabilitySource:blocked}))===JSON.stringify(RouteValidityEvaluator.evaluate({route,traversabilitySource:blocked})));
  check('completed-blocked-waypoint-is-ignored',()=>RouteValidityEvaluator.evaluate({route,traversabilitySource:blocked,completedWaypointCount:2}).state==='VALID');

  blocked.clear({x:2,y:0});
  blocked.block({x:4,y:0});
  check('blocked-target-is-invalid',()=>RouteValidityEvaluator.evaluate({route,traversabilitySource:blocked}).state==='INVALID');

  blocked.clear({x:4,y:0});
  check('invalid-progress-range-is-rejected',()=>{try{RouteValidityEvaluator.evaluate({route,traversabilitySource:blocked,completedWaypointCount:4});return false;}catch(error){return error instanceof RangeError;}});
  check('missing-traversability-source-is-rejected',()=>{try{RouteValidityEvaluator.evaluate({route});return false;}catch(error){return error instanceof TypeError;}});
  check('cr13b-adds-no-pathfinding-movement-or-rerouting',()=>{
    const text=RouteValidityEvaluator.toString().toLowerCase();
    return !text.includes('pathfinder')&&!text.includes('reroute')&&!text.includes('movement')&&!text.includes('findroute');
  });

  const blockerCount=results.filter(r=>!r.pass).length;
  return Object.freeze({pass:blockerCount===0,blockerCount,results:Object.freeze(results.map(Object.freeze))});
}
