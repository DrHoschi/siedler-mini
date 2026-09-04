import { CarrierMovementContract } from './carrier-movement-contract.js';
import { DirectTargetMovementExecution } from './direct-target-movement-execution.js';
import { ReservationLifecycleStateContract } from './reservation-lifecycle-state-contract.js';
import { RouteMovementIntegration } from './route-movement-integration.js';

function sameCell(a,b){return a?.x===b?.x&&a?.y===b?.y;}

function assertCycle(value){
 if(!value||value.kind!=='reservation-execution-cycle'||value.status!=='RESOLVED') throw new TypeError('cycle must be a resolved CR-21B reservation execution cycle');
 if(!value.decision?.winnerCarrierId||!Array.isArray(value.outcomes)) throw new TypeError('cycle requires decision and outcomes');
 return value;
}

function assertTrafficIntegration(value){
 if(!value||typeof value.apply!=='function'||typeof value.isAvailable!=='function') throw new TypeError('CR-20 ReservationLifecycleTrafficIntegration-compatible instance required');
 return value;
}

export class ReservationControlledStepMovementIntegration {
 static execute({cycle,route,movement,trafficIntegration}={}){
  const resolved=assertCycle(cycle);
  const traffic=assertTrafficIntegration(trafficIntegration);
  const current=CarrierMovementContract.define(movement);
  const winnerId=resolved.decision.winnerCarrierId;
  const winner=resolved.outcomes.find(outcome=>outcome.carrierId===winnerId);
  if(!winner||winner.status!=='GRANTED'||winner.lifecycleState?.status!=='GRANTED') throw new Error('CR-21C requires the CR-21B GRANTED winner outcome');
  if(current.unitId!==winnerId) throw new Error('movement carrier must match CR-21B winnerCarrierId');

  const granted=winner.lifecycleState;
  if(!sameCell(granted.cell,resolved.cell)) throw new Error('granted reservation cell must match CR-21B cycle cell');

  const bound=RouteMovementIntegration.bind({route,movement:current});
  if(bound.state!=='MOVING'||!sameCell(bound.targetPosition,granted.cell)) throw new Error('granted reservation must target the immediate next route cell');

  const activeBlocking=traffic.apply(granted);
  if(activeBlocking.blocks!==true) throw new Error('GRANTED reservation must retain blocking effect before entry');

  const distance=Math.hypot(granted.cell.x-current.currentPosition.x,granted.cell.y-current.currentPosition.y);
  if(!(distance>0)) throw new Error('winner must be outside granted cell before entry');
  const arrived=DirectTargetMovementExecution.advance(bound,distance);
  if(arrived.state!=='IDLE'||arrived.targetPosition!==null||!sameCell(arrived.currentPosition,granted.cell)) throw new Error('single-step movement must end exactly at granted cell');

  const consumed=ReservationLifecycleStateContract.transition(granted,'CONSUMED');
  const releasedBlocking=traffic.apply(consumed);

  return Object.freeze({
   kind:'reservation-controlled-step-movement',
   status:'COMPLETED',
   carrierId:winnerId,
   enteredCell:granted.cell,
   movement:arrived,
   lifecycleState:consumed,
   blocking:releasedBlocking,
   readyForNextIntent:true
  });
 }
}
