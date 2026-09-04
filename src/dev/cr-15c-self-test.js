import { RouteContract } from '../transport/route-contract.js';
import { CarrierMovementContract } from '../transport/carrier-movement-contract.js';
import { CellOccupancyContract } from '../transport/cell-occupancy-contract.js';
import { CarrierWaitingStateContract } from '../transport/carrier-waiting-state-contract.js';
import { WaitingEntryIntegration } from '../transport/waiting-entry-integration.js';

export function runCr15cSelfTest(){
  const results=[];
  const check=(name,fn)=>{try{results.push({name,pass:!!fn()});}catch(error){results.push({name,pass:false,error:String(error?.message||error)});}};
  const route=RouteContract.define({startPosition:{x:0,y:0},targetPosition:{x:2,y:0},waypoints:[{x:1,y:0}],state:'ACTIVE'});
  const movement=CarrierMovementContract.define({unitId:'unit:00000002',currentPosition:{x:0,y:0},state:'IDLE',targetPosition:null});
  const ready=CarrierWaitingStateContract.define({carrierId:'unit:00000002'});
  const free=CellOccupancyContract.define();
  const occupied=CellOccupancyContract.define({state:'OCCUPIED',carrierId:'unit:00000003'});
  const nextCell={x:1,y:0};

  check('loser-becomes-waiting-and-cycle-increments',()=>{
    const r=WaitingEntryIntegration.advance({route,movement,nextCell,nextCellOccupancy:free,waitingState:ready,waitingCycles:0,contenders:[{carrierId:'unit:00000001',waitingCycles:0},{carrierId:'unit:00000002',waitingCycles:0}],maxDistance:1});
    return !r.allowed&&r.waiting&&r.waitingCycles===1&&r.waitingState.state==='WAITING'&&r.waitingState.reason==='ARBITRATION_LOST'&&r.movement===movement;
  });

  check('previous-waiting-outranks-new-arrival',()=>{
    const waiting=CarrierWaitingStateContract.define({carrierId:'unit:00000002',state:'WAITING',reason:'ARBITRATION_LOST',nextCell});
    const r=WaitingEntryIntegration.advance({route,movement,nextCell,nextCellOccupancy:free,waitingState:waiting,waitingCycles:2,contenders:[{carrierId:'unit:00000001',waitingCycles:0},{carrierId:'unit:00000002',waitingCycles:2}],maxDistance:1});
    return r.allowed&&r.priority?.winnerCarrierId==='unit:00000002'&&r.waitingCycles===0&&r.waitingState.state==='READY'&&r.movement.currentPosition.x===1;
  });

  check('occupied-cell-keeps-carrier-waiting-and-increments-cycle',()=>{
    const r=WaitingEntryIntegration.advance({route,movement,nextCell,nextCellOccupancy:occupied,waitingState:ready,waitingCycles:1,contenders:[{carrierId:'unit:00000002',waitingCycles:1}],maxDistance:1});
    return !r.allowed&&r.waiting&&r.waitingCycles===2&&r.waitingState.reason==='OCCUPIED'&&r.movement===movement;
  });

  check('successful-entry-clears-waiting-state-and-cycles',()=>{
    const waiting=CarrierWaitingStateContract.define({carrierId:'unit:00000002',state:'WAITING',reason:'OCCUPIED',nextCell});
    const r=WaitingEntryIntegration.advance({route,movement,nextCell,nextCellOccupancy:free,waitingState:waiting,waitingCycles:3,contenders:[{carrierId:'unit:00000002',waitingCycles:3}],maxDistance:1});
    return r.allowed&&!r.waiting&&r.waitingCycles===0&&r.waitingState.state==='READY'&&r.waitingState.reason===null&&r.waitingState.nextCell===null;
  });

  check('same-input-is-deterministic',()=>{
    const args={route,movement,nextCell,nextCellOccupancy:free,waitingState:ready,waitingCycles:1,contenders:[{carrierId:'unit:00000002',waitingCycles:1},{carrierId:'unit:00000003',waitingCycles:0}],maxDistance:1};
    return JSON.stringify(WaitingEntryIntegration.advance(args))===JSON.stringify(WaitingEntryIntegration.advance(args));
  });

  check('integration-adds-no-deadlock-reroute-avoidance-or-reservation',()=>{
    const text=WaitingEntryIntegration.toString().toLowerCase();
    return !text.includes('deadlock')&&!text.includes('reroute')&&!text.includes('avoid')&&!text.includes('reservation');
  });

  const blockerCount=results.filter(r=>!r.pass).length;
  return Object.freeze({pass:blockerCount===0,blockerCount,results:Object.freeze(results.map(Object.freeze))});
}
