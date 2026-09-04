import { CellReservationContract } from '../transport/cell-reservation-contract.js';
import { ReservationLifecycleStateContract } from '../transport/reservation-lifecycle-state-contract.js';
import { BlockedCellSource } from '../transport/blocked-cell-source.js';
import { ReservationLifecycleTrafficIntegration } from '../transport/reservation-lifecycle-traffic-integration.js';

function mapStub(){return {contains:(x,y)=>x>=0&&y>=0&&x<8&&y<8,cellIdAt:(x,y)=>`cell:${x}:${y}`};}
function reservation(carrierId='unit:00000002',cell={x:3,y:4}){return CellReservationContract.define({carrierId,cell,validFromStep:10,validUntilStep:11});}
function lifecycle(status='REQUESTED',carrierId='unit:00000002',cell={x:3,y:4}){return ReservationLifecycleStateContract.define({reservation:reservation(carrierId,cell),status});}

export function runCr20cSelfTest(){
 const results=[];
 const check=(name,fn)=>{try{results.push({name,pass:!!fn()});}catch(error){results.push({name,pass:false,error:String(error?.message||error)});}};
 const source=()=>new BlockedCellSource({map:mapStub()});

 check('requested-reservation-blocks-cell',()=>{const blocked=source();const integration=new ReservationLifecycleTrafficIntegration({blockedCellSource:blocked});const result=integration.apply(lifecycle('REQUESTED'));return result.blocks&&!result.available&&blocked.stateAt({x:3,y:4})==='BLOCKED';});
 check('granted-reservation-keeps-cell-blocked',()=>{const blocked=source();const integration=new ReservationLifecycleTrafficIntegration({blockedCellSource:blocked});const requested=lifecycle('REQUESTED');integration.apply(requested);const granted=ReservationLifecycleStateContract.transition(requested,'GRANTED');const result=integration.apply(granted);return result.blocks&&!result.available&&blocked.stateAt({x:3,y:4})==='BLOCKED';});
 check('consumed-reservation-releases-owned-blocking',()=>terminalReleases('CONSUMED'));
 check('expired-reservation-releases-owned-blocking',()=>terminalReleases('EXPIRED'));
 check('released-reservation-releases-owned-blocking',()=>terminalReleases('RELEASED'));
 check('terminal-reservation-makes-cell-available-for-new-requested',()=>{const blocked=source();const integration=new ReservationLifecycleTrafficIntegration({blockedCellSource:blocked});const first=lifecycle('REQUESTED','unit:00000002');integration.apply(first);const granted=ReservationLifecycleStateContract.transition(first,'GRANTED');integration.apply(granted);integration.apply(ReservationLifecycleStateContract.transition(granted,'EXPIRED'));if(!integration.isAvailable({x:3,y:4}))return false;const next=lifecycle('REQUESTED','unit:00000003');const nextResult=integration.apply(next);return nextResult.blocks&&!nextResult.available&&blocked.stateAt({x:3,y:4})==='BLOCKED';});
 check('active-reservation-keeps-cell-unavailable-for-new-request',()=>{const blocked=source();const integration=new ReservationLifecycleTrafficIntegration({blockedCellSource:blocked});integration.apply(lifecycle('REQUESTED','unit:00000002'));return !integration.isAvailable({x:3,y:4});});
 check('foreign-blocking-is-never-cleared-by-terminal-reservation',()=>{const blocked=source();blocked.block({x:3,y:4});const integration=new ReservationLifecycleTrafficIntegration({blockedCellSource:blocked});const granted=lifecycle('GRANTED');integration.apply(granted);const result=integration.apply(ReservationLifecycleStateContract.transition(granted,'EXPIRED'));return !result.blocks&&!result.available&&blocked.stateAt({x:3,y:4})==='BLOCKED';});
 check('same-input-produces-same-blocking-result',()=>{const a=source(),b=source();const ia=new ReservationLifecycleTrafficIntegration({blockedCellSource:a}),ib=new ReservationLifecycleTrafficIntegration({blockedCellSource:b});const state=lifecycle('REQUESTED');return JSON.stringify(ia.apply(state))===JSON.stringify(ib.apply(state));});
 check('cr20c-adds-no-arbitration-movement-pathfinding-or-rerouting',()=>{const text=ReservationLifecycleTrafficIntegration.toString().toLowerCase();return !text.includes('arbitrat')&&!text.includes('winner')&&!text.includes('move(')&&!text.includes('entercell')&&!text.includes('pathfind')&&!text.includes('rerout');});

 function terminalReleases(status){const blocked=source();const integration=new ReservationLifecycleTrafficIntegration({blockedCellSource:blocked});const requested=lifecycle('REQUESTED');integration.apply(requested);let beforeTerminal=requested;if(status!=='RELEASED'){beforeTerminal=ReservationLifecycleStateContract.transition(requested,'GRANTED');integration.apply(beforeTerminal);}const terminal=ReservationLifecycleStateContract.transition(beforeTerminal,status);const result=integration.apply(terminal);return !result.blocks&&result.available&&blocked.stateAt({x:3,y:4})==='TRAVERSABLE';}

 const blockerCount=results.filter(r=>!r.pass).length;
 return Object.freeze({pass:blockerCount===0,blockerCount,results:Object.freeze(results.map(Object.freeze))});
}
