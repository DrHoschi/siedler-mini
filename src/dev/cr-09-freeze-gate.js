import { runCr09aSelfTest } from './cr-09a-self-test.js';
import { runCr09bSelfTest } from './cr-09b-self-test.js';
import { runCr09cSelfTest } from './cr-09c-self-test.js';
import { DeterministicGridPathfinder } from '../transport/deterministic-grid-pathfinder.js';
import { RouteMovementIntegration } from '../transport/route-movement-integration.js';

export function runCr09FreezeGate() {
  const results=[];
  const check=(name,fn)=>{try{results.push({name,pass:!!fn()});}catch(error){results.push({name,pass:false,error:String(error?.message||error)});}};

  const a=runCr09aSelfTest(), b=runCr09bSelfTest(), c=runCr09cSelfTest();
  check('cr09a-regression-pass',()=>a.pass);
  check('cr09b-regression-pass',()=>b.pass);
  check('cr09c-regression-pass',()=>c.pass);

  const map=Object.freeze({contains:(x,y)=>Number.isSafeInteger(x)&&Number.isSafeInteger(y)&&x>=0&&y>=0&&x<8&&y<8});
  const startPosition=Object.freeze({x:0,y:0});
  const targetPosition=Object.freeze({x:3,y:2});
  const movement=Object.freeze({unitId:'unit:00000001',state:'IDLE',currentPosition:startPosition,targetPosition:null});

  check('full-chain-produces-routecontract-then-reaches-target',()=>{const route=DeterministicGridPathfinder.find({map,startPosition,targetPosition});const final=RouteMovementIntegration.advance({route,movement,maxDistance:99});return route.kind==='route'&&route.state==='DEFINED'&&final.state==='IDLE'&&final.targetPosition===null&&final.currentPosition.x===3&&final.currentPosition.y===2;});
  check('full-chain-is-deterministic',()=>{const r1=DeterministicGridPathfinder.find({map,startPosition,targetPosition});const r2=DeterministicGridPathfinder.find({map,startPosition,targetPosition});const m1=RouteMovementIntegration.advance({route:r1,movement,maxDistance:2.5});const m2=RouteMovementIntegration.advance({route:r2,movement,maxDistance:2.5});return JSON.stringify({r:r1,m:m1})===JSON.stringify({r:r2,m:m2});});
  check('pathfinder-waypoint-order-is-preserved-by-movement',()=>{const route=DeterministicGridPathfinder.find({map,startPosition,targetPosition});const first=RouteMovementIntegration.bind({route,movement});const afterOne=RouteMovementIntegration.advance({route,movement,maxDistance:1});const second=RouteMovementIntegration.bind({route:{...route,state:'ACTIVE'},movement:afterOne});return first.targetPosition.x===1&&first.targetPosition.y===0&&afterOne.currentPosition.x===1&&afterOne.currentPosition.y===0&&second.targetPosition.x===2&&second.targetPosition.y===0;});
  check('partial-movement-does-not-skip-route-order',()=>{const route=DeterministicGridPathfinder.find({map,startPosition,targetPosition});const partial=RouteMovementIntegration.advance({route,movement,maxDistance:3.5});return partial.state==='MOVING'&&partial.currentPosition.x===3&&partial.currentPosition.y===0.5&&partial.targetPosition.x===3&&partial.targetPosition.y===1;});
  check('route-and-inputs-remain-immutable',()=>{const route=DeterministicGridPathfinder.find({map,startPosition,targetPosition});const before=JSON.stringify({route,movement,startPosition,targetPosition});RouteMovementIntegration.advance({route,movement,maxDistance:2});return Object.isFrozen(route)&&Object.isFrozen(route.waypoints)&&JSON.stringify({route,movement,startPosition,targetPosition})===before;});
  check('freeze-scope-adds-no-road-cost-obstacle-policy',()=>{const route=DeterministicGridPathfinder.find({map,startPosition,targetPosition});const final=RouteMovementIntegration.advance({route,movement,maxDistance:99});const serialized=JSON.stringify({route,final}).toLowerCase();return !serialized.includes('road')&&!serialized.includes('cost')&&!serialized.includes('obstacle')&&!serialized.includes('terrain')&&!serialized.includes('avoidance');});

  const blockerCount=results.filter(r=>!r.pass).length;
  return Object.freeze({pass:blockerCount===0,blockerCount,results:Object.freeze(results.map(Object.freeze))});
}
