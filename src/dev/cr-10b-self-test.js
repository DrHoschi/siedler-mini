import { DeterministicCostAwarePathfinder } from '../transport/deterministic-cost-aware-pathfinder.js';
import { DeterministicGridPathfinder } from '../transport/deterministic-grid-pathfinder.js';
import { TraversalCostContract } from '../transport/traversal-cost-contract.js';

function testMap(width=6,height=6) {
  return Object.freeze({contains:(x,y)=>Number.isInteger(x)&&Number.isInteger(y)&&x>=0&&y>=0&&x<width&&y<height});
}

function routePoints(route) { return [route.startPosition,...route.waypoints,route.targetPosition]; }

export function runCr10bSelfTest() {
  const results=[];
  const check=(name,fn)=>{try{results.push({name,pass:!!fn()});}catch(error){results.push({name,pass:false,error:String(error?.message||error)});}};
  const rejects=fn=>{try{fn();return false;}catch{return true;}};
  const map=testMap();
  const start={x:0,y:0}, target={x:2,y:2};

  check('neutral-costs-match-frozen-cr09-route',()=>{
    const legacy=DeterministicGridPathfinder.find({map,startPosition:start,targetPosition:target});
    const costAware=DeterministicCostAwarePathfinder.find({map,startPosition:start,targetPosition:target});
    return JSON.stringify(costAware)===JSON.stringify(legacy);
  });
  check('cheaper-detour-beats-shorter-expensive-route',()=>{
    const route=DeterministicCostAwarePathfinder.find({map,startPosition:{x:0,y:0},targetPosition:{x:2,y:0},costAt:({x,y})=>TraversalCostContract.define({baseCost:x===1&&y===0?10:1})});
    return JSON.stringify(routePoints(route))===JSON.stringify([{x:0,y:0},{x:0,y:1},{x:1,y:1},{x:2,y:1},{x:2,y:0}]);
  });
  check('cost-choice-is-repeatable',()=>{
    const input={map,startPosition:{x:0,y:0},targetPosition:{x:3,y:2},costAt:({x,y})=>TraversalCostContract.define({baseCost:(x===1&&y===0)||(x===2&&y===0)?3:1})};
    return JSON.stringify(DeterministicCostAwarePathfinder.find(input))===JSON.stringify(DeterministicCostAwarePathfinder.find(input));
  });
  check('equal-total-cost-uses-fixed-tie-break',()=>{
    const route=DeterministicCostAwarePathfinder.find({map,startPosition:start,targetPosition:target});
    return JSON.stringify(routePoints(route))===JSON.stringify([{x:0,y:0},{x:1,y:0},{x:2,y:0},{x:2,y:1},{x:2,y:2}]);
  });
  check('returned-route-remains-cr09-route-contract-compatible',()=>{
    const route=DeterministicCostAwarePathfinder.find({map,startPosition:start,targetPosition:target});
    return route.kind==='route'&&route.state==='DEFINED'&&Object.isFrozen(route)&&Object.isFrozen(route.waypoints);
  });
  check('every-step-remains-orthogonal-and-inside-map',()=>{
    const points=routePoints(DeterministicCostAwarePathfinder.find({map,startPosition:{x:0,y:0},targetPosition:{x:5,y:5}}));
    return points.every((p,i)=>map.contains(p.x,p.y)&&(i===0||Math.abs(p.x-points[i-1].x)+Math.abs(p.y-points[i-1].y)===1));
  });
  check('invalid-cost-data-is-rejected',()=>rejects(()=>DeterministicCostAwarePathfinder.find({map,startPosition:start,targetPosition:target,costAt:()=>({baseCost:0})})));
  check('costAt-must-be-function-when-provided',()=>rejects(()=>DeterministicCostAwarePathfinder.find({map,startPosition:start,targetPosition:target,costAt:{}})));
  check('start-and-target-validation-remains-strict',()=>rejects(()=>DeterministicCostAwarePathfinder.find({map,startPosition:{x:-1,y:0},targetPosition:target}))&&rejects(()=>DeterministicCostAwarePathfinder.find({map,startPosition:start,targetPosition:start})));
  check('cr10b-does-not-mutate-input',()=>{const input={startPosition:{x:0,y:0},targetPosition:{x:2,y:0}};const before=JSON.stringify(input);DeterministicCostAwarePathfinder.find({map,...input});return JSON.stringify(input)===before;});
  check('cr10b-has-no-obstacle-or-reroute-result-state',()=>{const route=DeterministicCostAwarePathfinder.find({map,startPosition:start,targetPosition:target});const s=JSON.stringify(route).toLowerCase();return !s.includes('blocked')&&!s.includes('obstacle')&&!s.includes('reroute')&&!s.includes('recalculate');});
  check('traversal-type-alone-does-not-create-road-preference',()=>{
    const route=DeterministicCostAwarePathfinder.find({map,startPosition:start,targetPosition:target,costAt:({x})=>TraversalCostContract.define({traversalType:x===1?'ROAD':'NEUTRAL'})});
    const neutral=DeterministicCostAwarePathfinder.find({map,startPosition:start,targetPosition:target});
    return JSON.stringify(route)===JSON.stringify(neutral);
  });

  return Object.freeze({pass:results.every(r=>r.pass),results:Object.freeze(results.map(Object.freeze))});
}
