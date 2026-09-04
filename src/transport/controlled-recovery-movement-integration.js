import { CarrierMovementContract } from './carrier-movement-contract.js';

function point(value,name){const x=Number(value?.x),y=Number(value?.y);if(!Number.isSafeInteger(x)||!Number.isSafeInteger(y))throw new TypeError(`${name} x/y must be safe integers`);return Object.freeze({x,y});}
function same(a,b){return a.x===b.x&&a.y===b.y;}
function assertIntent(intent){if(!intent||intent.kind!=='yield-recovery-intent'||intent.status!=='PENDING')throw new TypeError('recoveryIntent must be CR-17A PENDING');}
function assertSelection(selection,intent){if(!selection||selection.kind!=='recovery-target-selection'||selection.status!=='SELECTED'||!selection.targetCell)throw new TypeError('targetSelection must be CR-17B SELECTED');if(selection.carrierId!==intent.carrierId)throw new TypeError('targetSelection carrier must match recoveryIntent');}

export class ControlledRecoveryMovementIntegration {
  static begin({recoveryIntent,targetSelection,currentCell}={}){
    assertIntent(recoveryIntent);assertSelection(targetSelection,recoveryIntent);
    const current=point(currentCell,'currentCell'),target=point(targetSelection.targetCell,'targetCell');
    const distance=Math.abs(current.x-target.x)+Math.abs(current.y-target.y);
    if(distance!==1)throw new Error('CR-17C recovery movement requires exactly one cardinal step');
    const movement=CarrierMovementContract.define({unitId:recoveryIntent.carrierId,currentPosition:current,state:'MOVING',targetPosition:target});
    return Object.freeze({kind:'controlled-recovery-movement',status:'MOVING',carrierId:recoveryIntent.carrierId,fromCell:current,targetCell:target,movement});
  }

  static complete({recoveryMovement,reachedCell}={}){
    if(!recoveryMovement||recoveryMovement.kind!=='controlled-recovery-movement'||recoveryMovement.status!=='MOVING')throw new TypeError('recoveryMovement must be CR-17C MOVING');
    const reached=point(reachedCell,'reachedCell');
    if(!same(reached,recoveryMovement.targetCell))throw new Error('recovery movement can complete only at selected targetCell');
    const movement=CarrierMovementContract.define({unitId:recoveryMovement.carrierId,currentPosition:reached,state:'IDLE'});
    return Object.freeze({kind:'controlled-recovery-result',status:'RECOVERED',carrierId:recoveryMovement.carrierId,currentCell:reached,releaseWaitDependency:true,returnToTrafficControl:true,movement});
  }
}
