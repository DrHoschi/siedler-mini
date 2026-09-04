import { CellReservationContract } from '../transport/cell-reservation-contract.js';
import { ReservationLifecycleStateContract } from '../transport/reservation-lifecycle-state-contract.js';
import { ReservationExpiryPolicy } from '../transport/reservation-expiry-policy.js';

export function runCr20bSelfTest(){
 const results=[];
 const check=(name,fn)=>{try{results.push({name,pass:!!fn()});}catch(error){results.push({name,pass:false,error:String(error?.message||error)});}};
 const rejects=fn=>{try{fn();return false;}catch{return true;}};
 const reservation=()=>CellReservationContract.define({carrierId:'unit:00000002',cell:{x:3,y:4},validFromStep:10,validUntilStep:11});
 const granted=()=>ReservationLifecycleStateContract.transition(ReservationLifecycleStateContract.define({reservation:reservation()}),'GRANTED');

 check('granted-reservation-remains-granted-before-valid-from-step',()=>ReservationExpiryPolicy.evaluate(granted(),9).status==='GRANTED');
 check('granted-reservation-remains-granted-at-valid-from-step',()=>ReservationExpiryPolicy.evaluate(granted(),10).status==='GRANTED');
 check('granted-reservation-remains-granted-through-valid-until-step',()=>ReservationExpiryPolicy.evaluate(granted(),11).status==='GRANTED');
 check('granted-reservation-expires-after-valid-until-step',()=>{const expired=ReservationExpiryPolicy.evaluate(granted(),12);return expired.status==='EXPIRED'&&ReservationLifecycleStateContract.isTerminal(expired)&&!ReservationLifecycleStateContract.isActive(expired);});
 check('same-state-and-step-produce-same-expiry-result',()=>{const state=granted();const a=ReservationExpiryPolicy.evaluate(state,12);const b=ReservationExpiryPolicy.evaluate(state,12);return a.status===b.status&&a.carrierId===b.carrierId&&a.cell.x===b.cell.x&&a.cell.y===b.cell.y&&a.validFromStep===b.validFromStep&&a.validUntilStep===b.validUntilStep;});
 check('requested-reservation-is-not-auto-expired-by-cr20b',()=>{const state=ReservationLifecycleStateContract.define({reservation:reservation()});return ReservationExpiryPolicy.evaluate(state,99)===state&&state.status==='REQUESTED';});
 check('terminal-reservations-remain-terminal-and-unchanged',()=>{const state=ReservationLifecycleStateContract.transition(granted(),'EXPIRED');return ReservationExpiryPolicy.evaluate(state,99)===state&&state.status==='EXPIRED';});
 check('invalid-current-step-is-rejected',()=>rejects(()=>ReservationExpiryPolicy.evaluate(granted(),-1))&&rejects(()=>ReservationExpiryPolicy.evaluate(granted(),1.5)));
 check('expiry-preserves-frozen-reservation-data',()=>{const state=granted();const expired=ReservationExpiryPolicy.evaluate(state,12);return expired.reservation===state.reservation&&expired.carrierId===state.carrierId&&expired.cell===state.cell&&expired.validFromStep===10&&expired.validUntilStep===11&&expired.reservation.status==='REQUESTED';});
 check('cr20b-adds-no-traffic-arbitration-or-movement-behavior',()=>{const text=ReservationExpiryPolicy.toString().toLowerCase();return !text.includes('blockedcell')&&!text.includes('arbitrat')&&!text.includes('winner')&&!text.includes('move(')&&!text.includes('entercell')&&!text.includes('pathfind')&&!text.includes('rerout');});
 const blockerCount=results.filter(r=>!r.pass).length;
 return Object.freeze({pass:blockerCount===0,blockerCount,results:Object.freeze(results.map(Object.freeze))});
}
