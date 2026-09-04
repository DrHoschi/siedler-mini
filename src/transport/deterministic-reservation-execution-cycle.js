import { CellReservationContract } from './cell-reservation-contract.js';
import { DeterministicReservationArbitration } from './deterministic-reservation-arbitration.js';
import { ReservationLifecycleStateContract } from './reservation-lifecycle-state-contract.js';

function asStep(value,name){const n=Number(value);if(!Number.isSafeInteger(n)||n<0)throw new TypeError(`${name} must be a non-negative safe integer`);return n;}
function sameCell(a,b){return a.x===b.x&&a.y===b.y;}
function asIntent(value){if(!value||value.kind!=='next-cell-reservation-intent'||value.status!=='DECLARED')throw new TypeError('intents must be CR-21A DECLARED next-cell reservation intents');return value;}

export class DeterministicReservationExecutionCycle {
 static run({intents,validFromStep,validUntilStep}={}){
  if(!Array.isArray(intents)||intents.length===0)throw new TypeError('intents must be a non-empty array');
  const declared=intents.map(asIntent);
  const from=asStep(validFromStep,'validFromStep');
  const until=asStep(validUntilStep,'validUntilStep');
  if(until<from)throw new TypeError('validUntilStep must be >= validFromStep');
  const cell=declared[0].nextCell;
  if(!declared.every(intent=>sameCell(intent.nextCell,cell)))throw new TypeError('all intents in one execution cycle must target the same next cell');
  if(new Set(declared.map(intent=>intent.carrierId)).size!==declared.length)throw new TypeError('each carrier may contribute only one intent per execution cycle');

  const requested=declared.map(intent=>ReservationLifecycleStateContract.define({reservation:CellReservationContract.define({carrierId:intent.carrierId,cell:intent.nextCell,validFromStep:from,validUntilStep:until})}));
  const decision=DeterministicReservationArbitration.decide({reservations:requested.map(state=>state.reservation)});
  const outcomes=requested.map(state=>state.carrierId===decision.winnerCarrierId
   ? Object.freeze({carrierId:state.carrierId,status:'GRANTED',lifecycleState:ReservationLifecycleStateContract.transition(state,'GRANTED')})
   : Object.freeze({carrierId:state.carrierId,status:'WAITING',lifecycleState:state}))
   .sort((a,b)=>a.carrierId.localeCompare(b.carrierId));

  return Object.freeze({kind:'reservation-execution-cycle',status:'RESOLVED',cell:Object.freeze({x:cell.x,y:cell.y}),validFromStep:from,validUntilStep:until,decision,outcomes:Object.freeze(outcomes)});
 }
}
