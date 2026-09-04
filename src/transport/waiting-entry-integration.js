import { CarrierWaitingStateContract } from './carrier-waiting-state-contract.js';
import { DeterministicWaitPriorityPolicy } from './deterministic-wait-priority-policy.js';
import { OccupancyAwareMovementIntegration } from './occupancy-aware-movement-integration.js';

function asCycles(value) {
  const cycles=Number(value ?? 0);
  if(!Number.isSafeInteger(cycles)||cycles<0) throw new TypeError('waitingCycles must be a non-negative safe integer');
  return cycles;
}

function sameCell(a,b){return !!a&&!!b&&a.x===b.x&&a.y===b.y;}

export class WaitingEntryIntegration {
  static advance({ route, movement, nextCell, nextCellOccupancy, contenders=[], waitingState, waitingCycles=0, maxDistance }={}) {
    const currentCycles=asCycles(waitingCycles);
    const state=waitingState ?? CarrierWaitingStateContract.define({carrierId:movement?.unitId,state:'READY'});
    const normalizedState=CarrierWaitingStateContract.define({carrierId:state.carrierId,state:state.state,reason:state.reason,nextCell:state.nextCell});
    if(normalizedState.carrierId!==movement?.unitId) throw new Error('waitingState carrierId must match movement unitId');

    const normalizedContenders=contenders.map(entry=>Object.freeze({carrierId:entry.carrierId,waitingCycles:asCycles(entry.waitingCycles)}));
    if(!normalizedContenders.some(entry=>entry.carrierId===movement.unitId)) normalizedContenders.push(Object.freeze({carrierId:movement.unitId,waitingCycles:currentCycles}));

    let priority=null;
    if(normalizedContenders.length>1){
      priority=DeterministicWaitPriorityPolicy.decide({contenders:normalizedContenders});
      if(priority.winnerCarrierId!==movement.unitId){
        return Object.freeze({
          allowed:false,
          waiting:true,
          priority,
          movement,
          waitingCycles:currentCycles+1,
          waitingState:CarrierWaitingStateContract.define({carrierId:movement.unitId,state:'WAITING',reason:'ARBITRATION_LOST',nextCell})
        });
      }
    }

    const result=OccupancyAwareMovementIntegration.advance({
      route,
      movement,
      nextCellOccupancy,
      contenderCarrierIds:[movement.unitId],
      maxDistance
    });

    if(!result.allowed){
      const reason=result.arbitration?'ARBITRATION_LOST':'OCCUPIED';
      return Object.freeze({
        allowed:false,
        waiting:true,
        priority,
        movement:result.movement,
        waitingCycles:currentCycles+1,
        waitingState:CarrierWaitingStateContract.define({carrierId:movement.unitId,state:'WAITING',reason,nextCell})
      });
    }

    return Object.freeze({
      allowed:true,
      waiting:false,
      priority,
      movement:result.movement,
      waitingCycles:0,
      waitingState:CarrierWaitingStateContract.define({carrierId:movement.unitId,state:'READY'})
    });
  }
}
