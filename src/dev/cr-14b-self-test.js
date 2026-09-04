import { CellOccupancyContract } from '../transport/cell-occupancy-contract.js';
import { DeterministicEntryArbitrator } from '../transport/deterministic-entry-arbitrator.js';

export function runCr14bSelfTest() {
  const results=[];
  const check=(name,fn)=>{try{results.push({name,pass:!!fn()});}catch(error){results.push({name,pass:false,error:String(error?.message||error)});}};
  const free=CellOccupancyContract.define();

  check('single-contender-wins',()=>{
    const result=DeterministicEntryArbitrator.decide({occupancy:free,carrierIds:['carrier-b']});
    return result.winnerCarrierId==='carrier-b' && result.loserCarrierIds.length===0;
  });

  check('lexically-lowest-carrier-id-wins',()=>{
    const result=DeterministicEntryArbitrator.decide({occupancy:free,carrierIds:['carrier-c','carrier-a','carrier-b']});
    return result.winnerCarrierId==='carrier-a' && JSON.stringify(result.loserCarrierIds)===JSON.stringify(['carrier-b','carrier-c']);
  });

  check('input-order-does-not-change-winner',()=>{
    const a=DeterministicEntryArbitrator.decide({occupancy:free,carrierIds:['carrier-c','carrier-a','carrier-b']});
    const b=DeterministicEntryArbitrator.decide({occupancy:free,carrierIds:['carrier-b','carrier-c','carrier-a']});
    return JSON.stringify(a)===JSON.stringify(b);
  });

  check('occupied-cell-is-not-arbitrated',()=>{
    try {
      DeterministicEntryArbitrator.decide({occupancy:CellOccupancyContract.define({state:'OCCUPIED',carrierId:'carrier-x'}),carrierIds:['carrier-a','carrier-b']});
      return false;
    } catch(error) {
      return String(error?.message||error).includes('FREE cell');
    }
  });

  check('duplicate-contender-is-rejected',()=>{
    try { DeterministicEntryArbitrator.decide({occupancy:free,carrierIds:['carrier-a','carrier-a']}); return false; }
    catch(error) { return String(error?.message||error).includes('unique'); }
  });

  check('decision-output-is-immutable',()=>{
    const result=DeterministicEntryArbitrator.decide({occupancy:free,carrierIds:['carrier-b','carrier-a']});
    return Object.isFrozen(result)&&Object.isFrozen(result.loserCarrierIds);
  });

  check('cr14b-adds-no-movement-wait-reroute-or-reservation',()=>{
    const text=DeterministicEntryArbitrator.toString().toLowerCase();
    return !text.includes('movement')&&!text.includes('wait')&&!text.includes('reroute')&&!text.includes('reservation')&&!text.includes('reserve');
  });

  const blockerCount=results.filter(r=>!r.pass).length;
  return Object.freeze({pass:blockerCount===0,blockerCount,results:Object.freeze(results.map(Object.freeze))});
}
