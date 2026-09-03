import { runCr12aSelfTest } from './cr-12a-self-test.js';
import { runCr12bSelfTest } from './cr-12b-self-test.js';
import { runCr12cSelfTest } from './cr-12c-self-test.js';
import { runCr11FreezeGate } from './cr-11-freeze-gate.js';
import { WorldStore } from '../world/world-store.js';
import { MapStructure } from '../world/map-structure.js';
import { TraversalClassificationSource } from '../transport/traversal-classification-source.js';
import { BlockedCellSource } from '../transport/blocked-cell-source.js';
import { ObstacleAwareRoutingIntegration } from '../transport/obstacle-aware-routing-integration.js';

export function runCr12FreezeGate() {
  const results=[];
  const check=(name,fn)=>{try{results.push({name,pass:!!fn()});}catch(error){results.push({name,pass:false,error:String(error?.message||error)});}};

  const a=runCr12aSelfTest(), b=runCr12bSelfTest(), c=runCr12cSelfTest(), cr11=runCr11FreezeGate();
  check('cr12a-regression-pass',()=>a.pass);
  check('cr12b-regression-pass',()=>b.pass);
  check('cr12c-regression-pass',()=>c.pass);
  check('cr11-freeze-regression-pass',()=>cr11.pass&&cr11.blockerCount===0);

  const world=new WorldStore();
  const map=new MapStructure(world,{name:'CR-12 Freeze Gate',width:5,height:3,cellSize:1});
  const classifications=new TraversalClassificationSource({map});
  const blocked=new BlockedCellSource({map});
  const start={x:0,y:1}, target={x:4,y:1};

  check('unblocked-map-preserves-existing-routing',()=>{
    const first=ObstacleAwareRoutingIntegration.find({map,startPosition:start,targetPosition:target,classificationSource:classifications,blockedCellSource:blocked});
    const second=ObstacleAwareRoutingIntegration.find({map,startPosition:start,targetPosition:target,classificationSource:classifications,blockedCellSource:blocked});
    return first.waypoints.every(p=>p.y===1)&&JSON.stringify(first)===JSON.stringify(second);
  });

  blocked.block({x:2,y:1});
  check('blocked-cell-is-never-part-of-route',()=>{
    const route=ObstacleAwareRoutingIntegration.find({map,startPosition:start,targetPosition:target,classificationSource:classifications,blockedCellSource:blocked});
    return route.waypoints.every(p=>blocked.isTraversable(p))&&!route.waypoints.some(p=>p.x===2&&p.y===1);
  });
  check('blocked-cell-bypass-is-deterministic',()=>{
    const first=ObstacleAwareRoutingIntegration.find({map,startPosition:start,targetPosition:target,classificationSource:classifications,blockedCellSource:blocked});
    const second=ObstacleAwareRoutingIntegration.find({map,startPosition:start,targetPosition:target,classificationSource:classifications,blockedCellSource:blocked});
    return first.waypoints.some(p=>p.y!==1)&&JSON.stringify(first)===JSON.stringify(second);
  });

  blocked.clear({x:2,y:1});
  for(let x=0;x<=4;x+=1) classifications.classify({x,y:0},'ROAD');
  blocked.block({x:2,y:2});
  check('road-preference-remains-active-only-on-traversable-cells',()=>{
    const route=ObstacleAwareRoutingIntegration.find({map,startPosition:start,targetPosition:target,classificationSource:classifications,blockedCellSource:blocked});
    return route.waypoints.some(p=>p.y===0)&&route.waypoints.every(p=>blocked.isTraversable(p));
  });

  const sealedWorld=new WorldStore();
  const sealedMap=new MapStructure(sealedWorld,{name:'CR-12 Freeze sealed',width:3,height:3,cellSize:1});
  const sealedClassifications=new TraversalClassificationSource({map:sealedMap});
  const sealedBlocked=new BlockedCellSource({map:sealedMap});
  for(let y=0;y<3;y+=1) sealedBlocked.block({x:1,y});
  check('fully-cut-off-target-produces-no-route',()=>{
    try {
      ObstacleAwareRoutingIntegration.find({map:sealedMap,startPosition:{x:0,y:1},targetPosition:{x:2,y:1},classificationSource:sealedClassifications,blockedCellSource:sealedBlocked});
      return false;
    } catch(error) {
      return String(error?.message||error).includes('no traversable route found');
    }
  });

  check('freeze-scope-has-no-dynamic-rerouting-or-movement-coupling',()=>{
    const sample=ObstacleAwareRoutingIntegration.find.toString().toLowerCase();
    return !sample.includes('reroute')&&!sample.includes('recalculateonmove')&&!sample.includes('movement');
  });

  const blockerCount=results.filter(r=>!r.pass).length;
  return Object.freeze({pass:blockerCount===0,blockerCount,results:Object.freeze(results.map(Object.freeze))});
}
