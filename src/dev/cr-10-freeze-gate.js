import { runCr10aSelfTest } from './cr-10a-self-test.js';
import { runCr10bSelfTest } from './cr-10b-self-test.js';
import { runCr10cSelfTest } from './cr-10c-self-test.js';
import { MapStructure } from '../world/map-structure.js';
import { WorldStore } from '../world/world-store.js';
import { DeterministicGridPathfinder } from '../transport/deterministic-grid-pathfinder.js';
import { DeterministicCostAwarePathfinder } from '../transport/deterministic-cost-aware-pathfinder.js';
import { TraversalCostResolver } from '../transport/traversal-cost-resolver.js';

export function runCr10FreezeGate() {
  const results=[];
  const check=(name,fn)=>{try{results.push({name,pass:!!fn()});}catch(error){results.push({name,pass:false,error:String(error?.message||error)});}};

  const a=runCr10aSelfTest(), b=runCr10bSelfTest(), c=runCr10cSelfTest();
  check('cr10a-regression-pass',()=>a.pass);
  check('cr10b-regression-pass',()=>b.pass);
  check('cr10c-regression-pass',()=>c.pass);

  const world=new WorldStore();
  const map=new MapStructure(world,{name:'CR-10 Freeze Gate',width:6,height:6,cellSize:1});
  const start={x:0,y:0}, target={x:4,y:3};
  const neutralResolver=new TraversalCostResolver({typeAt:()=> 'NEUTRAL'});

  check('neutral-costs-preserve-cr09-route',()=>{
    const cr09=DeterministicGridPathfinder.find({map,startPosition:start,targetPosition:target});
    const cr10=DeterministicCostAwarePathfinder.find({map,startPosition:start,targetPosition:target,costAt:position=>neutralResolver.resolve(position)});
    return JSON.stringify(cr09)===JSON.stringify(cr10);
  });

  check('resolved-costs-drive-cost-aware-selection',()=>{
    const resolver=new TraversalCostResolver({
      typeAt:({x,y}) => (x===1&&y===0)||(x===2&&y===0)?'PATH':'NEUTRAL',
      profiles:{NEUTRAL:{baseCost:1,costMultiplier:1},PATH:{baseCost:1,costMultiplier:5},ROAD:{baseCost:1,costMultiplier:1}}
    });
    const route=DeterministicCostAwarePathfinder.find({map,startPosition:{x:0,y:0},targetPosition:{x:3,y:0},costAt:position=>resolver.resolve(position)});
    return route.waypoints.some(p=>p.y!==0);
  });

  check('equal-cost-resolution-is-deterministic',()=>{
    const x=DeterministicCostAwarePathfinder.find({map,startPosition:start,targetPosition:target,costAt:p=>neutralResolver.resolve(p)});
    const y=DeterministicCostAwarePathfinder.find({map,startPosition:start,targetPosition:target,costAt:p=>neutralResolver.resolve(p)});
    return JSON.stringify(x)===JSON.stringify(y);
  });

  check('freeze-scope-has-no-automatic-road-preference',()=>{
    const neutral=neutralResolver.resolve({x:1,y:1});
    const roadResolver=new TraversalCostResolver({typeAt:()=> 'ROAD'});
    const road=roadResolver.resolve({x:1,y:1});
    return neutral.traversalCost===road.traversalCost;
  });

  check('freeze-scope-has-no-obstacle-or-reroute-policy',()=>{
    const sample=JSON.stringify({a:a.results,b:b.results,c:c.results}).toLowerCase();
    return !sample.includes('blockedcell')&&!sample.includes('obstaclemap')&&!sample.includes('dynamicreroute')&&!sample.includes('recalculateonmove');
  });

  const blockerCount=results.filter(r=>!r.pass).length;
  return Object.freeze({pass:blockerCount===0,blockerCount,results:Object.freeze(results.map(Object.freeze))});
}
