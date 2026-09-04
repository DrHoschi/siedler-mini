import { CellReservationContract } from '../transport/cell-reservation-contract.js';
import { DeterministicReservationArbitration } from '../transport/deterministic-reservation-arbitration.js';
import { ReservationMovementIntegration } from '../transport/reservation-movement-integration.js';

export function runCr19cSelfTest(){
 const results=[];const check=(name,fn)=>{try{results.push({name,pass:!!fn()});}catch(error){results.push({name,pass:false,error:String(error?.message||error)});}};const rejects=fn=>{try{fn();return false;}catch{return true;}};
 const r1=CellReservationContract.define({carrierId:'unit:00000001',cell:{x:1,y:0},validFromStep:5,validUntilStep:6});
 const r2=CellReservationContract.define({carrierId:'unit:00000002',cell:{x:1,y:0},validFromStep:5,validUntilStep:6});
 const decision=DeterministicReservationArbitration.decide({reservations:[r2,r1]});
 check('only-cr19b-winner-can-enter-reserved-cell',()=>{const e=ReservationMovementIntegration.begin({arbitrationDecision:decision,currentPosition:{x:0,y:0},currentStep:5});return e.status==='ENTRY_AUTHORIZED'&&e.carrierId==='unit:00000001'&&e.targetCell.x===1&&e.movement.state==='MOVING';});
 check('reservation-must-be-valid-for-entry-step',()=>rejects(()=>ReservationMovementIntegration.begin({arbitrationDecision:decision,currentPosition:{x:0,y:0},currentStep:7})));
 check('entry-target-must-be-exact-reserved-next-cell',()=>rejects(()=>ReservationMovementIntegration.begin({arbitrationDecision:{...decision,winnerReservation:{...decision.winnerReservation,cell:{x:2,y:0}}},currentPosition:{x:0,y:0},currentStep:5})));
 check('completion-only-at-reserved-cell-and-valid-window',()=>{const e=ReservationMovementIntegration.begin({arbitrationDecision:decision,currentPosition:{x:0,y:0},currentStep:5});return rejects(()=>ReservationMovementIntegration.complete({entry:e,reachedCell:{x:0,y:1},currentStep:5}))&&rejects(()=>ReservationMovementIntegration.complete({entry:e,reachedCell:{x:1,y:0},currentStep:7}));});
 check('successful-entry-releases-reservation-and-idles-movement',()=>{const e=ReservationMovementIntegration.begin({arbitrationDecision:decision,currentPosition:{x:0,y:0},currentStep:5});const done=ReservationMovementIntegration.complete({entry:e,reachedCell:{x:1,y:0},currentStep:6});return done.status==='ENTRY_COMPLETED'&&done.releaseReservation===true&&done.movement.state==='IDLE'&&done.currentCell.x===1;});
 check('cr19c-adds-no-arbitration-pathfinding-or-rerouting-policy',()=>{const text=ReservationMovementIntegration.toString().toLowerCase();return !text.includes('sort(')&&!text.includes('pathfind')&&!text.includes('reroute')&&!text.includes('lowest_stable_id')&&!text.includes('earliest_window');});
 const blockerCount=results.filter(r=>!r.pass).length;return Object.freeze({pass:blockerCount===0,blockerCount,results:Object.freeze(results.map(Object.freeze))});
}
