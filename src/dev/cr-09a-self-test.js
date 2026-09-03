import { RouteContract } from '../transport/route-contract.js';

export function runCr09aSelfTest() {
  const results=[];
  const check=(name,fn)=>{try{results.push({name,pass:!!fn()});}catch(error){results.push({name,pass:false,error:String(error?.message||error)});}};
  const rejects=fn=>{try{fn();return false;}catch{return true;}};

  const fixture={
    startPosition:{x:2,y:3},
    targetPosition:{x:8,y:7},
    waypoints:[{x:3,y:3},{x:3,y:6},{x:7,y:6}],
    state:'DEFINED'
  };

  check('route-contract-is-deep-frozen',()=>{const r=RouteContract.define(fixture);return Object.isFrozen(r)&&Object.isFrozen(r.startPosition)&&Object.isFrozen(r.targetPosition)&&Object.isFrozen(r.waypoints)&&r.waypoints.every(Object.isFrozen);});
  check('route-preserves-start-target-and-waypoint-order',()=>{const r=RouteContract.define(fixture);return r.kind==='route'&&r.startPosition.x===2&&r.startPosition.y===3&&r.targetPosition.x===8&&r.targetPosition.y===7&&r.waypoints.map(p=>`${p.x},${p.y}`).join('|')==='3,3|3,6|7,6';});
  check('route-allows-zero-intermediate-waypoints',()=>{const r=RouteContract.define({...fixture,waypoints:[]});return r.waypoints.length===0&&r.startPosition.x===2&&r.targetPosition.x===8;});
  check('route-requires-distinct-start-and-target',()=>rejects(()=>RouteContract.define({...fixture,targetPosition:{x:2,y:3}})));
  check('route-requires-finite-position-data',()=>rejects(()=>RouteContract.define({...fixture,startPosition:{x:Infinity,y:3}}))&&rejects(()=>RouteContract.define({...fixture,targetPosition:{x:8,y:NaN}}))&&rejects(()=>RouteContract.define({...fixture,waypoints:[{x:3,y:3},{x:'nope',y:6}]})));
  check('route-waypoints-must-be-an-ordered-array',()=>rejects(()=>RouteContract.define({...fixture,waypoints:null}))&&rejects(()=>RouteContract.define({...fixture,waypoints:{x:3,y:3}})));
  check('route-state-is-limited-to-defined-active-completed',()=>RouteContract.states.join('|')==='DEFINED|ACTIVE|COMPLETED'&&RouteContract.define({...fixture,state:'active'}).state==='ACTIVE'&&rejects(()=>RouteContract.define({...fixture,state:'BLOCKED'})));
  check('route-contract-does-not-mutate-input',()=>{const before=JSON.stringify(fixture);RouteContract.define(fixture);return JSON.stringify(fixture)===before;});
  check('cr09a-adds-no-pathfinding-or-movement-policy',()=>{const r=RouteContract.define(fixture);const serialized=JSON.stringify(r).toLowerCase();return !serialized.includes('grid')&&!serialized.includes('cost')&&!serialized.includes('road')&&!serialized.includes('obstacle')&&!serialized.includes('speed')&&!serialized.includes('velocity')&&!serialized.includes('carrier')&&!serialized.includes('jobid')&&!serialized.includes('algorithm');});

  return Object.freeze({pass:results.every(r=>r.pass),results:Object.freeze(results.map(Object.freeze))});
}
