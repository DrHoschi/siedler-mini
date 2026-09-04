import { runCr13aSelfTest } from './cr-13a-self-test.js';
import { runCr13bSelfTest } from './cr-13b-self-test.js';
import { runCr13cSelfTest } from './cr-13c-self-test.js';
import { runCr12FreezeGate } from './cr-12-freeze-gate.js';
import { WorldStore } from '../world/world-store.js';
import { MapStructure } from '../world/map-structure.js';
import { RouteContract } from '../transport/route-contract.js';
import { TraversalClassificationSource } from '../transport/traversal-classification-source.js';
import { BlockedCellSource } from '../transport/blocked-cell-source.js';
import { ControlledRerouteIntegration } from '../transport/controlled-reroute-integration.js';

export function runCr13FreezeGate() {
  const results=[];
  const check=(name,fn)=>{try{results.push({name,pass:!!fn()});}catch(error){results.push({name,pass:false,error:String(error?.message||error)});}};

  const cr12=runCr12FreezeGate();
  const a=runCr13aSelfTest();
  const b=runCr13bSelfTest();
  const c=runCr13cSelfTest();
  check('cr12-freeze-regression-pass',()=>cr12.pass&&cr12.blockerCount===0);
  check('cr13a-regression-pass',()=>a.pass&&a.blockerCount===0);
  check('cr13b-regression-pass',()=>b.pass&&b.blockerCount===0);
  check('cr13c-regression-pass',()=>c.pass&&c.blockerCount===0);

  const world=new WorldStore();
  const map=new MapStructure(world,{name:'CR-13 Freeze Gate',width:5,height:3,cellSize:1});
  const classificationSource=new TraversalClassificationSource({map});
  const blockedCellSource=new BlockedCellSource({map});
  const original=RouteContract.define({
    startPosition:{x:0,y:1},
    targetPosition:{x:4,y:1},
    waypoints:[{x:1,y:1},{x:2,y:1},{x:3,y:1}],
    state:'ACTIVE'
  });
  const currentPosition={x:1,y:1};

  check('valid-route-remains-identical-and-is-not-rerouted',()=>{
    const result=ControlledRerouteIntegration.resolve({route:original,currentPosition,completedWaypointCount:1,map,classificationSource,blockedCellSource});
    return result.validity.state==='VALID'&&result.rerouted===false&&result.route===original;
  });

  for(let x=0;x<=4;x+=1) classificationSource.classify({x,y:0},'ROAD');
  blockedCellSource.block({x:2,y:1});

  check('invalid-route-reroutes-from-current-carrier-position',()=>{
    const result=ControlledRerouteIntegration.resolve({route:original,currentPosition,completedWaypointCount:1,map,classificationSource,blockedCellSource});
    return result.validity.state==='INVALID'
      && result.rerouted===true
      && result.route.startPosition.x===currentPosition.x
      && result.route.startPosition.y===currentPosition.y;
  });

  check('reroute-preserves-original-target',()=>{
    const result=ControlledRerouteIntegration.resolve({route:original,currentPosition,completedWaypointCount:1,map,classificationSource,blockedCellSource});
    return result.route.targetPosition.x===original.targetPosition.x
      && result.route.targetPosition.y===original.targetPosition.y;
  });

  check('reroute-never-enters-blocked-cell',()=>{
    const result=ControlledRerouteIntegration.resolve({route:original,currentPosition,completedWaypointCount:1,map,classificationSource,blockedCellSource});
    return result.route.waypoints.every(position=>blockedCellSource.isTraversable(position))
      && blockedCellSource.isTraversable(result.route.targetPosition);
  });

  check('road-preference-remains-active-during-reroute',()=>{
    const result=ControlledRerouteIntegration.resolve({route:original,currentPosition,completedWaypointCount:1,map,classificationSource,blockedCellSource});
    return result.rerouted===true && result.route.waypoints.some(position=>position.y===0);
  });

  check('identical-invalid-state-produces-identical-replacement',()=>{
    const one=ControlledRerouteIntegration.resolve({route:original,currentPosition,completedWaypointCount:1,map,classificationSource,blockedCellSource});
    const two=ControlledRerouteIntegration.resolve({route:original,currentPosition,completedWaypointCount:1,map,classificationSource,blockedCellSource});
    return JSON.stringify(one.route)===JSON.stringify(two.route);
  });

  check('cr13-scope-has-no-per-tick-replanning-traffic-or-reservation-policy',()=>{
    const text=ControlledRerouteIntegration.toString().toLowerCase();
    return !text.includes('tick')
      && !text.includes('traffic')
      && !text.includes('congestion')
      && !text.includes('reservation')
      && !text.includes('carrier-to-carrier')
      && !text.includes('newtarget')
      && !text.includes('targetchange');
  });

  const blockerCount=results.filter(result=>!result.pass).length;
  return Object.freeze({pass:blockerCount===0,blockerCount,results:Object.freeze(results.map(Object.freeze))});
}
