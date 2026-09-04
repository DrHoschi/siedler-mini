import { WorldStore } from '../world/world-store.js';
import { MapStructure } from '../world/map-structure.js';
import { RouteContract } from '../transport/route-contract.js';
import { TraversalClassificationSource } from '../transport/traversal-classification-source.js';
import { BlockedCellSource } from '../transport/blocked-cell-source.js';
import { ControlledRerouteIntegration } from '../transport/controlled-reroute-integration.js';

export function runCr13cSelfTest() {
  const results=[];
  const check=(name,fn)=>{try{results.push({name,pass:!!fn()});}catch(error){results.push({name,pass:false,error:String(error?.message||error)});}};

  const world=new WorldStore();
  const map=new MapStructure(world,{name:'CR-13C',width:5,height:3,cellSize:1});
  const classificationSource=new TraversalClassificationSource({map});
  const blockedCellSource=new BlockedCellSource({map});
  const original=RouteContract.define({
    startPosition:{x:0,y:1},
    targetPosition:{x:4,y:1},
    waypoints:[{x:1,y:1},{x:2,y:1},{x:3,y:1}],
    state:'ACTIVE'
  });

  check('valid-route-is-not-rerouted',()=>{
    const result=ControlledRerouteIntegration.resolve({route:original,currentPosition:{x:1,y:1},completedWaypointCount:1,map,classificationSource,blockedCellSource});
    return result.rerouted===false && result.validity.state==='VALID' && result.route===original;
  });

  blockedCellSource.block({x:2,y:1});

  check('invalid-route-is-rerouted-from-current-position',()=>{
    const result=ControlledRerouteIntegration.resolve({route:original,currentPosition:{x:1,y:1},completedWaypointCount:1,map,classificationSource,blockedCellSource});
    return result.rerouted===true
      && result.validity.state==='INVALID'
      && result.route.startPosition.x===1
      && result.route.startPosition.y===1;
  });

  check('reroute-keeps-original-target',()=>{
    const result=ControlledRerouteIntegration.resolve({route:original,currentPosition:{x:1,y:1},completedWaypointCount:1,map,classificationSource,blockedCellSource});
    return result.route.targetPosition.x===original.targetPosition.x
      && result.route.targetPosition.y===original.targetPosition.y;
  });

  check('replacement-never-uses-blocked-cell',()=>{
    const result=ControlledRerouteIntegration.resolve({route:original,currentPosition:{x:1,y:1},completedWaypointCount:1,map,classificationSource,blockedCellSource});
    return result.route.waypoints.every(position=>blockedCellSource.isTraversable(position));
  });

  check('reroute-is-deterministic',()=>{
    const a=ControlledRerouteIntegration.resolve({route:original,currentPosition:{x:1,y:1},completedWaypointCount:1,map,classificationSource,blockedCellSource});
    const b=ControlledRerouteIntegration.resolve({route:original,currentPosition:{x:1,y:1},completedWaypointCount:1,map,classificationSource,blockedCellSource});
    return JSON.stringify(a.route)===JSON.stringify(b.route);
  });

  blockedCellSource.clear({x:2,y:1});
  blockedCellSource.block({x:0,y:1});

  check('completed-blocked-history-does-not-trigger-reroute',()=>{
    const result=ControlledRerouteIntegration.resolve({route:original,currentPosition:{x:1,y:1},completedWaypointCount:1,map,classificationSource,blockedCellSource});
    return result.rerouted===false && result.validity.state==='VALID' && result.route===original;
  });

  check('integration-has-no-tick-traffic-reservation-or-target-change-policy',()=>{
    const text=ControlledRerouteIntegration.toString().toLowerCase();
    return !text.includes('tick')&&!text.includes('traffic')&&!text.includes('reservation')&&!text.includes('carrier-to-carrier')&&!text.includes('newtarget');
  });

  const blockerCount=results.filter(r=>!r.pass).length;
  return Object.freeze({pass:blockerCount===0,blockerCount,results:Object.freeze(results.map(Object.freeze))});
}
