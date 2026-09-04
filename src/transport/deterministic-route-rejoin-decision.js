function point(value,name){const x=Number(value?.x),y=Number(value?.y);if(!Number.isFinite(x)||!Number.isFinite(y))throw new TypeError(`${name}.x and ${name}.y must be finite`);return Object.freeze({x,y});}
function same(a,b){return a.x===b.x&&a.y===b.y;}
function assertContinuation(state){if(!state||state.kind!=='route-continuation-state'||state.status!=='CONTINUATION_REQUIRED'||!state.previousRoute||!Array.isArray(state.previousRoute.waypoints))throw new TypeError('continuationState must be CR-18A CONTINUATION_REQUIRED');}
export class DeterministicRouteRejoinDecision{
 static decide({continuationState,isRejoinable=()=>true}={}){
  assertContinuation(continuationState);if(typeof isRejoinable!=='function')throw new TypeError('isRejoinable must be a function');
  const current=point(continuationState.currentRecoveryPosition,'currentRecoveryPosition');
  const candidates=continuationState.previousRoute.waypoints.map((w,index)=>({index,cell:point(w,`waypoint[${index}]`)})).filter(x=>!same(x.cell,current)).filter(x=>Math.abs(x.cell.x-current.x)+Math.abs(x.cell.y-current.y)===1).filter(x=>isRejoinable(x.cell,x.index)===true).sort((a,b)=>a.index-b.index);
  if(candidates.length===0)return Object.freeze({kind:'route-rejoin-decision',status:'REROUTE_REQUIRED',carrierId:continuationState.carrierId,rejoinWaypointIndex:null,rejoinCell:null,policy:'EARLIEST_DIRECT_REJOIN_WAYPOINT'});
  const chosen=candidates[0];return Object.freeze({kind:'route-rejoin-decision',status:'REJOIN_EXISTING_ROUTE',carrierId:continuationState.carrierId,rejoinWaypointIndex:chosen.index,rejoinCell:chosen.cell,policy:'EARLIEST_DIRECT_REJOIN_WAYPOINT'});
 }
}
