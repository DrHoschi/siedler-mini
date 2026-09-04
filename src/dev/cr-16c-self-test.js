import { DeterministicDeadlockResolutionPolicy } from '../transport/deterministic-deadlock-resolution-policy.js';

export function runCr16cSelfTest() {
  const results=[];
  const check=(name,fn)=>{try{results.push({name,pass:!!fn()});}catch(error){results.push({name,pass:false,error:String(error?.message||error)});}};
  const rejects=fn=>{try{fn();return false;}catch{return true;}};
  const deadlock=(ids)=>Object.freeze({kind:'deadlock',carrierIds:Object.freeze(ids),dependencyCount:ids.length});

  check('two-carrier-deadlock-selects-highest-stable-id',()=>{
    const d=DeterministicDeadlockResolutionPolicy.decide(deadlock(['unit:00000001','unit:00000002']));
    return d.yieldingCarrierId==='unit:00000002'&&d.strategy==='HIGHEST_STABLE_ID_YIELDS';
  });
  check('three-carrier-deadlock-selects-exactly-one-yielder',()=>{
    const d=DeterministicDeadlockResolutionPolicy.decide(deadlock(['unit:00000003','unit:00000001','unit:00000002']));
    return d.yieldingCarrierId==='unit:00000003'&&d.retainedCarrierIds.join('|')==='unit:00000001|unit:00000002';
  });
  check('same-members-different-order-produce-same-decision',()=>{
    const a=DeterministicDeadlockResolutionPolicy.decide(deadlock(['unit:00000003','unit:00000001','unit:00000002']));
    const b=DeterministicDeadlockResolutionPolicy.decide(deadlock(['unit:00000002','unit:00000003','unit:00000001']));
    return JSON.stringify(a)===JSON.stringify(b);
  });
  check('decision-is-immutable',()=>{
    const d=DeterministicDeadlockResolutionPolicy.decide(deadlock(['unit:00000001','unit:00000002']));
    return Object.isFrozen(d)&&Object.isFrozen(d.retainedCarrierIds);
  });
  check('invalid-deadlock-is-rejected',()=>rejects(()=>DeterministicDeadlockResolutionPolicy.decide(null))&&rejects(()=>DeterministicDeadlockResolutionPolicy.decide({kind:'deadlock',carrierIds:['unit:00000001']})));
  check('cr16c-adds-no-movement-reroute-retreat-or-avoidance',()=>{
    const text=DeterministicDeadlockResolutionPolicy.toString().toLowerCase();
    return !text.includes('move')&&!text.includes('route')&&!text.includes('retreat')&&!text.includes('reverse')&&!text.includes('avoid');
  });

  const blockerCount=results.filter(r=>!r.pass).length;
  return Object.freeze({pass:blockerCount===0,blockerCount,results:Object.freeze(results.map(Object.freeze))});
}
