import { runCr19aSelfTest } from './cr-19a-self-test.js';
import { runCr19bSelfTest } from './cr-19b-self-test.js';
import { runCr19cSelfTest } from './cr-19c-self-test.js';
import { CellReservationContract } from '../transport/cell-reservation-contract.js';
import { DeterministicReservationArbitration } from '../transport/deterministic-reservation-arbitration.js';
import { ReservationMovementIntegration } from '../transport/reservation-movement-integration.js';

export function runCr19FreezeGate(){
 const results=[];const check=(name,fn)=>{try{results.push({name,pass:!!fn()});}catch(error){results.push({name,pass:false,error:String(error?.message||error)});}};const rejects=fn=>{try{fn();return false;}catch{return true;}};
 const a=runCr19aSelfTest(),b=runCr19bSelfTest(),c=runCr19cSelfTest();
 check('cr19a-regression',()=>a.pass===true);check('cr19b-regression',()=>b.pass===true);check('cr19c-regression',()=>c.pass===true);
 const winnerRequest=CellReservationContract.define({carrierId:'unit:00000001',cell:{x:1,y:0},validFromStep:10,validUntilStep:11});
 const loserRequest=CellReservationContract.define({carrierId:'unit:00000002',cell:{x:1,y:0},validFromStep:10,validUntilStep:11});
 const decision=DeterministicReservationArbitration.decide({reservations:[loserRequest,winnerRequest]});
 check('requested-to-arbitration-produces-exactly-one-deterministic-winner',()=>decision.winnerCarrierId==='unit:00000001'&&decision.winnerReservation.carrierId==='unit:00000001');
 check('winner-with-valid-reservation-enters-and-releases-after-completion',()=>{const e=ReservationMovementIntegration.begin({arbitrationDecision:decision,currentPosition:{x:0,y:0},currentStep:10});const done=ReservationMovementIntegration.complete({entry:e,reachedCell:{x:1,y:0},currentStep:11});return e.status==='ENTRY_AUTHORIZED'&&done.status==='ENTRY_COMPLETED'&&done.releaseReservation===true&&done.movement.state==='IDLE';});
 check('loser-cannot-enter',()=>rejects(()=>ReservationMovementIntegration.begin({arbitrationDecision:{...decision,winnerCarrierId:loserRequest.carrierId,winnerReservation:winnerRequest},currentPosition:{x:0,y:0},currentStep:10})));
 check('expired-reservation-cannot-enter',()=>rejects(()=>ReservationMovementIntegration.begin({arbitrationDecision:decision,currentPosition:{x:0,y:0},currentStep:12})));
 check('wrong-cell-reservation-cannot-enter',()=>rejects(()=>ReservationMovementIntegration.begin({arbitrationDecision:{...decision,winnerReservation:{...decision.winnerReservation,cell:{x:2,y:0}}},currentPosition:{x:0,y:0},currentStep:10})));
 check('no-reservation-means-no-movement-authorization',()=>rejects(()=>ReservationMovementIntegration.begin({arbitrationDecision:{...decision,winnerReservation:null},currentPosition:{x:0,y:0},currentStep:10})));
 check('cr19-freeze-boundary-adds-no-pathfinding-rerouting-or-new-arbitration-policy',()=>{const text=(CellReservationContract.toString()+DeterministicReservationArbitration.toString()+ReservationMovementIntegration.toString()).toLowerCase();return !text.includes('pathfind')&&!text.includes('reroute');});
 const blockerCount=results.filter(r=>!r.pass).length;return Object.freeze({pass:blockerCount===0,blockerCount,results:Object.freeze(results.map(Object.freeze))});
}
