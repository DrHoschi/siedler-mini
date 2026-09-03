import { CarrierMovementContract } from '../transport/carrier-movement-contract.js';

export function runCr08aSelfTest() {
  const results=[];
  const check=(name,fn)=>{try{results.push({name,pass:!!fn()});}catch(error){results.push({name,pass:false,error:String(error?.message||error)});}};
  const rejects=fn=>{try{fn();return false;}catch{return true;}};

  const idleFixture={unitId:'unit:00000001',currentPosition:{x:2,y:3},state:'IDLE',targetPosition:null};
  const movingFixture={unitId:'unit:00000001',currentPosition:{x:2,y:3},state:'MOVING',targetPosition:{x:5,y:7}};

  check('idle-contract-is-frozen-and-has-no-target',()=>{const m=CarrierMovementContract.define(idleFixture);return Object.isFrozen(m)&&Object.isFrozen(m.currentPosition)&&m.kind==='carrier-movement'&&m.state==='IDLE'&&m.targetPosition===null&&m.currentPosition.x===2&&m.currentPosition.y===3;});
  check('moving-contract-is-frozen-and-has-exact-target',()=>{const m=CarrierMovementContract.define(movingFixture);return Object.isFrozen(m)&&Object.isFrozen(m.targetPosition)&&m.state==='MOVING'&&m.targetPosition.x===5&&m.targetPosition.y===7;});
  check('idle-rejects-target',()=>rejects(()=>CarrierMovementContract.define({...idleFixture,targetPosition:{x:5,y:7}})));
  check('moving-requires-target',()=>rejects(()=>CarrierMovementContract.define({...movingFixture,targetPosition:null})));
  check('moving-target-must-differ-from-current-position',()=>rejects(()=>CarrierMovementContract.define({...movingFixture,targetPosition:{x:2,y:3}})));
  check('movement-requires-valid-unit-id-and-finite-positions',()=>rejects(()=>CarrierMovementContract.define({...idleFixture,unitId:'carrier-1'}))&&rejects(()=>CarrierMovementContract.define({...idleFixture,currentPosition:{x:Infinity,y:3}}))&&rejects(()=>CarrierMovementContract.define({...movingFixture,targetPosition:{x:5,y:NaN}})));
  check('movement-state-is-limited-to-idle-or-moving',()=>CarrierMovementContract.states.join('|')==='IDLE|MOVING'&&rejects(()=>CarrierMovementContract.define({...idleFixture,state:'ARRIVED'})));
  check('cr08a-does-not-mutate-input-or-add-execution-routing-data',()=>{const before=JSON.stringify(movingFixture);const m=CarrierMovementContract.define(movingFixture);const serialized=JSON.stringify(m).toLowerCase();return JSON.stringify(movingFixture)===before&&!serialized.includes('speed')&&!serialized.includes('velocity')&&!serialized.includes('progress')&&!serialized.includes('route')&&!serialized.includes('path')&&!serialized.includes('jobid')&&!serialized.includes('claim')&&!serialized.includes('demand')&&!serialized.includes('assignment')&&!serialized.includes('settlement');});

  return Object.freeze({pass:results.every(r=>r.pass),results:Object.freeze(results.map(Object.freeze))});
}
