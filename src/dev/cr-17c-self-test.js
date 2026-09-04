import { ControlledRecoveryMovementIntegration } from '../transport/controlled-recovery-movement-integration.js';

export function runCr17cSelfTest(){
 const results=[];const check=(name,fn)=>{try{results.push({name,pass:!!fn()});}catch(error){results.push({name,pass:false,error:String(error?.message||error)});}};const rejects=fn=>{try{fn();return false;}catch{return true;}};
 const intent=Object.freeze({kind:'yield-recovery-intent',carrierId:'unit:00000002',status:'PENDING'});
 const selection=Object.freeze({kind:'recovery-target-selection',status:'SELECTED',carrierId:'unit:00000002',targetCell:Object.freeze({x:1,y:2}),policy:'LOCAL_FREE_CARDINAL_XY_ASC'});
 check('begins-only-to-preselected-cr17b-target',()=>{const r=ControlledRecoveryMovementIntegration.begin({recoveryIntent:intent,targetSelection:selection,currentCell:{x:2,y:2}});return r.status==='MOVING'&&r.targetCell.x===1&&r.targetCell.y===2&&r.movement.state==='MOVING';});
 check('rejects-nonlocal-or-mismatched-target',()=>rejects(()=>ControlledRecoveryMovementIntegration.begin({recoveryIntent:intent,targetSelection:{...selection,targetCell:{x:0,y:2}},currentCell:{x:2,y:2}}))&&rejects(()=>ControlledRecoveryMovementIntegration.begin({recoveryIntent:intent,targetSelection:{...selection,carrierId:'unit:00000003'},currentCell:{x:2,y:2}})));
 check('completion-requires-selected-cell',()=>{const r=ControlledRecoveryMovementIntegration.begin({recoveryIntent:intent,targetSelection:selection,currentCell:{x:2,y:2}});return rejects(()=>ControlledRecoveryMovementIntegration.complete({recoveryMovement:r,reachedCell:{x:2,y:1}}));});
 check('completion-releases-wait-and-returns-to-existing-traffic-control',()=>{const r=ControlledRecoveryMovementIntegration.begin({recoveryIntent:intent,targetSelection:selection,currentCell:{x:2,y:2}});const done=ControlledRecoveryMovementIntegration.complete({recoveryMovement:r,reachedCell:{x:1,y:2}});return done.status==='RECOVERED'&&done.releaseWaitDependency===true&&done.returnToTrafficControl===true&&done.movement.state==='IDLE'&&done.movement.targetPosition===null;});
 check('cr17c-does-not-select-target-or-reroute',()=>{const text=ControlledRecoveryMovementIntegration.toString().toLowerCase();return !text.includes('pathfind')&&!text.includes('reroute')&&!text.includes('candidate')&&!text.includes('isTraversable'.toLowerCase())&&!text.includes('occupancyat');});
 const blockerCount=results.filter(r=>!r.pass).length;return Object.freeze({pass:blockerCount===0,blockerCount,results:Object.freeze(results.map(Object.freeze))});
}
