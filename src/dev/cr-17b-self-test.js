import { CellOccupancyContract } from '../transport/cell-occupancy-contract.js';
import { DeterministicDeadlockResolutionPolicy } from '../transport/deterministic-deadlock-resolution-policy.js';
import { YieldRecoveryIntentContract } from '../transport/yield-recovery-intent-contract.js';
import { DeterministicRecoveryTargetSelector } from '../transport/deterministic-recovery-target-selector.js';

export function runCr17bSelfTest() {
  const results=[];
  const check=(name,fn)=>{try{results.push({name,pass:!!fn()});}catch(error){results.push({name,pass:false,error:String(error?.message||error)});}};
  const deadlock=Object.freeze({kind:'deadlock',carrierIds:Object.freeze(['unit:00000001','unit:00000002']),dependencyCount:2});
  const decision=DeterministicDeadlockResolutionPolicy.decide(deadlock);
  const intent=YieldRecoveryIntentContract.define({carrierId:decision.yieldingCarrierId,triggeringDeadlock:deadlock,resolutionDecision:decision});
  const key=cell=>`${cell.x},${cell.y}`;
  const makeEnv=({width=5,height=5,blocked=[],occupied=[]}={})=>{
    const blockedSet=new Set(blocked.map(key));
    const occupiedMap=new Map(occupied.map(([cell,carrierId])=>[key(cell),carrierId]));
    return {
      contains:(x,y)=>Number.isSafeInteger(x)&&Number.isSafeInteger(y)&&x>=0&&y>=0&&x<width&&y<height,
      isTraversable:cell=>!blockedSet.has(key(cell)),
      occupancyAt:cell=>occupiedMap.has(key(cell))
        ? CellOccupancyContract.define({state:'OCCUPIED',carrierId:occupiedMap.get(key(cell))})
        : CellOccupancyContract.define({state:'FREE'})
    };
  };

  check('selects-only-free-traversable-cardinal-neighbor',()=>{
    const env=makeEnv({blocked:[{x:1,y:2}],occupied:[[{x:2,y:1},'unit:00000003']]});
    const selection=DeterministicRecoveryTargetSelector.select({recoveryIntent:intent,currentCell:{x:2,y:2},...env});
    return selection.status==='SELECTED'&&selection.targetCell.x===2&&selection.targetCell.y===3;
  });
  check('selection-is-deterministic-by-local-xy-order',()=>{
    const env=makeEnv();
    const a=DeterministicRecoveryTargetSelector.select({recoveryIntent:intent,currentCell:{x:2,y:2},...env});
    const b=DeterministicRecoveryTargetSelector.select({recoveryIntent:intent,currentCell:{x:2,y:2},...env});
    return JSON.stringify(a)===JSON.stringify(b)&&a.targetCell.x===1&&a.targetCell.y===2&&a.policy==='LOCAL_FREE_CARDINAL_XY_ASC';
  });
  check('diagonal-cell-is-never-considered',()=>{
    const env=makeEnv({blocked:[{x:1,y:2},{x:2,y:1},{x:2,y:3},{x:3,y:2}]});
    const selection=DeterministicRecoveryTargetSelector.select({recoveryIntent:intent,currentCell:{x:2,y:2},...env});
    return selection.status==='NONE'&&selection.targetCell===null;
  });
  check('outside-map-candidates-are-ignored',()=>{
    const env=makeEnv({width:2,height:2});
    const selection=DeterministicRecoveryTargetSelector.select({recoveryIntent:intent,currentCell:{x:0,y:0},...env});
    return selection.status==='SELECTED'&&selection.targetCell.x===0&&selection.targetCell.y===1;
  });
  check('occupied-cells-are-never-selected',()=>{
    const env=makeEnv({occupied:[[{x:1,y:2},'unit:00000003'],[{x:2,y:1},'unit:00000004'],[{x:2,y:3},'unit:00000005'],[{x:3,y:2},'unit:00000006']]});
    const selection=DeterministicRecoveryTargetSelector.select({recoveryIntent:intent,currentCell:{x:2,y:2},...env});
    return selection.status==='NONE';
  });
  check('selection-result-is-immutable',()=>{
    const env=makeEnv();
    const selection=DeterministicRecoveryTargetSelector.select({recoveryIntent:intent,currentCell:{x:2,y:2},...env});
    return Object.isFrozen(selection)&&Object.isFrozen(selection.targetCell);
  });
  check('cr17b-adds-no-movement-or-general-rerouting',()=>{
    const text=DeterministicRecoveryTargetSelector.toString().toLowerCase();
    return !text.includes('move(')&&!text.includes('pathfind')&&!text.includes('reroute')&&!text.includes('waypoint')&&!text.includes('routecontract');
  });

  const blockerCount=results.filter(r=>!r.pass).length;
  return Object.freeze({pass:blockerCount===0,blockerCount,results:Object.freeze(results.map(Object.freeze))});
}
