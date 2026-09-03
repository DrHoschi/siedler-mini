import { runCr11aSelfTest } from './cr-11a-self-test.js';
import { runCr11bSelfTest } from './cr-11b-self-test.js';
import { runCr11cSelfTest } from './cr-11c-self-test.js';
import { runCr10bSelfTest } from './cr-10b-self-test.js';
import { runCr10cSelfTest } from './cr-10c-self-test.js';
import { WorldStore } from '../world/world-store.js';
import { MapStructure } from '../world/map-structure.js';
import { RoadPreferenceCostPolicy } from '../transport/road-preference-cost-policy.js';
import { TraversalClassificationSource } from '../transport/traversal-classification-source.js';
import { RoadPreferredRoutingIntegration } from '../transport/road-preferred-routing-integration.js';

export function runCr11FreezeGate() {
  const results=[];
  const check=(name,fn)=>{try{results.push({name,pass:!!fn()});}catch(error){results.push({name,pass:false,error:String(error?.message||error)});}};

  const a=runCr11aSelfTest(), b=runCr11bSelfTest(), c=runCr11cSelfTest();
  const cr10b=runCr10bSelfTest(), cr10c=runCr10cSelfTest();
  check('cr11a-regression-pass',()=>a.pass);
  check('cr11b-regression-pass',()=>b.pass);
  check('cr11c-regression-pass',()=>c.pass);
  check('cr10b-regression-pass',()=>cr10b.pass);
  check('cr10c-regression-pass',()=>cr10c.pass);

  check('road-path-neutral-cost-order-is-frozen',()=>{
    const road=RoadPreferenceCostPolicy.resolve('ROAD').traversalCost;
    const path=RoadPreferenceCostPolicy.resolve('PATH').traversalCost;
    const neutral=RoadPreferenceCostPolicy.resolve('NEUTRAL').traversalCost;
    return road<path && path<neutral;
  });

  const world=new WorldStore();
  const map=new MapStructure(world,{name:'CR-11 Freeze Gate',width:5,height:3,cellSize:1});
  const source=new TraversalClassificationSource({map});
  const start={x:0,y:1}, target={x:4,y:1};

  check('neutral-map-preserves-direct-routing',()=>{
    const route=RoadPreferredRoutingIntegration.find({map,startPosition:start,targetPosition:target,classificationSource:source});
    return route.waypoints.every(p=>p.y===1);
  });

  source.classify({x:0,y:0},'ROAD');
  source.classify({x:1,y:0},'ROAD');
  source.classify({x:2,y:0},'ROAD');
  source.classify({x:3,y:0},'ROAD');
  source.classify({x:4,y:0},'ROAD');
  source.classify({x:2,y:2},'PATH');

  check('classification-is-cell-local',()=>source.typeAt({x:2,y:0})==='ROAD'&&source.typeAt({x:2,y:2})==='PATH'&&source.typeAt({x:2,y:1})==='NEUTRAL');
  check('classification-is-deterministic',()=>source.typeAt({x:2,y:0})===source.typeAt({x:2,y:0}));

  check('lower-total-cost-route-wins-deterministically',()=>{
    const first=RoadPreferredRoutingIntegration.find({map,startPosition:start,targetPosition:target,classificationSource:source});
    const second=RoadPreferredRoutingIntegration.find({map,startPosition:start,targetPosition:target,classificationSource:source});
    return first.waypoints.some(p=>p.y===0) && JSON.stringify(first)===JSON.stringify(second);
  });

  check('cr11-scope-has-no-obstacle-blocked-cell-or-dynamic-reroute-policy',()=>{
    const sample=[RoadPreferredRoutingIntegration.find.toString(),TraversalClassificationSource.toString()].join(' ').toLowerCase();
    return !sample.includes('obstacle')&&!sample.includes('blockedcell')&&!sample.includes('dynamicreroute')&&!sample.includes('recalculateonmove');
  });

  const blockerCount=results.filter(r=>!r.pass).length;
  return Object.freeze({pass:blockerCount===0,blockerCount,results:Object.freeze(results.map(Object.freeze))});
}
