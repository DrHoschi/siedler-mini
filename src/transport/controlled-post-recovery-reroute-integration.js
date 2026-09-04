import { ObstacleAwareRoutingIntegration } from './obstacle-aware-routing-integration.js';

function assertContinuation(state){if(!state||state.kind!=='route-continuation-state'||state.status!=='CONTINUATION_REQUIRED')throw new TypeError('continuationState must be CR-18A CONTINUATION_REQUIRED');}
function assertDecision(decision,carrierId){if(!decision||decision.kind!=='route-rejoin-decision'||decision.status!=='REROUTE_REQUIRED')throw new TypeError('rejoinDecision must be CR-18B REROUTE_REQUIRED');if(decision.carrierId!==carrierId)throw new TypeError('rejoinDecision carrier must match continuationState');}

export class ControlledPostRecoveryRerouteIntegration{
 static resolve({continuationState,rejoinDecision,map,classificationSource,blockedCellSource}={}){
  assertContinuation(continuationState);assertDecision(rejoinDecision,continuationState.carrierId);
  const route=ObstacleAwareRoutingIntegration.find({
   map,
   startPosition:continuationState.currentRecoveryPosition,
   targetPosition:continuationState.originalTransportTarget,
   classificationSource,
   blockedCellSource
  });
  return Object.freeze({kind:'post-recovery-reroute-result',status:'ROUTE_REPLACED',carrierId:continuationState.carrierId,route,returnToRouteExecution:true,returnToTrafficControl:true});
 }
}
