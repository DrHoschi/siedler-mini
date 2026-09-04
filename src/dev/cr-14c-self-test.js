import { RouteContract } from '../transport/route-contract.js';
import { CarrierMovementContract } from '../transport/carrier-movement-contract.js';
import { CellOccupancyContract } from '../transport/cell-occupancy-contract.js';
import { OccupancyAwareMovementIntegration } from '../transport/occupancy-aware-movement-integration.js';

export function runCr14cSelfTest() {
  const results=[];
  const check=(name,fn)=>{try{results.push({name,pass:!!fn()});}catch(error){results.push({name,pass:false,error:String(error?.message||error)});}};

  const route=RouteContract.define({startPosition:{x:0,y:0},targetPosition:{x:2,y:0},waypoints:[{x:1,y:0}],state:'ACTIVE'});
  const movementA=CarrierMovementContract.define({unitId:'carrier-a',currentPosition:{x:0,y:0},state:'IDLE',targetPosition:null});
  const movementB=CarrierMovementContract.define({unitId:'carrier-b',currentPosition:{x:0,y:1},state:'IDLE',targetPosition:null});

  check('free-cell-single-carrier-enters',()=>{
    const result=OccupancyAwareMovementIntegration.advance({route,movement:movementA,nextCellOccupancy:CellOccupancyContract.define(),contenderCarrierIds:['carrier-a'],maxDistance:1});
    return result.allowed===true&&result.waiting===false&&result.movement.currentPosition.x===1&&result.movement.currentPosition.y===0;
  });

  check('occupied-by-other-carrier-causes-wait',()=>{
    const result=OccupancyAwareMovementIntegration.advance({route,movement:movementA,nextCellOccupancy:CellOccupancyContract.define({state:'OCCUPIED',carrierId:'carrier-b'}),contenderCarrierIds:['carrier-a'],maxDistance:1});
    return result.allowed===false&&result.waiting===true&&result.arbitration===null&&result.movement===movementA;
  });

  check('arbitration-winner-enters',()=>{
    const result=OccupancyAwareMovementIntegration.advance({route,movement:movementA,nextCellOccupancy:CellOccupancyContract.define(),contenderCarrierIds:['carrier-b','carrier-a'],maxDistance:1});
    return result.allowed===true&&result.arbitration?.winnerCarrierId==='carrier-a'&&result.movement.currentPosition.x===1;
  });

  check('arbitration-loser-waits',()=>{
    const routeB=RouteContract.define({startPosition:{x:0,y:1},targetPosition:{x:1,y:0},waypoints:[{x:1,y:1}],state:'ACTIVE'});
    const result=OccupancyAwareMovementIntegration.advance({route:routeB,movement:movementB,nextCellOccupancy:CellOccupancyContract.define(),contenderCarrierIds:['carrier-b','carrier-a'],maxDistance:1});
    return result.allowed===false&&result.waiting===true&&result.arbitration?.winnerCarrierId==='carrier-a'&&result.movement===movementB;
  });

  check('one-check-never-crosses-more-than-next-route-cell',()=>{
    const result=OccupancyAwareMovementIntegration.advance({route,movement:movementA,nextCellOccupancy:CellOccupancyContract.define(),contenderCarrierIds:['carrier-a'],maxDistance:10});
    return result.movement.currentPosition.x===1&&result.movement.currentPosition.y===0;
  });

  check('same-input-is-deterministic',()=>{
    const args={route,movement:movementA,nextCellOccupancy:CellOccupancyContract.define(),contenderCarrierIds:['carrier-b','carrier-a'],maxDistance:1};
    return JSON.stringify(OccupancyAwareMovementIntegration.advance(args))===JSON.stringify(OccupancyAwareMovementIntegration.advance(args));
  });

  check('integration-adds-no-rerouting-queue-deadlock-or-reservation',()=>{
    const text=OccupancyAwareMovementIntegration.toString().toLowerCase();
    return !text.includes('reroute')&&!text.includes('queue')&&!text.includes('fairness')&&!text.includes('deadlock')&&!text.includes('reservation');
  });

  const blockerCount=results.filter(r=>!r.pass).length;
  return Object.freeze({pass:blockerCount===0,blockerCount,results:Object.freeze(results.map(Object.freeze))});
}
