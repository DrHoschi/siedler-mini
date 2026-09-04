import { runCr21bSelfTest } from './cr-21b-self-test.js';
import { runCr21aFreezeGate } from './cr-21a-freeze-gate.js';
import { runCr20FreezeGate } from './cr-20-freeze-gate.js';
import { NextCellReservationIntentContract } from '../transport/next-cell-reservation-intent-contract.js';
import { DeterministicReservationExecutionCycle } from '../transport/deterministic-reservation-execution-cycle.js';

function route(){return {startPosition:{x:0,y:0},targetPosition:{x:2,y:0},waypoints:[{x:1,y:0}],state:'ACTIVE'};}
function intent(carrierId){return NextCellReservationIntentContract.define({carrierId,route:route(),currentPosition:{x:0,y:0},nextCell:{x:1,y:0}});}

export function runCr21bFreezeGate(){
 const results=[];
 const check=(name,fn)=>{try{results.push({name,pass:!!fn()});}catch(error){results.push({name,pass:false,error:String(error?.message||error)});}};
 const b=runCr21bSelfTest();
 const a=runCr21aFreezeGate();
 const cr20=runCr20FreezeGate();
 check('cr21b-self-test-regression',()=>b.pass===true&&b.blockerCount===0);
 check('cr21a-frozen-baseline-regression',()=>a.pass===true&&a.blockerCount===0);
 check('cr20-frozen-baseline-regression',()=>cr20.pass===true&&cr20.blockerCount===0);
 check('requested-arbitration-grants-one-and-waits-rest',()=>{const r=DeterministicReservationExecutionCycle.run({intents:[intent('unit:00000002'),intent('unit:00000001')],validFromStep:10,validUntilStep:11});const granted=r.outcomes.filter(o=>o.status==='GRANTED');const waiting=r.outcomes.filter(o=>o.status==='WAITING');return r.status==='RESOLVED'&&r.decision.winnerCarrierId==='unit:00000001'&&granted.length===1&&granted[0].lifecycleState.status==='GRANTED'&&waiting.length===1&&waiting[0].carrierId==='unit:00000002'&&waiting[0].lifecycleState.status==='REQUESTED';});
 check('same-inputs-remain-deterministic',()=>{const args={intents:[intent('unit:00000002'),intent('unit:00000001')],validFromStep:10,validUntilStep:11};return JSON.stringify(DeterministicReservationExecutionCycle.run(args))===JSON.stringify(DeterministicReservationExecutionCycle.run(args));});
 check('frozen-cr19-policy-remains-delegated-not-reimplemented',()=>DeterministicReservationExecutionCycle.run({intents:[intent('unit:00000002'),intent('unit:00000001')],validFromStep:10,validUntilStep:11}).decision.policy==='EARLIEST_WINDOW_THEN_LOWEST_STABLE_ID');
 check('freeze-boundary-adds-no-movement-consumption-release-next-cycle-pathfinding-rerouting-or-lookahead',()=>{const text=DeterministicReservationExecutionCycle.toString().toLowerCase();return !text.includes("'consumed'")&&!text.includes("'released'")&&!text.includes('move(')&&!text.includes('advance(')&&!text.includes('entercell')&&!text.includes('nextcycle')&&!text.includes('pathfind')&&!text.includes('rerout')&&!text.includes('lookahead');});
 const blockerCount=results.filter(r=>!r.pass).length;
 return Object.freeze({pass:blockerCount===0,blockerCount,results:Object.freeze(results.map(Object.freeze))});
}
