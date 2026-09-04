function deepFreeze(value){if(value==null||typeof value!=='object'||Object.isFrozen(value))return value;for(const child of Object.values(value))deepFreeze(child);return Object.freeze(value);}
function position(value,name){if(!value||typeof value!=='object'||Array.isArray(value))throw new TypeError(`${name} must be a position object`);const x=Number(value.x),y=Number(value.y);if(!Number.isFinite(x)||!Number.isFinite(y))throw new TypeError(`${name}.x and ${name}.y must be finite`);return deepFreeze({x,y});}
function route(value){if(!value||value.kind!=='route'||!Array.isArray(value.waypoints))throw new TypeError('previousRoute must be a route contract');return deepFreeze({kind:'route',state:String(value.state),startPosition:position(value.startPosition,'previousRoute.startPosition'),targetPosition:position(value.targetPosition,'previousRoute.targetPosition'),waypoints:value.waypoints.map((p,i)=>position(p,`previousRoute.waypoints[${i}]`))});}
function recovery(value){if(!value||value.kind!=='controlled-recovery-result'||value.status!=='RECOVERED'||value.returnToTrafficControl!==true)throw new TypeError('recoveryResult must be a completed CR-17C recovery result');return value;}
export class RouteContinuationStateContract{
 static define({recoveryResult,previousRoute}={}){
  const recovered=recovery(recoveryResult),prior=route(previousRoute),current=position(recovered.currentCell,'recoveryResult.currentCell');
  return deepFreeze({kind:'route-continuation-state',status:'CONTINUATION_REQUIRED',carrierId:String(recovered.carrierId),currentRecoveryPosition:current,originalTransportTarget:prior.targetPosition,previousRoute:prior});
 }
}
