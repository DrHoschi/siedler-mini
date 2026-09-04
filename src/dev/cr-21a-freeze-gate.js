import { runCr21aSelfTest } from './cr-21a-self-test.js';
import { runCr20FreezeGate } from './cr-20-freeze-gate.js';
import { NextCellReservationIntentContract } from '../transport/next-cell-reservation-intent-contract.js';

export function runCr21aFreezeGate(){
 const results=[];
 const check=(name,fn)=>{try{results.push({name,pass:!!fn()});}catch(error){results.push({name,pass:false,error:String(error?.message||error)});}};
 const a=runCr21aSelfTest();
 const cr20=runCr20FreezeGate();
 check('cr21a-self-test-regression',()=>a.pass===true&&a.blockerCount===0);
 check('cr20-frozen-baseline-regression',()=>cr20.pass===true&&cr20.blockerCount===0);
 check('intent-remains-single-immediate-route-cell-only',()=>{const route={startPosition:{x:0,y:0},targetPosition:{x:2,y:0},waypoints:[{x:1,y:0}],state:'ACTIVE'};const intent=NextCellReservationIntentContract.define({carrierId:'unit:00000002',route,currentPosition:{x:0,y:0},nextCell:{x:1,y:0}});return intent.kind==='next-cell-reservation-intent'&&intent.status==='DECLARED'&&intent.nextCell.x===1&&intent.nextCell.y===0&&!Array.isArray(intent.nextCell);});
 check('freeze-boundary-adds-no-reservation-arbitration-movement-or-lookahead',()=>{const text=NextCellReservationIntentContract.toString().toLowerCase();return !text.includes('cellreservationcontract')&&!text.includes('arbitrat')&&!text.includes('winner')&&!text.includes('move(')&&!text.includes('advance(')&&!text.includes('pathfind')&&!text.includes('rerout')&&!text.includes('lookahead');});
 const blockerCount=results.filter(r=>!r.pass).length;
 return Object.freeze({pass:blockerCount===0,blockerCount,results:Object.freeze(results.map(Object.freeze))});
}
