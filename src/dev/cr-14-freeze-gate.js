import { runCr13FreezeGate } from './cr-13-freeze-gate.js';
import { runCr14aSelfTest } from './cr-14a-self-test.js';
import { runCr14bSelfTest } from './cr-14b-self-test.js';
import { runCr14cSelfTest } from './cr-14c-self-test.js';
import { RouteContract } from '../transport/route-contract.js';
import { CarrierMovementContract } from '../transport/carrier-movement-contract.js';
import { CellOccupancyContract } from '../transport/cell-occupancy-contract.js';
import { OccupancyAwareMovementIntegration } from '../transport/occupancy-aware-movement-integration.js';

export function runCr14FreezeGate() {
  const results=[];
  const check=(name,fn)=>{try{results.push({name,pass:!!fn()});}catch(error){results.push({name,pass:false,error:String(error?.message||error)});}};

  check('cr13-freeze-regression-pass',()=>runCr13FreezeGate().pass);
  check('cr14a-regression-pass',()=>runCr14aSelfTest().pass);
  check('cr14b-regression-pass',()=>runCr14bSelfTest().pass);
  check('cr14c-regression-pass',()=>runCr14cSelfTest().pass);

  const carrierA='unit:00000001';
  const carrierB='unit:00000002';
  const target={x:1,y:1};
  const routeA=RouteContract.define({startPosition:{x:0,y:1},targetPosition:target,waypoints:[],state:'ACTIVE'});
  const routeB=RouteContract.define({startPosition:{x:1,y:0},targetPosition:target,waypoints:[],state:'ACTIVE'});
  const movementA=CarrierMovementContract.define({unitId:carrierA,currentPosition:{x:0,y:1},state:'IDLE',targetPosition:null});
  const movementB=CarrierMovementContract.define({unitId:carrierB,currentPosition:{x:1,y:0},state:'IDLE',targetPosition:null});
  const free=CellOccupancyContract.define();
  const contenders=[carrierB,carrierA];

  check('competing-entry-has-exactly-one-winner-and-one-waiter',()=>{
    const a=OccupancyAwareMovementIntegration.advance({route:routeA,movement:movementA,nextCellOccupancy:free,contenderCarrierIds:contenders,maxDistance:1});
    const b=OccupancyAwareMovementIntegration.advance({route:routeB,movement:movementB,nextCellOccupancy:free,contenderCarrierIds:contenders,maxDistance:1});
    const entered=[a,b].filter(r=>r.allowed&&!r.waiting&&r.movement.currentPosition.x===target.x&&r.movement.currentPosition.y===target.y);
    const waiting=[a,b].filter(r=>!r.allowed&&r.waiting);
    return entered.length===1&&waiting.length===1&&entered[0].movement.unitId===carrierA;
  });

  check('occupied-cell-reliably-blocks-other-carrier',()=>{
    const occupied=CellOccupancyContract.define({state:'OCCUPIED',carrierId:carrierA});
    const result=OccupancyAwareMovementIntegration.advance({route:routeB,movement:movementB,nextCellOccupancy:occupied,contenderCarrierIds:[carrierB],maxDistance:1});
    return result.allowed===false&&result.waiting===true&&result.arbitration===null&&result.movement===movementB;
  });

  check('arbitration-is-reproducible-independent-of-contender-order',()=>{
    const first=OccupancyAwareMovementIntegration.advance({route:routeA,movement:movementA,nextCellOccupancy:free,contenderCarrierIds:[carrierB,carrierA],maxDistance:1});
    const second=OccupancyAwareMovementIntegration.advance({route:routeA,movement:movementA,nextCellOccupancy:free,contenderCarrierIds:[carrierA,carrierB],maxDistance:1});
    return first.arbitration?.winnerCarrierId===carrierA&&second.arbitration?.winnerCarrierId===carrierA&&JSON.stringify(first.movement)===JSON.stringify(second.movement);
  });

  check('loser-remains-positionally-unchanged',()=>{
    const result=OccupancyAwareMovementIntegration.advance({route:routeB,movement:movementB,nextCellOccupancy:free,contenderCarrierIds:contenders,maxDistance:1});
    return result.allowed===false&&result.waiting===true&&result.movement===movementB&&result.movement.currentPosition.x===1&&result.movement.currentPosition.y===0;
  });

  check('single-carrier-free-cell-behavior-remains-normal',()=>{
    const result=OccupancyAwareMovementIntegration.advance({route:routeA,movement:movementA,nextCellOccupancy:free,contenderCarrierIds:[carrierA],maxDistance:1});
    return result.allowed===true&&!result.waiting&&result.movement.currentPosition.x===target.x&&result.movement.currentPosition.y===target.y;
  });

  check('freeze-scope-has-no-queue-fairness-deadlock-reservation-or-carrier-reroute',()=>{
    const text=OccupancyAwareMovementIntegration.toString().toLowerCase();
    return !text.includes('queue')&&!text.includes('fairness')&&!text.includes('deadlock')&&!text.includes('reservation')&&!text.includes('reroute');
  });

  const blockerCount=results.filter(r=>!r.pass).length;
  return Object.freeze({pass:blockerCount===0,blockerCount,results:Object.freeze(results.map(Object.freeze))});
}
