import { WaitDependencyContract } from '../transport/wait-dependency-contract.js';
import { DeterministicDeadlockDetector } from '../transport/deterministic-deadlock-detector.js';
import { DeterministicDeadlockResolutionPolicy } from '../transport/deterministic-deadlock-resolution-policy.js';
import { runCr16aSelfTest } from './cr-16a-self-test.js';
import { runCr16bSelfTest } from './cr-16b-self-test.js';
import { runCr16cSelfTest } from './cr-16c-self-test.js';

export function runCr16FreezeGate() {
  const results=[];
  const check=(name,fn)=>{try{results.push({name,pass:!!fn()});}catch(error){results.push({name,pass:false,error:String(error?.message||error)});}};
  const dep=(a,b,x)=>WaitDependencyContract.define({waitingCarrierId:a,blockingCarrierId:b,blockedCell:{x,y:0}});

  const a=runCr16aSelfTest();
  const b=runCr16bSelfTest();
  const c=runCr16cSelfTest();
  check('cr16a-regression-pass',()=>a.pass&&a.blockerCount===0);
  check('cr16b-regression-pass',()=>b.pass&&b.blockerCount===0);
  check('cr16c-regression-pass',()=>c.pass&&c.blockerCount===0);

  check('wait-dependencies-detect-and-resolve-one-deadlock',()=>{
    const detection=DeterministicDeadlockDetector.detect([
      dep('unit:00000001','unit:00000002',1),
      dep('unit:00000002','unit:00000003',2),
      dep('unit:00000003','unit:00000001',3)
    ]);
    if(detection.deadlockCount!==1) return false;
    const decision=DeterministicDeadlockResolutionPolicy.decide(detection.deadlocks[0]);
    return decision.yieldingCarrierId==='unit:00000003'&&decision.retainedCarrierIds.length===2;
  });

  check('same-state-produces-same-detection-and-resolution',()=>{
    const d1=[dep('unit:00000001','unit:00000002',1),dep('unit:00000002','unit:00000001',2)];
    const d2=[d1[1],d1[0]];
    const a1=DeterministicDeadlockDetector.detect(d1);
    const a2=DeterministicDeadlockDetector.detect(d2);
    const r1=DeterministicDeadlockResolutionPolicy.decide(a1.deadlocks[0]);
    const r2=DeterministicDeadlockResolutionPolicy.decide(a2.deadlocks[0]);
    return JSON.stringify(a1)===JSON.stringify(a2)&&JSON.stringify(r1)===JSON.stringify(r2);
  });

  check('each-detected-deadlock-has-exactly-one-yielder',()=>{
    const detection=DeterministicDeadlockDetector.detect([
      dep('unit:00000001','unit:00000002',1),dep('unit:00000002','unit:00000001',2),
      dep('unit:00000003','unit:00000004',3),dep('unit:00000004','unit:00000005',4),dep('unit:00000005','unit:00000003',5)
    ]);
    const decisions=detection.deadlocks.map(d=>DeterministicDeadlockResolutionPolicy.decide(d));
    return detection.deadlockCount===2&&decisions.length===2&&decisions.every(d=>typeof d.yieldingCarrierId==='string'&&d.retainedCarrierIds.length===d.carrierIds.length-1);
  });

  check('cr16-freeze-boundary-adds-no-movement-semantics',()=>{
    const text=[WaitDependencyContract,DeterministicDeadlockDetector,DeterministicDeadlockResolutionPolicy].map(x=>x.toString().toLowerCase()).join('\n');
    return !text.includes('retreat')&&!text.includes('reverse')&&!text.includes('reroute')&&!text.includes('detour')&&!text.includes('sidestep')&&!text.includes('waypoint');
  });

  const blockerCount=results.filter(r=>!r.pass).length;
  return Object.freeze({pass:blockerCount===0,blockerCount,results:Object.freeze(results.map(Object.freeze))});
}
