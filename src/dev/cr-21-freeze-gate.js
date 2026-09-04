import { runCr21aSelfTest } from './cr-21a-self-test.js';
import { runCr21bSelfTest } from './cr-21b-self-test.js';
import { runCr21cSelfTest } from './cr-21c-self-test.js';
import { runCr20FreezeGate } from './cr-20-freeze-gate.js';
import { NextCellReservationIntentContract } from '../transport/next-cell-reservation-intent-contract.js';
import { DeterministicReservationExecutionCycle } from '../transport/deterministic-reservation-execution-cycle.js';
import { CarrierMovementContract } from '../transport/carrier-movement-contract.js';
import { BlockedCellSource } from '../transport/blocked-cell-source.js';
import { ReservationLifecycleTrafficIntegration } from '../transport/reservation-lifecycle-traffic-integration.js';
import { ReservationControlledStepMovementIntegration } from '../transport/reservation-controlled-step-movement-integration.js';

function route(){return {startPosition:{x:0,y:0},targetPosition:{x:2,y:0},waypoints:[{x:1,y:0}],state:'ACTIVE'};}
function intent(carrierId,currentPosition={x:0,y:0},nextCell={x:1,y:0}){return NextCellReservationIntentContract.define({carrierId,route:route(),currentPosition,nextCell});}
function traffic(){const map={contains:(x,y)=>Number.isSafeInteger(x)&&Number.isSafeInteger(y)&&x>=0&&x<4&&y>=0&&y<4,cellIdAt:(x,y)=>`cell:${x},${y}`};const blocked=new BlockedCellSource({map});return {blocked,integration:new ReservationLifecycleTrafficIntegration({blockedCellSource:blocked})};}

export function runCr21FreezeGate(){
 const results=[];
 const check=(name,fn)=>{try{results.push({name,pass:!!fn()});}catch(error){results.push({name,pass:false,error:String(error?.message||error)});}};
 const a=runCr21aSelfTest(),b=runCr21bSelfTest(),c=runCr21cSelfTest(),cr20=runCr20FreezeGate();
 check('cr21a-regression',()=>a.pass&&a.blockerCount===0);
 check('cr21b-regression',()=>b.pass&&b.blockerCount===0);
 check('cr21c-regression',()=>c.pass&&c.blockerCount===0);
 check('cr20-frozen-baseline-regression',()=>cr20.pass&&cr20.blockerCount===0);
 check('closed-route-intent-reservation-arbitration-movement-consumption-release-chain',()=>{
  const intents=[intent('unit:00000002'),intent('unit:00000001')];
  const cycle=DeterministicReservationExecutionCycle.run({intents,validFromStep:10,validUntilStep:11});
  const granted=cycle.outcomes.filter(o=>o.status==='GRANTED');
  const waiting=cycle.outcomes.filter(o=>o.status==='WAITING');
  if(cycle.decision.winnerCarrierId!=='unit:00000001'||granted.length!==1||waiting.length!==1)return false;
  const t=traffic();
  const movement=CarrierMovementContract.define({unitId:'unit:00000001',currentPosition:{x:0,y:0},state:'IDLE',targetPosition:null});
  const step=ReservationControlledStepMovementIntegration.execute({cycle,route:route(),movement,trafficIntegration:t.integration});
  if(step.status!=='COMPLETED'||step.lifecycleState.status!=='CONSUMED'||step.movement.currentPosition.x!==1||step.movement.currentPosition.y!==0||t.blocked.stateAt({x:1,y:0})!=='TRAVERSABLE')return false;
  const next=NextCellReservationIntentContract.define({carrierId:step.carrierId,route:route(),currentPosition:step.movement.currentPosition,nextCell:{x:2,y:0}});
  return step.readyForNextIntent===true&&next.status==='DECLARED'&&next.nextCell.x===2&&next.nextCell.y===0;
 });
 check('waiting-loser-remains-unmoved-and-requested',()=>{const cycle=DeterministicReservationExecutionCycle.run({intents:[intent('unit:00000002'),intent('unit:00000001')],validFromStep:10,validUntilStep:11});const loser=cycle.outcomes.find(o=>o.carrierId==='unit:00000002');return loser.status==='WAITING'&&loser.lifecycleState.status==='REQUESTED';});
 check('same-inputs-remain-deterministic',()=>{const args={intents:[intent('unit:00000002'),intent('unit:00000001')],validFromStep:10,validUntilStep:11};return JSON.stringify(DeterministicReservationExecutionCycle.run(args))===JSON.stringify(DeterministicReservationExecutionCycle.run(args));});
 check('overall-freeze-adds-no-automatic-second-cycle-lookahead-pathfinding-rerouting-or-new-arbitration',()=>{const text=(ReservationControlledStepMovementIntegration.toString()+DeterministicReservationExecutionCycle.toString()).toLowerCase();return !text.includes('nextcycle')&&!text.includes('lookahead')&&!text.includes('pathfind')&&!text.includes('rerout')&&!text.includes('new deterministicreservationarbitration');});
 const blockerCount=results.filter(r=>!r.pass).length;
 return Object.freeze({pass:blockerCount===0,blockerCount,results:Object.freeze(results.map(Object.freeze))});
}
