import { WorldStore } from '../world/world-store.js';
import { MapStructure } from '../world/map-structure.js';
import { TraversalClassificationSource } from '../transport/traversal-classification-source.js';
import { RoadPreferredRoutingIntegration } from '../transport/road-preferred-routing-integration.js';
import { DeterministicCostAwarePathfinder } from '../transport/deterministic-cost-aware-pathfinder.js';

export function runCr11cSelfTest() {
  const results=[];
  const check=(name,fn)=>{try{results.push({name,pass:!!fn()});}catch(error){results.push({name,pass:false,error:String(error?.message||error)});}};
  const world=new WorldStore();
  const map=new MapStructure(world,{name:'CR-11C',width:5,height:3,cellSize:1});
  const source=new TraversalClassificationSource({map});
  const start={x:0,y:1};
  const target={x:4,y:1};

  check('neutral-baseline-stays-geometrically-direct',()=>{
    const route=RoadPreferredRoutingIntegration.find({map,startPosition:start,targetPosition:target,classificationSource:source});
    return route.waypoints.every(p=>p.y===1);
  });

  for(let x=0;x<=4;x+=1) source.classify({x,y:0},'ROAD');

  check('longer-road-route-beats-shorter-neutral-route',()=>{
    const route=RoadPreferredRoutingIntegration.find({map,startPosition:start,targetPosition:target,classificationSource:source});
    return route.waypoints.length>3 && route.waypoints.some(p=>p.y===0);
  });

  check('road-preference-is-deterministic',()=>{
    const a=RoadPreferredRoutingIntegration.find({map,startPosition:start,targetPosition:target,classificationSource:source});
    const b=RoadPreferredRoutingIntegration.find({map,startPosition:start,targetPosition:target,classificationSource:source});
    return JSON.stringify(a)===JSON.stringify(b);
  });

  check('classification-remains-external-to-map-structure',()=>{
    return map.cellAt(1,0).traversalType===undefined && source.typeAt({x:1,y:0})==='ROAD';
  });

  check('integration-does-not-change-frozen-pathfinder-api',()=>{
    return typeof DeterministicCostAwarePathfinder.find==='function' && DeterministicCostAwarePathfinder.find.length<=1;
  });

  check('cr11c-adds-no-obstacle-blocking-or-dynamic-reroute-policy',()=>{
    const text=RoadPreferredRoutingIntegration.find.toString().toLowerCase();
    return !text.includes('obstacle')&&!text.includes('blocked')&&!text.includes('reroute');
  });

  return Object.freeze({pass:results.every(r=>r.pass),results:Object.freeze(results.map(Object.freeze))});
}
