import { DeterministicDeadlockDetector } from '../transport/deterministic-deadlock-detector.js';

const dep=(waitingCarrierId,blockingCarrierId,x=0,y=0)=>({waitingCarrierId,blockingCarrierId,blockedCell:{x,y}});

export function runCr16bSelfTest() {
  const results=[];
  const check=(name,fn)=>{try{results.push({name,pass:!!fn()});}catch(error){results.push({name,pass:false,error:String(error?.message||error)});}};
  const rejects=fn=>{try{fn();return false;}catch{return true;}};

  check('empty-input-has-no-deadlock',()=>{
    const result=DeterministicDeadlockDetector.detect([]);
    return result.deadlockCount===0&&result.deadlocks.length===0&&Object.isFrozen(result)&&Object.isFrozen(result.deadlocks);
  });

  check('acyclic-chain-has-no-deadlock',()=>DeterministicDeadlockDetector.detect([
    dep('unit:00000001','unit:00000002'),
    dep('unit:00000002','unit:00000003')
  ]).deadlockCount===0);

  check('detects-two-carrier-cycle',()=>{
    const result=DeterministicDeadlockDetector.detect([
      dep('unit:00000001','unit:00000002'),
      dep('unit:00000002','unit:00000001')
    ]);
    const deadlock=result.deadlocks[0];
    return result.deadlockCount===1&&deadlock.carrierIds.join('|')==='unit:00000001|unit:00000002'&&deadlock.dependencyCount===2&&Object.isFrozen(deadlock)&&Object.isFrozen(deadlock.carrierIds);
  });

  check('detects-three-carrier-cycle',()=>{
    const result=DeterministicDeadlockDetector.detect([
      dep('unit:00000003','unit:00000001'),
      dep('unit:00000001','unit:00000002'),
      dep('unit:00000002','unit:00000003')
    ]);
    return result.deadlockCount===1&&result.deadlocks[0].carrierIds.join('|')==='unit:00000001|unit:00000002|unit:00000003';
  });

  check('input-order-does-not-change-result',()=>{
    const a=[dep('unit:00000003','unit:00000001'),dep('unit:00000001','unit:00000002'),dep('unit:00000002','unit:00000003')];
    const b=[a[1],a[2],a[0]];
    return JSON.stringify(DeterministicDeadlockDetector.detect(a))===JSON.stringify(DeterministicDeadlockDetector.detect(b));
  });

  check('multiple-deadlocks-are-stably-ordered',()=>{
    const result=DeterministicDeadlockDetector.detect([
      dep('unit:00000004','unit:00000005'),dep('unit:00000005','unit:00000004'),
      dep('unit:00000002','unit:00000001'),dep('unit:00000001','unit:00000002')
    ]);
    return result.deadlockCount===2&&result.deadlocks.map(d=>d.carrierIds[0]).join('|')==='unit:00000001|unit:00000004';
  });

  check('duplicate-identical-dependency-does-not-duplicate-deadlock',()=>{
    const edge=dep('unit:00000001','unit:00000002');
    const result=DeterministicDeadlockDetector.detect([edge,edge,dep('unit:00000002','unit:00000001')]);
    return result.deadlockCount===1;
  });

  check('conflicting-outgoing-dependencies-are-rejected',()=>rejects(()=>DeterministicDeadlockDetector.detect([
    dep('unit:00000001','unit:00000002'),dep('unit:00000001','unit:00000003')
  ])));

  check('invalid-dependencies-are-rejected-by-cr16a-contract',()=>rejects(()=>DeterministicDeadlockDetector.detect([
    {waitingCarrierId:'carrier-a',blockingCarrierId:'unit:00000002',blockedCell:{x:0,y:0}}
  ])));

  check('same-state-always-produces-same-detection',()=>{
    const state=[dep('unit:00000002','unit:00000003'),dep('unit:00000003','unit:00000001'),dep('unit:00000001','unit:00000002')];
    return JSON.stringify(DeterministicDeadlockDetector.detect(state))===JSON.stringify(DeterministicDeadlockDetector.detect(state));
  });

  check('cr16b-adds-no-resolution-priority-yield-retreat-reroute-or-movement-policy',()=>{
    const text=DeterministicDeadlockDetector.toString().toLowerCase();
    return !text.includes('priority')&&!text.includes('resolve')&&!text.includes('yield')&&!text.includes('retreat')&&!text.includes('reroute')&&!text.includes('movement');
  });

  const blockerCount=results.filter(r=>!r.pass).length;
  return Object.freeze({pass:blockerCount===0,blockerCount,results:Object.freeze(results.map(Object.freeze))});
}
