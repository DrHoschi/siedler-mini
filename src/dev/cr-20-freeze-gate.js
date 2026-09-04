import { runCr19FreezeGate } from './cr-19-freeze-gate.js';
import { runCr20aSelfTest } from './cr-20a-self-test.js';
import { runCr20bSelfTest } from './cr-20b-self-test.js';
import { runCr20cSelfTest } from './cr-20c-self-test.js';
import { CellReservationContract } from '../transport/cell-reservation-contract.js';
import { DeterministicReservationArbitration } from '../transport/deterministic-reservation-arbitration.js';
import { ReservationLifecycleStateContract } from '../transport/reservation-lifecycle-state-contract.js';
import { ReservationExpiryPolicy } from '../transport/reservation-expiry-policy.js';
import { BlockedCellSource } from '../transport/blocked-cell-source.js';
import { ReservationLifecycleTrafficIntegration } from '../transport/reservation-lifecycle-traffic-integration.js';

function mapStub(){return {contains:(x,y)=>Number.isSafeInteger(x)&&Number.isSafeInteger(y)&&x>=0&&y>=0&&x<8&&y<8,cellIdAt:(x,y)=>`cell:${x}:${y}`};}
function request(carrierId='unit:00000002',cell={x:3,y:4}){return CellReservationContract.define({carrierId,cell,validFromStep:10,validUntilStep:11});}

export function runCr20FreezeGate(){
 const results=[];
 const check=(name,fn)=>{try{results.push({name,pass:!!fn()});}catch(error){results.push({name,pass:false,error:String(error?.message||error)});}};
 const a=runCr20aSelfTest(),b=runCr20bSelfTest(),c=runCr20cSelfTest(),cr19=runCr19FreezeGate();
 check('cr20a-regression',()=>a.pass===true);
 check('cr20b-regression',()=>b.pass===true);
 check('cr20c-regression',()=>c.pass===true);
 check('cr19-frozen-regression',()=>cr19.pass===true);

 check('requested-granted-terminal-lifecycle-is-complete',()=>{
  const requested=ReservationLifecycleStateContract.define({reservation:request()});
  const granted=ReservationLifecycleStateContract.transition(requested,'GRANTED');
  const consumed=ReservationLifecycleStateContract.transition(granted,'CONSUMED');
  const expired=ReservationLifecycleStateContract.transition(granted,'EXPIRED');
  const released=ReservationLifecycleStateContract.transition(granted,'RELEASED');
  return requested.status==='REQUESTED'&&granted.status==='GRANTED'&&['CONSUMED','EXPIRED','RELEASED'].every((status,i)=>[consumed,expired,released][i].status===status&&ReservationLifecycleStateContract.isTerminal([consumed,expired,released][i]));
 });

 check('valid-until-step-is-inclusive-and-expiry-afterwards-is-deterministic',()=>{
  const requested=ReservationLifecycleStateContract.define({reservation:request()});
  const granted=ReservationLifecycleStateContract.transition(requested,'GRANTED');
  const atUntilA=ReservationExpiryPolicy.evaluate(granted,11);
  const atUntilB=ReservationExpiryPolicy.evaluate(granted,11);
  const afterA=ReservationExpiryPolicy.evaluate(granted,12);
  const afterB=ReservationExpiryPolicy.evaluate(granted,12);
  return atUntilA.status==='GRANTED'&&atUntilB.status==='GRANTED'&&afterA.status==='EXPIRED'&&afterB.status==='EXPIRED'&&JSON.stringify(afterA)===JSON.stringify(afterB);
 });

 check('terminal-lifecycle-releases-owned-block-and-cell-can-be-requested-again',()=>{
  const blocked=new BlockedCellSource({map:mapStub()});
  const integration=new ReservationLifecycleTrafficIntegration({blockedCellSource:blocked});
  const first=ReservationLifecycleStateContract.define({reservation:request('unit:00000002')});
  integration.apply(first);
  const granted=ReservationLifecycleStateContract.transition(first,'GRANTED');
  integration.apply(granted);
  const expired=ReservationExpiryPolicy.evaluate(granted,12);
  const released=integration.apply(expired);
  if(expired.status!=='EXPIRED'||released.blocks||!released.available||blocked.stateAt(first.cell)!=='TRAVERSABLE')return false;
  const next=ReservationLifecycleStateContract.define({reservation:request('unit:00000003')});
  const nextResult=integration.apply(next);
  return nextResult.blocks&&!nextResult.available&&blocked.stateAt(next.cell)==='BLOCKED';
 });

 check('consumed-expired-and-released-all-remove-owned-reservation-blocking',()=>{
  for(const terminal of ['CONSUMED','EXPIRED','RELEASED']){
   const blocked=new BlockedCellSource({map:mapStub()});
   const integration=new ReservationLifecycleTrafficIntegration({blockedCellSource:blocked});
   const requested=ReservationLifecycleStateContract.define({reservation:request()});
   integration.apply(requested);
   let from=requested;
   if(terminal!=='RELEASED'){from=ReservationLifecycleStateContract.transition(requested,'GRANTED');integration.apply(from);}
   const ended=ReservationLifecycleStateContract.transition(from,terminal);
   const result=integration.apply(ended);
   if(result.blocks||!result.available||blocked.stateAt(ended.cell)!=='TRAVERSABLE')return false;
  }
  return true;
 });

 check('foreign-cell-blocking-survives-terminal-reservation',()=>{
  const blocked=new BlockedCellSource({map:mapStub()});
  blocked.block({x:3,y:4});
  const integration=new ReservationLifecycleTrafficIntegration({blockedCellSource:blocked});
  const requested=ReservationLifecycleStateContract.define({reservation:request()});
  const granted=ReservationLifecycleStateContract.transition(requested,'GRANTED');
  integration.apply(granted);
  const expired=ReservationLifecycleStateContract.transition(granted,'EXPIRED');
  const result=integration.apply(expired);
  return !result.blocks&&!result.available&&blocked.stateAt(expired.cell)==='BLOCKED';
 });

 check('cr19-arbitration-policy-and-winner-remain-unchanged',()=>{
  const winner=request('unit:00000001',{x:1,y:0});
  const loser=request('unit:00000002',{x:1,y:0});
  const decision=DeterministicReservationArbitration.decide({reservations:[loser,winner]});
  return decision.winnerCarrierId==='unit:00000001'&&decision.winnerReservation===winner&&decision.policy==='EARLIEST_WINDOW_THEN_LOWEST_STABLE_ID'&&decision.loserCarrierIds.length===1&&decision.loserCarrierIds[0]==='unit:00000002';
 });

 check('cr20-freeze-boundary-adds-no-new-movement-pathfinding-rerouting-or-arbitration-policy',()=>{
  const text=(ReservationLifecycleStateContract.toString()+ReservationExpiryPolicy.toString()+ReservationLifecycleTrafficIntegration.toString()).toLowerCase();
  return !text.includes('pathfind')&&!text.includes('rerout')&&!text.includes('entercell')&&!text.includes('winnerselected')&&!text.includes('earliest_window_then_lowest_stable_id');
 });

 const blockerCount=results.filter(r=>!r.pass).length;
 return Object.freeze({pass:blockerCount===0,blockerCount,results:Object.freeze(results.map(Object.freeze))});
}
