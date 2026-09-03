import { runCr08aSelfTest } from './cr-08a-self-test.js';
import { runCr08bSelfTest } from './cr-08b-self-test.js';
import { runCr08cSelfTest } from './cr-08c-self-test.js';
import { MovementTransportExecutionIntegration } from '../transport/movement-transport-execution-integration.js';
import { PickupExecutionService } from '../transport/pickup-execution-service.js';
import { DeliveryExecutionService } from '../transport/delivery-execution-service.js';

export function runCr08FreezeGate() {
  const results=[];
  const check=(name,fn)=>{try{results.push({name,pass:!!fn()});}catch(error){results.push({name,pass:false,error:String(error?.message||error)});}};
  const rejects=fn=>{try{fn();return false;}catch{return true;}};

  const a=runCr08aSelfTest(), b=runCr08bSelfTest(), c=runCr08cSelfTest();
  check('cr08a-regression-pass',()=>a.pass);
  check('cr08b-regression-pass',()=>b.pass);
  check('cr08c-regression-pass',()=>c.pass);

  const pickupPosition={x:3,y:4};
  const dropoffPosition={x:10,y:4};
  const job=Object.freeze({id:'transport-job:00000001',kind:'transport-job',claimId:'claim:00000001',demandId:'demand:00000001',resourceId:'resource:00000001',definitionId:'resource-type:00000001',sourceLocation:{kind:'cell',refId:'cell:00000001'},targetId:'building:00000001',amount:3,status:'PENDING'});
  const assignment=Object.freeze({jobId:job.id,unitId:'unit:00000001'});
  const resource=Object.freeze({id:job.resourceId,kind:'resource',definitionId:job.definitionId,state:'RESERVED',amount:3,location:job.sourceLocation});
  const demand=Object.freeze({id:job.demandId,kind:'demand',consumerId:job.targetId,definitionId:job.definitionId,targetAmount:3,reservedAmount:3,fulfilledAmount:0,remainingAmount:0,status:'RESERVED'});
  const claim=Object.freeze({id:job.claimId,kind:'claim',demandId:job.demandId,resourceId:job.resourceId,consumerId:job.targetId,amount:3,state:'ACTIVE'});
  const toPickup=Object.freeze({kind:'transport-execution',jobId:job.id,unitId:assignment.unitId,state:'TO_PICKUP'});
  const initialMovement=Object.freeze({kind:'carrier-movement',unitId:assignment.unitId,state:'IDLE',currentPosition:{x:0,y:0},targetPosition:null});

  check('deterministic-direct-movement-is-repeatable',()=>{const x=MovementTransportExecutionIntegration.advance({execution:toPickup,movement:initialMovement,pickupPosition,dropoffPosition,maxDistance:2});const y=MovementTransportExecutionIntegration.advance({execution:toPickup,movement:initialMovement,pickupPosition,dropoffPosition,maxDistance:2});return JSON.stringify(x)===JSON.stringify(y);});
  check('arrival-snaps-exactly-without-overshoot',()=>{const m=MovementTransportExecutionIntegration.advance({execution:toPickup,movement:initialMovement,pickupPosition,dropoffPosition,maxDistance:99});return m.state==='IDLE'&&m.targetPosition===null&&m.currentPosition.x===3&&m.currentPosition.y===4;});
  check('pickup-is-impossible-before-arrival',()=>{const partial=MovementTransportExecutionIntegration.advance({execution:toPickup,movement:initialMovement,pickupPosition,dropoffPosition,maxDistance:2});return rejects(()=>MovementTransportExecutionIntegration.pickupAfterArrival({pickupService:new PickupExecutionService(),job,assignment,execution:toPickup,resource,movement:partial,pickupPosition,dropoffPosition}));});
  check('execution-state-selects-correct-target',()=>{const pickup=MovementTransportExecutionIntegration.movementForExecution({execution:toPickup,movement:initialMovement,pickupPosition,dropoffPosition});const toDropoff={...toPickup,state:'TO_DROPOFF'};const atPickup={...initialMovement,currentPosition:pickupPosition};const dropoff=MovementTransportExecutionIntegration.movementForExecution({execution:toDropoff,movement:atPickup,pickupPosition,dropoffPosition});return pickup.targetPosition.x===3&&pickup.targetPosition.y===4&&dropoff.targetPosition.x===10&&dropoff.targetPosition.y===4;});
  check('movement-layer-does-not-mutate-resource-claim-demand-assignment',()=>{const before=JSON.stringify({resource,claim,demand,assignment});const m=MovementTransportExecutionIntegration.advance({execution:toPickup,movement:initialMovement,pickupPosition,dropoffPosition,maxDistance:2});MovementTransportExecutionIntegration.movementForExecution({execution:toPickup,movement:m,pickupPosition,dropoffPosition});return JSON.stringify({resource,claim,demand,assignment})===before;});
  check('full-pickup-dropoff-chain-requires-both-arrivals',()=>{const pickupService=new PickupExecutionService();const deliveryService=new DeliveryExecutionService();const atPickup=MovementTransportExecutionIntegration.advance({execution:toPickup,movement:initialMovement,pickupPosition,dropoffPosition,maxDistance:5});const picked=MovementTransportExecutionIntegration.pickupAfterArrival({pickupService,job,assignment,execution:toPickup,resource,movement:atPickup,pickupPosition,dropoffPosition});const outbound=deliveryService.beginDropoff({job,assignment,execution:picked.execution,cargo:picked.cargo});const movingToDropoff=MovementTransportExecutionIntegration.movementForExecution({execution:outbound.execution,movement:atPickup,pickupPosition,dropoffPosition});const blocked=rejects(()=>MovementTransportExecutionIntegration.deliverAfterArrival({deliveryService,job,assignment,execution:outbound.execution,cargo:picked.cargo,movement:movingToDropoff,pickupPosition,dropoffPosition}));const atDropoff=MovementTransportExecutionIntegration.advance({execution:outbound.execution,movement:movingToDropoff,pickupPosition,dropoffPosition,maxDistance:7});const delivered=MovementTransportExecutionIntegration.deliverAfterArrival({deliveryService,job,assignment,execution:outbound.execution,cargo:picked.cargo,movement:atDropoff,pickupPosition,dropoffPosition});return blocked&&delivered.execution.state==='DELIVERED';});
  check('freeze-scope-adds-no-pathfinding-routing-road-or-obstacle-data',()=>{const m=MovementTransportExecutionIntegration.movementForExecution({execution:toPickup,movement:initialMovement,pickupPosition,dropoffPosition});const serialized=JSON.stringify({m,job,assignment,resource,claim,demand}).toLowerCase();return !serialized.includes('pathfinding')&&!serialized.includes('route')&&!serialized.includes('routing')&&!serialized.includes('road')&&!serialized.includes('obstacle');});

  const blockerCount=results.filter(r=>!r.pass).length;
  return Object.freeze({pass:blockerCount===0,blockerCount,results:Object.freeze(results.map(Object.freeze))});
}
