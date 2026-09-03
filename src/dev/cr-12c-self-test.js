import { WorldStore } from '../world/world-store.js';
import { MapStructure } from '../world/map-structure.js';
import { TraversalClassificationSource } from '../transport/traversal-classification-source.js';
import { BlockedCellSource } from '../transport/blocked-cell-source.js';
import { ObstacleAwareRoutingIntegration } from '../transport/obstacle-aware-routing-integration.js';

export function runCr12cSelfTest() {
  const results=[];
  const check=(name,fn)=>{try{results.push({name,pass:!!fn()});}catch(error){results.push({name,pass:false,error:String(error?.message||error)});}};

  const world=new WorldStore();
  const map=new MapStructure(world,{name:'CR-12C',width:5,height:3,cellSize:1});
  const classificationSource=new TraversalClassificationSource({map});
  const blockedCellSource=new BlockedCellSource({map});
  const start={x:0,y:1};
  const target={x:4,y:1};

  check('neutral-unblocked-baseline-is-direct',()=>{
    const route=ObstacleAwareRoutingIntegration.find({map,startPosition:start,targetPosition:target,classificationSource,blockedCellSource});
    return route.waypoints.every(p=>p.y===1);
  });

  blockedCellSource.block({x:2,y:1});

  check('blocked-direct-cell-is-never-used',()=>{
    const route=ObstacleAwareRoutingIntegration.find({map,startPosition:start,targetPosition:target,classificationSource,blockedCellSource});
    return !route.waypoints.some(p=>p.x===2&&p.y===1);
  });

  check('blocked-direct-cell-is-deterministically-bypassed',()=>{
    const a=ObstacleAwareRoutingIntegration.find({map,startPosition:start,targetPosition:target,classificationSource,blockedCellSource});
    const b=ObstacleAwareRoutingIntegration.find({map,startPosition:start,targetPosition:target,classificationSource,blockedCellSource});
    return JSON.stringify(a)===JSON.stringify(b) && a.waypoints.some(p=>p.y!==1);
  });

  blockedCellSource.clear({x:2,y:1});
  for(let x=0;x<=4;x+=1) classificationSource.classify({x,y:0},'ROAD');
  blockedCellSource.block({x:2,y:0});

  check('road-preference-remains-active-among-traversable-cells',()=>{
    const route=ObstacleAwareRoutingIntegration.find({map,startPosition:start,targetPosition:target,classificationSource,blockedCellSource});
    return route.waypoints.some(p=>p.y===0) && !route.waypoints.some(p=>p.x===2&&p.y===0);
  });

  const sealedWorld=new WorldStore();
  const sealedMap=new MapStructure(sealedWorld,{name:'CR-12C sealed',width:3,height:3,cellSize:1});
  const sealedClassification=new TraversalClassificationSource({map:sealedMap});
  const sealedBlocked=new BlockedCellSource({map:sealedMap});
  sealedBlocked.block({x:1,y:0});
  sealedBlocked.block({x:1,y:1});
  sealedBlocked.block({x:1,y:2});

  check('no-traversable-route-fails-deterministically',()=>{
    try {
      ObstacleAwareRoutingIntegration.find({map:sealedMap,startPosition:{x:0,y:1},targetPosition:{x:2,y:1},classificationSource:sealedClassification,blockedCellSource:sealedBlocked});
      return false;
    } catch(error) {
      return String(error?.message||error).includes('no traversable route found');
    }
  });

  check('integration-adds-no-dynamic-rerouting',()=>{
    const text=ObstacleAwareRoutingIntegration.find.toString().toLowerCase();
    return !text.includes('reroute')&&!text.includes('recalculateonmove')&&!text.includes('movement');
  });

  return Object.freeze({pass:results.every(r=>r.pass),results:Object.freeze(results.map(Object.freeze))});
}
