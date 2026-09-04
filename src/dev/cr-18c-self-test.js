import { ControlledPostRecoveryRerouteIntegration } from '../transport/controlled-post-recovery-reroute-integration.js';

export function runCr18cSelfTest(){
 const results=[];const check=(name,fn)=>{try{results.push({name,pass:!!fn()});}catch(error){results.push({name,pass:false,error:String(error?.message||error)});}};const rejects=fn=>{try{fn();return false;}catch{return true;}};
 const continuation=Object.freeze({kind:'route-continuation-state',status:'CONTINUATION_REQUIRED',carrierId:'unit:00000002',currentRecoveryPosition:Object.freeze({x:0,y:0}),originalTransportTarget:Object.freeze({x:2,y:0}),previousRoute:Object.freeze({kind:'route',state:'ACTIVE',startPosition:{x:0,y:1},targetPosition:{x:2,y:0},waypoints:[]})});
 const decision=Object.freeze({kind:'route-rejoin-decision',status:'REROUTE_REQUIRED',carrierId:'unit:00000002',rejoinWaypointIndex:null,rejoinCell:null,policy:'EARLIEST_DIRECT_REJOIN_WAYPOINT'});
 const map={contains:(x,y)=>Number.isSafeInteger(x)&&Number.isSafeInteger(y)&&x>=0&&y>=0&&x<3&&y<2};
 const classificationSource={typeAt:()=> 'NEUTRAL'};
 const blockedCellSource={isTraversable:()=>true};
 check('reroutes-only-from-recovery-position-to-original-target',()=>{const r=ControlledPostRecoveryRerouteIntegration.resolve({continuationState:continuation,rejoinDecision:decision,map,classificationSource,blockedCellSource});return r.status==='ROUTE_REPLACED'&&r.route.startPosition.x===0&&r.route.startPosition.y===0&&r.route.targetPosition.x===2&&r.route.targetPosition.y===0;});
 check('returns-route-to-existing-execution-and-traffic-control',()=>{const r=ControlledPostRecoveryRerouteIntegration.resolve({continuationState:continuation,rejoinDecision:decision,map,classificationSource,blockedCellSource});return r.returnToRouteExecution===true&&r.returnToTrafficControl===true;});
 check('rejects-non-reroute-rejoin-decision',()=>rejects(()=>ControlledPostRecoveryRerouteIntegration.resolve({continuationState:continuation,rejoinDecision:{...decision,status:'REJOIN_EXISTING_ROUTE'},map,classificationSource,blockedCellSource})));
 check('rejects-carrier-mismatch',()=>rejects(()=>ControlledPostRecoveryRerouteIntegration.resolve({continuationState:continuation,rejoinDecision:{...decision,carrierId:'unit:00000003'},map,classificationSource,blockedCellSource})));
 check('cr18c-does-not-select-new-transport-target-or-change-deadlock-policy',()=>{const text=ControlledPostRecoveryRerouteIntegration.toString().toLowerCase();return !text.includes('newtarget')&&!text.includes('highest_stable_id_yields')&&!text.includes('yieldingcarrierid')&&!text.includes('recovery-target-selection');});
 const blockerCount=results.filter(r=>!r.pass).length;return Object.freeze({pass:blockerCount===0,blockerCount,results:Object.freeze(results.map(Object.freeze))});
}
