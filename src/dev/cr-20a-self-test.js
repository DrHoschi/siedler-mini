import { CellReservationContract } from '../transport/cell-reservation-contract.js';
import { ReservationLifecycleStateContract } from '../transport/reservation-lifecycle-state-contract.js';

export function runCr20aSelfTest(){
 const results=[];
 const check=(name,fn)=>{try{results.push({name,pass:!!fn()});}catch(error){results.push({name,pass:false,error:String(error?.message||error)});}};
 const rejects=fn=>{try{fn();return false;}catch{return true;}};
 const reservation=()=>CellReservationContract.define({carrierId:'unit:00000002',cell:{x:3,y:4},validFromStep:10,validUntilStep:11});

 check('defines-complete-reservation-lifecycle-state-set',()=>JSON.stringify(ReservationLifecycleStateContract.states)===JSON.stringify(['REQUESTED','GRANTED','CONSUMED','EXPIRED','RELEASED']));
 check('requested-and-granted-are-active-terminal-states-are-ended',()=>ReservationLifecycleStateContract.isActive('REQUESTED')&&ReservationLifecycleStateContract.isActive('GRANTED')&&!ReservationLifecycleStateContract.isActive('CONSUMED')&&!ReservationLifecycleStateContract.isActive('EXPIRED')&&!ReservationLifecycleStateContract.isActive('RELEASED')&&ReservationLifecycleStateContract.isTerminal('CONSUMED')&&ReservationLifecycleStateContract.isTerminal('EXPIRED')&&ReservationLifecycleStateContract.isTerminal('RELEASED'));
 check('requested-transitions-only-to-granted-or-released',()=>ReservationLifecycleStateContract.canTransition('REQUESTED','GRANTED')&&ReservationLifecycleStateContract.canTransition('REQUESTED','RELEASED')&&!ReservationLifecycleStateContract.canTransition('REQUESTED','CONSUMED')&&!ReservationLifecycleStateContract.canTransition('REQUESTED','EXPIRED'));
 check('granted-transitions-only-to-terminal-outcomes',()=>ReservationLifecycleStateContract.canTransition('GRANTED','CONSUMED')&&ReservationLifecycleStateContract.canTransition('GRANTED','EXPIRED')&&ReservationLifecycleStateContract.canTransition('GRANTED','RELEASED')&&!ReservationLifecycleStateContract.canTransition('GRANTED','REQUESTED'));
 check('terminal-states-cannot-transition',()=>['CONSUMED','EXPIRED','RELEASED'].every(from=>ReservationLifecycleStateContract.states.every(to=>!ReservationLifecycleStateContract.canTransition(from,to))));
 check('lifecycle-preserves-frozen-cr19-reservation-data',()=>{const source=reservation();const state=ReservationLifecycleStateContract.define({reservation:source});const granted=ReservationLifecycleStateContract.transition(state,'GRANTED');return state.status==='REQUESTED'&&granted.status==='GRANTED'&&granted.reservation===source&&granted.carrierId===source.carrierId&&granted.cell===source.cell&&granted.validFromStep===10&&granted.validUntilStep===11&&source.status==='REQUESTED';});
 check('lifecycle-state-is-immutable',()=>{const state=ReservationLifecycleStateContract.define({reservation:reservation()});return Object.isFrozen(state)&&Object.isFrozen(state.reservation)&&Object.isFrozen(state.cell);});
 check('invalid-status-or-transition-is-rejected',()=>rejects(()=>ReservationLifecycleStateContract.define({reservation:reservation(),status:'UNKNOWN'}))&&rejects(()=>ReservationLifecycleStateContract.transition(ReservationLifecycleStateContract.define({reservation:reservation()}),'CONSUMED')));
 check('cr20a-adds-no-expiry-clock-traffic-or-movement-behavior',()=>{const text=ReservationLifecycleStateContract.toString().toLowerCase();return !text.includes('currentstep')&&!text.includes('tick(')&&!text.includes('arbitrat')&&!text.includes('winner')&&!text.includes('move(')&&!text.includes('entercell')&&!text.includes('pathfind')&&!text.includes('rerout')&&!text.includes('blockedcell');});
 const blockerCount=results.filter(r=>!r.pass).length;
 return Object.freeze({pass:blockerCount===0,blockerCount,results:Object.freeze(results.map(Object.freeze))});
}
