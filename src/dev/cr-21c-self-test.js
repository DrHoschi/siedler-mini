import { NextCellReservationIntentContract } from '../transport/next-cell-reservation-intent-contract.js';
import { DeterministicReservationExecutionCycle } from '../transport/deterministic-reservation-execution-cycle.js';
import { CarrierMovementContract } from '../transport/carrier-movement-contract.js';
import { BlockedCellSource } from '../transport/blocked-cell-source.js';
import { ReservationLifecycleTrafficIntegration } from '../transport/reservation-lifecycle-traffic-integration.js';
import { ReservationControlledStepMovementIntegration } from '../transport/reservation-controlled-step-movement-integration.js';

function route(){return {startPosition:{x:0,y:0},targetPosition:{x:2,y:0},waypoints:[{x:1,y:0}],state:'ACTIVE'};}
function intent(carrierId){return NextCellReservationIntentContract.define({carrierId,route:route(),currentPosition:{x:0,y:0},nextCell:{x:1,y:0}});}
function cycle(){return DeterministicReservationExecutionCycle.run({intents:[intent('unit:00000002'),intent('unit:00000001')],validFromStep:10,validUntilStep:11});}
function movement(unitId='unit:00000001'){return CarrierMovementContract.define({unitId,currentPosition:{x:0,y:0},state:'IDLE',targetPosition:null});}
function traffic(){
 const map={contains:(x,y)=>Number.isSafeInteger(x)&&Number.isSafeInteger(y)&&x>=0&&x<4&&y>=0&&y<4,cellIdAt:(x,y)=>`cell:${x},${y}`};
 const blocked=new BlockedCellSource({map});
 return {blocked,integration:new ReservationLifecycleTrafficIntegration({blockedCellSource:blocked})};
}

export function runCr21cSelfTest(){
 const results=[];
 const check=(name,fn)=>{try{results.push({name,pass:!!fn()});}catch(error){results.push({name,pass:false,error:String(error?.message||error)});}};
 const rejects=fn=>{try{fn();return false;}catch{return true;}};

 check('granted-winner-enters-exactly-reserved-next-route-cell',()=>{const t=traffic();const result=ReservationControlledStepMovementIntegration.execute({cycle:cycle(),route:route(),movement:movement(),trafficIntegration:t.integration});return result.status==='COMPLETED'&&result.carrierId==='unit:00000001'&&result.enteredCell.x===1&&result.enteredCell.y===0&&result.movement.state==='IDLE'&&result.movement.currentPosition.x===1&&result.movement.currentPosition.y===0&&result.movement.targetPosition===null;});
 check('successful-entry-consumes-reservation',()=>{const t=traffic();const result=ReservationControlledStepMovementIntegration.execute({cycle:cycle(),route:route(),movement:movement(),trafficIntegration:t.integration});return result.lifecycleState.status==='CONSUMED'&&result.lifecycleState.carrierId==='unit:00000001';});
 check('consumed-reservation-loses-own-blocking-effect',()=>{const t=traffic();const result=ReservationControlledStepMovementIntegration.execute({cycle:cycle(),route:route(),movement:movement(),trafficIntegration:t.integration});return result.blocking.blocks===false&&result.blocking.available===true&&t.blocked.stateAt({x:1,y:0})==='TRAVERSABLE';});
 check('waiting-nonwinner-cannot-move',()=>{const t=traffic();return rejects(()=>ReservationControlledStepMovementIntegration.execute({cycle:cycle(),route:route(),movement:movement('unit:00000002'),trafficIntegration:t.integration}))&&t.blocked.stateAt({x:1,y:0})==='TRAVERSABLE';});
 check('wrong-immediate-route-cell-is-rejected-before-entry',()=>{const t=traffic();const wrongRoute={startPosition:{x:0,y:0},targetPosition:{x:2,y:1},waypoints:[{x:0,y:1}],state:'ACTIVE'};return rejects(()=>ReservationControlledStepMovementIntegration.execute({cycle:cycle(),route:wrongRoute,movement:movement(),trafficIntegration:t.integration}))&&t.blocked.stateAt({x:1,y:0})==='TRAVERSABLE';});
 check('same-step-does-not-chain-to-following-route-target',()=>{const t=traffic();const result=ReservationControlledStepMovementIntegration.execute({cycle:cycle(),route:route(),movement:movement(),trafficIntegration:t.integration});return result.movement.currentPosition.x===1&&result.movement.currentPosition.y===0&&result.movement.currentPosition.x!==2&&result.readyForNextIntent===true;});
 check('cr21c-does-not-add-arbitration-pathfinding-rerouting-or-lookahead',()=>{const text=ReservationControlledStepMovementIntegration.toString().toLowerCase();return !text.includes('deterministicreservationarbitration')&&!text.includes('pathfind')&&!text.includes('rerout')&&!text.includes('lookahead')&&!text.includes('nextcycle');});

 const blockerCount=results.filter(r=>!r.pass).length;
 return Object.freeze({pass:blockerCount===0,blockerCount,results:Object.freeze(results.map(Object.freeze))});
}
