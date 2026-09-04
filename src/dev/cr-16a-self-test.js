import { WaitDependencyContract } from '../transport/wait-dependency-contract.js';

export function runCr16aSelfTest() {
  const results=[];
  const check=(name,fn)=>{try{results.push({name,pass:!!fn()});}catch(error){results.push({name,pass:false,error:String(error?.message||error)});}};
  const rejects=fn=>{try{fn();return false;}catch{return true;}};

  check('dependency-direction-is-explicit-a-to-b',()=>{
    const dependency=WaitDependencyContract.define({waitingCarrierId:'unit:00000001',blockingCarrierId:'unit:00000002',blockedCell:{x:2,y:3}});
    return dependency.kind==='wait-dependency'&&dependency.waitingCarrierId==='unit:00000001'&&dependency.blockingCarrierId==='unit:00000002';
  });
  check('blocked-cell-is-explicit-and-immutable',()=>{
    const dependency=WaitDependencyContract.define({waitingCarrierId:'unit:00000001',blockingCarrierId:'unit:00000002',blockedCell:{x:2,y:3}});
    return dependency.blockedCell.x===2&&dependency.blockedCell.y===3&&Object.isFrozen(dependency.blockedCell)&&Object.isFrozen(dependency);
  });
  check('both-carriers-require-stable-unit-ids',()=>rejects(()=>WaitDependencyContract.define({waitingCarrierId:'carrier-a',blockingCarrierId:'unit:00000002',blockedCell:{x:0,y:0}}))&&rejects(()=>WaitDependencyContract.define({waitingCarrierId:'unit:00000001',blockingCarrierId:'carrier-b',blockedCell:{x:0,y:0}})));
  check('blocked-cell-requires-integer-grid-coordinate',()=>rejects(()=>WaitDependencyContract.define({waitingCarrierId:'unit:00000001',blockingCarrierId:'unit:00000002',blockedCell:{x:0.5,y:0}})));
  check('self-dependency-is-rejected',()=>rejects(()=>WaitDependencyContract.define({waitingCarrierId:'unit:00000001',blockingCarrierId:'unit:00000001',blockedCell:{x:0,y:0}})));
  check('same-input-is-deterministic',()=>{
    const input={waitingCarrierId:'unit:00000001',blockingCarrierId:'unit:00000002',blockedCell:{x:2,y:3}};
    return JSON.stringify(WaitDependencyContract.define(input))===JSON.stringify(WaitDependencyContract.define(input));
  });
  check('cr16a-adds-no-cycle-detection-resolution-priority-or-movement-policy',()=>{
    const text=WaitDependencyContract.toString().toLowerCase();
    return !text.includes('cycle')&&!text.includes('deadlock')&&!text.includes('resolve')&&!text.includes('priority')&&!text.includes('yield')&&!text.includes('retreat')&&!text.includes('reroute')&&!text.includes('move');
  });

  const blockerCount=results.filter(r=>!r.pass).length;
  return Object.freeze({pass:blockerCount===0,blockerCount,results:Object.freeze(results.map(Object.freeze))});
}
