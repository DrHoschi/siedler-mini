import { DirectTargetMovementExecution } from '../transport/direct-target-movement-execution.js';

export function runCr08bSelfTest() {
  const results=[];
  const check=(name,fn)=>{try{results.push({name,pass:!!fn()});}catch(error){results.push({name,pass:false,error:String(error?.message||error)});}};
  const rejects=fn=>{try{fn();return false;}catch{return true;}};
  const nearlyEqual=(a,b,epsilon=1e-12)=>Math.abs(a-b)<=epsilon;

  const moving={unitId:'unit:00000001',currentPosition:{x:0,y:0},state:'MOVING',targetPosition:{x:3,y:4}};
  const idle={unitId:'unit:00000001',currentPosition:{x:2,y:2},state:'IDLE',targetPosition:null};

  check('partial-step-moves-deterministically-on-direct-line',()=>{const next=DirectTargetMovementExecution.advance(moving,2);return next.state==='MOVING'&&nearlyEqual(next.currentPosition.x,1.2)&&nearlyEqual(next.currentPosition.y,1.6)&&next.targetPosition.x===3&&next.targetPosition.y===4;});
  check('arrival-snaps-exactly-to-target-and-becomes-idle',()=>{const next=DirectTargetMovementExecution.advance(moving,5);return next.state==='IDLE'&&next.targetPosition===null&&next.currentPosition.x===3&&next.currentPosition.y===4;});
  check('overshoot-does-not-pass-target',()=>{const next=DirectTargetMovementExecution.advance(moving,99);return next.state==='IDLE'&&next.currentPosition.x===3&&next.currentPosition.y===4;});
  check('idle-carrier-remains-unchanged',()=>{const next=DirectTargetMovementExecution.advance(idle,1);return next.state==='IDLE'&&next.currentPosition.x===2&&next.currentPosition.y===2&&next.targetPosition===null;});
  check('execution-is-repeatable-for-equal-inputs',()=>JSON.stringify(DirectTargetMovementExecution.advance(moving,2))===JSON.stringify(DirectTargetMovementExecution.advance(moving,2)));
  check('execution-rejects-invalid-distance',()=>rejects(()=>DirectTargetMovementExecution.advance(moving,0))&&rejects(()=>DirectTargetMovementExecution.advance(moving,-1))&&rejects(()=>DirectTargetMovementExecution.advance(moving,Infinity)));
  check('execution-does-not-mutate-input',()=>{const before=JSON.stringify(moving);DirectTargetMovementExecution.advance(moving,2);return JSON.stringify(moving)===before;});
  check('cr08b-adds-no-routing-pathfinding-or-domain-side-effects',()=>{const next=DirectTargetMovementExecution.advance(moving,2);const serialized=JSON.stringify(next).toLowerCase();return !serialized.includes('route')&&!serialized.includes('path')&&!serialized.includes('road')&&!serialized.includes('obstacle')&&!serialized.includes('jobid')&&!serialized.includes('claim')&&!serialized.includes('demand')&&!serialized.includes('assignment')&&!serialized.includes('settlement');});

  return Object.freeze({pass:results.every(r=>r.pass),results:Object.freeze(results.map(Object.freeze))});
}
