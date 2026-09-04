import { CellReservationContract } from '../transport/cell-reservation-contract.js';
import { DeterministicReservationArbitration } from '../transport/deterministic-reservation-arbitration.js';
export function runCr19bSelfTest(){const results=[];const check=(name,fn)=>{try{results.push({name,pass:!!fn()});}catch(error){results.push({name,pass:false,error:String(error?.message||error)});}};const rejects=fn=>{try{fn();return false;}catch{return true;}};
 const a=CellReservationContract.define({carrierId:'unit:00000002',cell:{x:3,y:4},validFromStep:10,validUntilStep:11});
 const b=CellReservationContract.define({carrierId:'unit:00000001',cell:{x:3,y:4},validFromStep:10,validUntilStep:11});
 const c=CellReservationContract.define({carrierId:'unit:00000003',cell:{x:3,y:4},validFromStep:9,validUntilStep:11});
 check('selects-exactly-one-winner',()=>{const d=DeterministicReservationArbitration.decide({reservations:[a,b]});return d.status==='WINNER_SELECTED'&&d.winnerCarrierId==='unit:00000001'&&d.loserCarrierIds.length===1;});
 check('earlier-window-wins-before-stable-id-tiebreak',()=>DeterministicReservationArbitration.decide({reservations:[a,c]}).winnerCarrierId==='unit:00000003');
 check('input-order-does-not-change-decision',()=>{const x=DeterministicReservationArbitration.decide({reservations:[a,b,c]});const y=DeterministicReservationArbitration.decide({reservations:[c,b,a]});return x.winnerCarrierId===y.winnerCarrierId&&x.loserCarrierIds.join('|')===y.loserCarrierIds.join('|');});
 check('rejects-different-cells-or-nonoverlap',()=>rejects(()=>DeterministicReservationArbitration.decide({reservations:[a,CellReservationContract.define({carrierId:'unit:00000004',cell:{x:4,y:4},validFromStep:10,validUntilStep:11})]}))&&rejects(()=>DeterministicReservationArbitration.decide({reservations:[a,CellReservationContract.define({carrierId:'unit:00000004',cell:{x:3,y:4},validFromStep:20,validUntilStep:21})]})));
 check('cr19b-does-not-authorize-movement-or-release',()=>{const text=DeterministicReservationArbitration.toString().toLowerCase();return !text.includes('move')&&!text.includes('release')&&!text.includes('entercell')&&!text.includes('movement');});
 const blockerCount=results.filter(r=>!r.pass).length;return Object.freeze({pass:blockerCount===0,blockerCount,results:Object.freeze(results.map(Object.freeze))});}
