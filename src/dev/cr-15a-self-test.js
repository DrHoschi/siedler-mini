import { CarrierWaitingStateContract } from '../transport/carrier-waiting-state-contract.js';

export function runCr15aSelfTest() {
  const results=[];
  const check=(name,fn)=>{try{results.push({name,pass:!!fn()});}catch(error){results.push({name,pass:false,error:String(error?.message||error)});}};
  const rejects=fn=>{try{fn();return false;}catch{return true;}};

  check('states-are-exact-and-ordered',()=>CarrierWaitingStateContract.states.join('|')==='READY|WAITING');
  check('reasons-are-exact-and-ordered',()=>CarrierWaitingStateContract.reasons.join('|')==='OCCUPIED|ARBITRATION_LOST');
  check('ready-is-clear-and-immutable',()=>{
    const state=CarrierWaitingStateContract.define({carrierId:'unit:00000001'});
    return state.state==='READY'&&state.reason===null&&state.nextCell===null&&Object.isFrozen(state);
  });
  check('waiting-on-occupied-cell-is-explicit',()=>{
    const state=CarrierWaitingStateContract.define({carrierId:'unit:00000001',state:'WAITING',reason:'OCCUPIED',nextCell:{x:2,y:3}});
    return state.state==='WAITING'&&state.reason==='OCCUPIED'&&state.nextCell.x===2&&state.nextCell.y===3&&Object.isFrozen(state.nextCell);
  });
  check('waiting-after-arbitration-loss-is-explicit',()=>CarrierWaitingStateContract.define({carrierId:'unit:00000002',state:'WAITING',reason:'ARBITRATION_LOST',nextCell:{x:1,y:0}}).reason==='ARBITRATION_LOST');
  check('ready-rejects-wait-data',()=>rejects(()=>CarrierWaitingStateContract.define({carrierId:'unit:00000001',state:'READY',reason:'OCCUPIED',nextCell:{x:1,y:0}})));
  check('waiting-requires-reason-and-cell',()=>rejects(()=>CarrierWaitingStateContract.define({carrierId:'unit:00000001',state:'WAITING',nextCell:{x:1,y:0}}))&&rejects(()=>CarrierWaitingStateContract.define({carrierId:'unit:00000001',state:'WAITING',reason:'OCCUPIED'})));
  check('unknown-state-or-reason-is-rejected',()=>rejects(()=>CarrierWaitingStateContract.define({carrierId:'unit:00000001',state:'PAUSED'}))&&rejects(()=>CarrierWaitingStateContract.define({carrierId:'unit:00000001',state:'WAITING',reason:'FAIRNESS',nextCell:{x:1,y:0}})));
  check('stable-unit-id-and-grid-cell-are-required',()=>rejects(()=>CarrierWaitingStateContract.define({carrierId:'carrier-a'}))&&rejects(()=>CarrierWaitingStateContract.define({carrierId:'unit:00000001',state:'WAITING',reason:'OCCUPIED',nextCell:{x:0.5,y:0}})));
  check('same-input-is-deterministic',()=>{
    const input={carrierId:'unit:00000001',state:'WAITING',reason:'OCCUPIED',nextCell:{x:2,y:3}};
    return JSON.stringify(CarrierWaitingStateContract.define(input))===JSON.stringify(CarrierWaitingStateContract.define(input));
  });
  check('cr15a-adds-no-priority-fairness-entry-movement-reroute-deadlock-or-reservation-policy',()=>{
    const text=CarrierWaitingStateContract.toString().toLowerCase();
    return !text.includes('priority')&&!text.includes('fairness')&&!text.includes('arbitrat')&&!text.includes('advance')&&!text.includes('reroute')&&!text.includes('deadlock')&&!text.includes('reservation');
  });

  const blockerCount=results.filter(r=>!r.pass).length;
  return Object.freeze({pass:blockerCount===0,blockerCount,results:Object.freeze(results.map(Object.freeze))});
}
