import { runCr18aSelfTest } from './cr-18a-self-test.js';
import { runCr18bSelfTest } from './cr-18b-self-test.js';
import { runCr18cSelfTest } from './cr-18c-self-test.js';
import { DeterministicRouteRejoinDecision } from '../transport/deterministic-route-rejoin-decision.js';
import { ControlledPostRecoveryRerouteIntegration } from '../transport/controlled-post-recovery-reroute-integration.js';

export function runCr18FreezeGate(){
 const results=[];const check=(name,fn)=>{try{results.push({name,pass:!!fn()});}catch(error){results.push({name,pass:false,error:String(error?.message||error)});}};
 const a=runCr18aSelfTest(),b=runCr18bSelfTest(),c=runCr18cSelfTest();
 check('cr18a-regression',()=>a.pass===true);
 check('cr18b-regression',()=>b.pass===true);
 check('cr18c-regression',()=>c.pass===true);
 const direct=Object.freeze({kind:'route-continuation-state',status:'CONTINUATION_REQUIRED',carrierId:'unit:00000002',currentRecoveryPosition:Object.freeze({x:1,y:1}),originalTransportTarget:Object.freeze({x:3,y:1}),previousRoute:Object.freeze({kind:'route',state:'ACTIVE',startPosition:{x:0,y:1},targetPosition:{x:3,y:1},waypoints:Object.freeze([{x:1,y:0},{x:2,y:1},{x:3,y:1}])})});
 check('direct-rejoin-path-stays-on-existing-route',()=>{const d=DeterministicRouteRejoinDecision.decide({continuationState:direct,isRejoinable:()=>true});return d.status==='REJOIN_EXISTING_ROUTE'&&d.rejoinWaypointIndex===0&&d.rejoinCell.x===1&&d.rejoinCell.y===0;});
 const reroute=Object.freeze({kind:'route-continuation-state',status:'CONTINUATION_REQUIRED',carrierId:'unit:00000002',currentRecoveryPosition:Object.freeze({x:0,y:0}),originalTransportTarget:Object.freeze({x:2,y:0}),previousRoute:Object.freeze({kind:'route',state:'ACTIVE',startPosition:{x:0,y:1},targetPosition:{x:2,y:0},waypoints:Object.freeze([{x:2,y:1}])})});
 check('reroute-required-path-replaces-route-and-returns-to-existing-chain',()=>{const d=DeterministicRouteRejoinDecision.decide({continuationState:reroute,isRejoinable:()=>true});if(d.status!=='REROUTE_REQUIRED')return false;const map={contains:(x,y)=>Number.isSafeInteger(x)&&Number.isSafeInteger(y)&&x>=0&&y>=0&&x<3&&y<2};const classificationSource={typeAt:()=> 'NEUTRAL'};const blockedCellSource={isTraversable:()=>true};const r=ControlledPostRecoveryRerouteIntegration.resolve({continuationState:reroute,rejoinDecision:d,map,classificationSource,blockedCellSource});return r.status==='ROUTE_REPLACED'&&r.route.startPosition.x===0&&r.route.startPosition.y===0&&r.route.targetPosition.x===2&&r.route.targetPosition.y===0&&r.returnToRouteExecution===true&&r.returnToTrafficControl===true;});
 check('cr18-freeze-boundary-preserves-transport-target-and-deadlock-recovery-policy',()=>{const text=(DeterministicRouteRejoinDecision.toString()+ControlledPostRecoveryRerouteIntegration.toString()).toLowerCase();return !text.includes('newtarget')&&!text.includes('highest_stable_id_yields')&&!text.includes('yieldingcarrierid')&&!text.includes('recovery-target-selection');});
 const blockerCount=results.filter(r=>!r.pass).length;return Object.freeze({pass:blockerCount===0,blockerCount,results:Object.freeze(results.map(Object.freeze))});
}
