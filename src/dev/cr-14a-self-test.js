import { CellOccupancyContract } from '../transport/cell-occupancy-contract.js';

export function runCr14aSelfTest() {
  const results=[];
  const check=(name,fn)=>{try{results.push({name,pass:!!fn()});}catch(error){results.push({name,pass:false,error:String(error?.message||error)});}};

  check('states-are-exact-and-ordered',()=>JSON.stringify(CellOccupancyContract.states)===JSON.stringify(['FREE','OCCUPIED']));
  check('default-is-free',()=>{const value=CellOccupancyContract.define();return value.state==='FREE'&&value.occupied===false&&value.carrierId===null;});
  check('occupied-requires-carrier',()=>{const value=CellOccupancyContract.define({state:' occupied ',carrierId:' carrier-001 '});return value.state==='OCCUPIED'&&value.occupied===true&&value.carrierId==='carrier-001';});
  check('free-with-carrier-is-rejected',()=>{try{CellOccupancyContract.define({state:'FREE',carrierId:'carrier-001'});return false;}catch(error){return error instanceof Error;}});
  check('occupied-without-carrier-is-rejected',()=>{try{CellOccupancyContract.define({state:'OCCUPIED'});return false;}catch(error){return error instanceof Error;}});
  check('reserved-is-not-yet-part-of-contract',()=>{try{CellOccupancyContract.define({state:'RESERVED',carrierId:'carrier-001'});return false;}catch(error){return error instanceof TypeError;}});
  check('contract-output-is-immutable',()=>Object.isFrozen(CellOccupancyContract.define())&&Object.isFrozen(CellOccupancyContract.states));
  check('contract-is-deterministic',()=>JSON.stringify(CellOccupancyContract.define({state:'OCCUPIED',carrierId:'carrier-007'}))===JSON.stringify(CellOccupancyContract.define({state:'OCCUPIED',carrierId:'carrier-007'})));
  check('cr14a-adds-no-arbitration-waiting-movement-or-reservation',()=>{
    const text=CellOccupancyContract.toString().toLowerCase();
    return !text.includes('arbitrat')&&!text.includes('waiting')&&!text.includes('movement')&&!text.includes('reserve');
  });

  const blockerCount=results.filter(r=>!r.pass).length;
  return Object.freeze({pass:blockerCount===0,blockerCount,results:Object.freeze(results.map(Object.freeze))});
}
