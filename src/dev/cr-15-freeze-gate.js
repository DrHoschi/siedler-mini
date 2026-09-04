import { runCr14FreezeGate } from './cr-14-freeze-gate.js';
import { runCr15aSelfTest } from './cr-15a-self-test.js';
import { runCr15bSelfTest } from './cr-15b-self-test.js';
import { runCr15cSelfTest } from './cr-15c-self-test.js';
import { RouteContract } from '../transport/route-contract.js';
import { CarrierMovementContract } from '../transport/carrier-movement-contract.js';
import { CellOccupancyContract } from '../transport/cell-occupancy-contract.js';
import { CarrierWaitingStateContract } from '../transport/carrier-waiting-state-contract.js';
import { WaitingEntryIntegration } from '../transport/waiting-entry-integration.js';

export function runCr15FreezeGate(){
  const results=[];
  const check=(name,fn)=>{try{results.push({name,pass:!!fn()});}catch(error){results.push({name,pass:false,error:String(error?.message||error)});}};

  const cr14=runCr14FreezeGate();
  const cr15a=runCr15aSelfTest();
  const cr15b=runCr15bSelfTest();
  const cr15c=runCr15cSelfTest();
  check('cr14-frozen-regression',()=>cr14.pass&&cr14.blockerCount===0);
  check('cr15a-regression',()=>cr15a.pass&&cr15a.blockerCount===0);
  check('cr15b-regression',()=>cr15b.pass&&cr15b.blockerCount===0);
  check('cr15c-regression',()=>cr15c.pass&&cr15c.blockerCount===0);

  const route=RouteContract.define({startPosition:{x:0,y:0},targetPosition:{x:2,y:0},waypoints:[{x:1,y:0}],state:'ACTIVE'});
  const free=CellOccupancyContract.define();
  const nextCell={x:1,y:0};
  const movementA=CarrierMovementContract.define({unitId:'unit:00000001',currentPosition:{x:0,y:0},state:'IDLE',targetPosition:null});
  const movementB=CarrierMovementContract.define({unitId:'unit:00000002',currentPosition:{x:0,y:0},state:'IDLE',targetPosition:null});
  const readyA=CarrierWaitingStateContract.define({carrierId:'unit:00000001'});
  const readyB=CarrierWaitingStateContract.define({carrierId:'unit:00000002'});

  check('initial-conflict-has-exactly-one-winner',()=>{
    const contenders=[{carrierId:'unit:00000001',waitingCycles:0},{carrierId:'unit:00000002',waitingCycles:0}];
    const a=WaitingEntryIntegration.advance({route,movement:movementA,nextCell,nextCellOccupancy:free,waitingState:readyA,waitingCycles:0,contenders,maxDistance:1});
    const b=WaitingEntryIntegration.advance({route,movement:movementB,nextCell,nextCellOccupancy:free,waitingState:readyB,waitingCycles:0,contenders,maxDistance:1});
    return Number(a.allowed)+Number(b.allowed)===1 && (!a.allowed?a.movement===movementA:true) && (!b.allowed?b.movement===movementB:true);
  });

  check('waiting-cycles-rise-reproducibly',()=>{
    const waitingB=CarrierWaitingStateContract.define({carrierId:'unit:00000002',state:'WAITING',reason:'ARBITRATION_LOST',nextCell});
    const args={route,movement:movementB,nextCell,nextCellOccupancy:free,waitingState:waitingB,waitingCycles:2,contenders:[{carrierId:'unit:00000001',waitingCycles:3},{carrierId:'unit:00000002',waitingCycles:2}],maxDistance:1};
    const a=WaitingEntryIntegration.advance(args);
    const b=WaitingEntryIntegration.advance(args);
    return !a.allowed&&a.waitingCycles===3&&JSON.stringify(a)===JSON.stringify(b);
  });

  check('longer-waiting-carrier-gets-priority',()=>{
    const waitingB=CarrierWaitingStateContract.define({carrierId:'unit:00000002',state:'WAITING',reason:'ARBITRATION_LOST',nextCell});
    const r=WaitingEntryIntegration.advance({route,movement:movementB,nextCell,nextCellOccupancy:free,waitingState:waitingB,waitingCycles:4,contenders:[{carrierId:'unit:00000001',waitingCycles:0},{carrierId:'unit:00000002',waitingCycles:4}],maxDistance:1});
    return r.allowed&&r.priority?.winnerCarrierId==='unit:00000002';
  });

  check('successful-entry-clears-waiting-completely',()=>{
    const waitingB=CarrierWaitingStateContract.define({carrierId:'unit:00000002',state:'WAITING',reason:'ARBITRATION_LOST',nextCell});
    const r=WaitingEntryIntegration.advance({route,movement:movementB,nextCell,nextCellOccupancy:free,waitingState:waitingB,waitingCycles:4,contenders:[{carrierId:'unit:00000002',waitingCycles:4}],maxDistance:1});
    return r.allowed&&!r.waiting&&r.waitingCycles===0&&r.waitingState.state==='READY'&&r.waitingState.reason===null&&r.waitingState.nextCell===null;
  });

  check('scope-has-no-deadlock-avoidance-reroute-or-reservation',()=>{
    const text=WaitingEntryIntegration.toString().toLowerCase();
    return !text.includes('deadlock')&&!text.includes('avoid')&&!text.includes('reroute')&&!text.includes('reservation');
  });

  const blockerCount=results.filter(r=>!r.pass).length;
  return Object.freeze({pass:blockerCount===0,blockerCount,results:Object.freeze(results.map(Object.freeze))});
}
