import { runCr17aSelfTest } from './cr-17a-self-test.js';
import { runCr17bSelfTest } from './cr-17b-self-test.js';
import { runCr17cSelfTest } from './cr-17c-self-test.js';
import { DeterministicDeadlockResolutionPolicy } from '../transport/deterministic-deadlock-resolution-policy.js';
import { YieldRecoveryIntentContract } from '../transport/yield-recovery-intent-contract.js';
import { DeterministicRecoveryTargetSelector } from '../transport/deterministic-recovery-target-selector.js';
import { ControlledRecoveryMovementIntegration } from '../transport/controlled-recovery-movement-integration.js';
import { CellOccupancyContract } from '../transport/cell-occupancy-contract.js';

export function runCr17FreezeGate(){
  const results=[];
  const check=(name,fn)=>{try{results.push({name,pass:!!fn()});}catch(error){results.push({name,pass:false,error:String(error?.message||error)});}};

  check('cr17a-regression',()=>runCr17aSelfTest().pass);
  check('cr17b-regression',()=>runCr17bSelfTest().pass);
  check('cr17c-regression',()=>runCr17cSelfTest().pass);

  check('full-recovery-chain-is-deterministic-and-local',()=>{
    const deadlock=Object.freeze({kind:'deadlock',carrierIds:Object.freeze(['unit:00000001','unit:00000002']),dependencyCount:2});
    const decision=DeterministicDeadlockResolutionPolicy.decide(deadlock);
    const intent=YieldRecoveryIntentContract.define({carrierId:decision.yieldingCarrierId,triggeringDeadlock:deadlock,resolutionDecision:decision});
    const selection=DeterministicRecoveryTargetSelector.select({
      recoveryIntent:intent,currentCell:{x:2,y:2},
      contains:(x,y)=>x>=0&&y>=0&&x<5&&y<5,
      isTraversable:cell=>!(cell.x===1&&cell.y===2),
      occupancyAt:cell=>(cell.x===2&&cell.y===1)?CellOccupancyContract.define({state:'OCCUPIED',carrierId:'unit:00000003'}):CellOccupancyContract.define({state:'FREE'})
    });
    const movement=ControlledRecoveryMovementIntegration.begin({recoveryIntent:intent,targetSelection:selection,currentCell:{x:2,y:2}});
    const done=ControlledRecoveryMovementIntegration.complete({recoveryMovement:movement,reachedCell:selection.targetCell});
    return decision.yieldingCarrierId==='unit:00000002'&&selection.status==='SELECTED'&&selection.targetCell.x===2&&selection.targetCell.y===3&&done.status==='RECOVERED'&&done.releaseWaitDependency===true&&done.returnToTrafficControl===true;
  });

  check('cr17-scope-excludes-general-rerouting-or-new-target-search-in-movement',()=>{
    const text=ControlledRecoveryMovementIntegration.toString().toLowerCase();
    return !text.includes('pathfind')&&!text.includes('reroute')&&!text.includes('candidate')&&!text.includes('occupancyat')&&!text.includes('istraversable');
  });

  const blockerCount=results.filter(r=>!r.pass).length;
  return Object.freeze({pass:blockerCount===0,blockerCount,results:Object.freeze(results.map(Object.freeze))});
}
