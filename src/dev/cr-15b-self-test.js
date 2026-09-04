import { DeterministicWaitPriorityPolicy } from '../transport/deterministic-wait-priority-policy.js';

export function runCr15bSelfTest() {
  const results=[];
  const check=(name,fn)=>{try{results.push({name,pass:!!fn()});}catch(error){results.push({name,pass:false,error:String(error?.message||error)});}};
  const rejects=fn=>{try{fn();return false;}catch{return true;}};

  const freshA={carrierId:'unit:00000001',waitingCycles:0};
  const freshB={carrierId:'unit:00000002',waitingCycles:0};
  const freshC={carrierId:'unit:00000003',waitingCycles:0};
  const waitedA={carrierId:'unit:00000001',waitingCycles:2};
  const waitedB={carrierId:'unit:00000002',waitingCycles:1};

  check('longer-waiting-carrier-wins',()=>DeterministicWaitPriorityPolicy.decide({contenders:[freshA,waitedB]}).winnerCarrierId==='unit:00000002');
  check('repeated-waiting-outranks-shorter-waiting',()=>DeterministicWaitPriorityPolicy.decide({contenders:[waitedB,waitedA]}).winnerCarrierId==='unit:00000001');
  check('equal-waiting-uses-stable-carrier-id-tiebreak',()=>DeterministicWaitPriorityPolicy.decide({contenders:[freshB,freshA]}).winnerCarrierId==='unit:00000001');
  check('input-order-does-not-change-result',()=>{
    const a=DeterministicWaitPriorityPolicy.decide({contenders:[waitedB,waitedA,freshC]});
    const b=DeterministicWaitPriorityPolicy.decide({contenders:[freshC,waitedA,waitedB]});
    return JSON.stringify(a)===JSON.stringify(b);
  });
  check('decision-is-deeply-immutable',()=>{
    const result=DeterministicWaitPriorityPolicy.decide({contenders:[freshB,waitedA]});
    return Object.isFrozen(result)&&Object.isFrozen(result.loserCarrierIds)&&Object.isFrozen(result.priorityOrder)&&result.priorityOrder.every(Object.isFrozen);
  });
  check('invalid-waiting-history-is-rejected',()=>rejects(()=>DeterministicWaitPriorityPolicy.decide({contenders:[{carrierId:'unit:00000001',waitingCycles:-1}]}))&&rejects(()=>DeterministicWaitPriorityPolicy.decide({contenders:[{carrierId:'unit:00000001',waitingCycles:1.5}]})));
  check('duplicate-carriers-are-rejected',()=>rejects(()=>DeterministicWaitPriorityPolicy.decide({contenders:[freshA,{...freshA,waitingCycles:2}]})));
  check('policy-adds-no-time-random-movement-deadlock-reroute-or-reservation',()=>{
    const text=DeterministicWaitPriorityPolicy.toString().toLowerCase();
    return !text.includes('date')&&!text.includes('random')&&!text.includes('movement')&&!text.includes('deadlock')&&!text.includes('reroute')&&!text.includes('reservation');
  });

  const blockerCount=results.filter(r=>!r.pass).length;
  return Object.freeze({pass:blockerCount===0,blockerCount,results:Object.freeze(results.map(Object.freeze))});
}
