import { CarrierMovementContract } from './carrier-movement-contract.js';

function point(value,name){const x=Number(value?.x),y=Number(value?.y);if(!Number.isSafeInteger(x)||!Number.isSafeInteger(y))throw new TypeError(`${name}.x and ${name}.y must be safe integers`);return Object.freeze({x,y});}
function same(a,b){return a.x===b.x&&a.y===b.y;}
function asStep(value){const n=Number(value);if(!Number.isSafeInteger(n)||n<0)throw new TypeError('currentStep must be a non-negative safe integer');return n;}
function assertDecision(decision){if(!decision||decision.kind!=='reservation-arbitration-decision'||decision.status!=='WINNER_SELECTED'||!decision.winnerReservation)throw new TypeError('arbitrationDecision must be a CR-19B WINNER_SELECTED decision');}

export class ReservationMovementIntegration{
 static begin({arbitrationDecision,currentPosition,currentStep}={}){
  assertDecision(arbitrationDecision);
  const reservation=arbitrationDecision.winnerReservation;
  const step=asStep(currentStep);
  if(step<reservation.validFromStep||step>reservation.validUntilStep)throw new Error('reservation is not valid for currentStep');
  if(arbitrationDecision.winnerCarrierId!==reservation.carrierId)throw new Error('winner carrier must match winner reservation');
  const current=point(currentPosition,'currentPosition');
  const target=point(reservation.cell,'reservation.cell');
  if(Math.abs(current.x-target.x)+Math.abs(current.y-target.y)!==1)throw new Error('reserved cell must be exactly one cardinal movement step away');
  const movement=CarrierMovementContract.define({unitId:reservation.carrierId,currentPosition:current,state:'MOVING',targetPosition:target});
  return Object.freeze({kind:'reserved-cell-entry',status:'ENTRY_AUTHORIZED',carrierId:reservation.carrierId,reservation,targetCell:target,currentStep:step,movement});
 }

 static complete({entry,reachedCell,currentStep}={}){
  if(!entry||entry.kind!=='reserved-cell-entry'||entry.status!=='ENTRY_AUTHORIZED')throw new TypeError('entry must be an authorized CR-19C reserved-cell entry');
  const step=asStep(currentStep);
  const reached=point(reachedCell,'reachedCell');
  if(!same(reached,entry.targetCell))throw new Error('reserved-cell entry can complete only at reserved target cell');
  if(step<entry.reservation.validFromStep||step>entry.reservation.validUntilStep)throw new Error('reservation expired before entry completion');
  const movement=CarrierMovementContract.define({unitId:entry.carrierId,currentPosition:reached,state:'IDLE'});
  return Object.freeze({kind:'reserved-cell-entry-result',status:'ENTRY_COMPLETED',carrierId:entry.carrierId,currentCell:reached,releaseReservation:true,movement});
 }
}
