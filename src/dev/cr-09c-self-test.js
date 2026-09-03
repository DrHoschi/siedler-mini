import { RouteMovementIntegration } from '../transport/route-movement-integration.js';

export function runCr09cSelfTest() {
  const results=[];
  const check=(name,fn)=>{try{results.push({name,pass:!!fn()});}catch(error){results.push({name,pass:false,error:String(error?.message||error)});}};
  const rejects=fn=>{try{fn();return false;}catch{return true;}};
  const route={startPosition:{x:0,y:0},targetPosition:{x:2,y:2},waypoints:[{x:1,y:0},{x:2,y:0},{x:2,y:1}],state:'DEFINED'};
  const start={unitId:'unit:00000001',currentPosition:{x:0,y:0},state:'IDLE',targetPosition:null};

  check('bind-targets-first-waypoint-not-final-target',()=>{const m=RouteMovementIntegration.bind({route,movement:start});return m.state==='MOVING'&&m.targetPosition.x===1&&m.targetPosition.y===0;});
  check('advance-follows-waypoints-in-order',()=>{const m=RouteMovementIntegration.advance({route,movement:start,maxDistance:1.5});return m.state==='MOVING'&&m.currentPosition.x===1.5&&m.currentPosition.y===0&&m.targetPosition.x===2&&m.targetPosition.y===0;});
  check('exact-waypoint-arrival-continues-to-next-target-on-next-bind',()=>{const m=RouteMovementIntegration.advance({route,movement:start,maxDistance:1});const next=RouteMovementIntegration.bind({route:{...route,state:'ACTIVE'},movement:m});return m.currentPosition.x===1&&m.currentPosition.y===0&&next.targetPosition.x===2&&next.targetPosition.y===0;});
  check('large-step-may-cross-multiple-waypoints-without-skipping-order',()=>{const m=RouteMovementIntegration.advance({route,movement:start,maxDistance:3.5});return m.state==='MOVING'&&m.currentPosition.x===2&&m.currentPosition.y===1.5&&m.targetPosition.x===2&&m.targetPosition.y===2;});
  check('route-completion-snaps-to-final-target-and-idles',()=>{const m=RouteMovementIntegration.advance({route,movement:start,maxDistance:99});return m.state==='IDLE'&&m.targetPosition===null&&m.currentPosition.x===2&&m.currentPosition.y===2;});
  check('adjacent-route-with-no-waypoints-moves-to-final-target',()=>{const direct={startPosition:{x:0,y:0},targetPosition:{x:1,y:0},waypoints:[],state:'DEFINED'};const m=RouteMovementIntegration.advance({route:direct,movement:start,maxDistance:1});return m.state==='IDLE'&&m.currentPosition.x===1&&m.currentPosition.y===0;});
  check('defined-route-requires-carrier-at-route-start',()=>rejects(()=>RouteMovementIntegration.bind({route,movement:{...start,currentPosition:{x:1,y:1}}})));
  check('active-route-can-resume-from-reached-route-point',()=>{const active={...route,state:'ACTIVE'};const m=RouteMovementIntegration.bind({route:active,movement:{...start,currentPosition:{x:2,y:0}}});return m.targetPosition.x===2&&m.targetPosition.y===1;});
  check('arrival-gate-rejects-before-final-target',()=>rejects(()=>RouteMovementIntegration.assertArrived({route:{...route,state:'ACTIVE'},movement:start})));
  check('arrival-gate-accepts-idle-at-final-target',()=>RouteMovementIntegration.assertArrived({route:{...route,state:'COMPLETED'},movement:{...start,currentPosition:{x:2,y:2}}}).kind==='route-arrival-gate');
  check('cr09c-does-not-mutate-route-or-movement-input',()=>{const before=JSON.stringify({route,start});RouteMovementIntegration.advance({route,movement:start,maxDistance:2});return JSON.stringify({route,start})===before;});
  check('cr09c-adds-no-search-road-cost-obstacle-or-transport-policy',()=>{const m=RouteMovementIntegration.advance({route,movement:start,maxDistance:2});const s=JSON.stringify(m).toLowerCase();return !s.includes('pathfinder')&&!s.includes('road')&&!s.includes('cost')&&!s.includes('obstacle')&&!s.includes('jobid')&&!s.includes('claim')&&!s.includes('demand')&&!s.includes('assignment');});

  return Object.freeze({pass:results.every(r=>r.pass),results:Object.freeze(results.map(Object.freeze))});
}
