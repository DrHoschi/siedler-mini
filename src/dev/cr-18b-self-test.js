import { RouteContract } from '../transport/route-contract.js';
import { RouteContinuationStateContract } from '../transport/route-continuation-state-contract.js';
import { DeterministicRouteRejoinDecision } from '../transport/deterministic-route-rejoin-decision.js';
export function runCr18bSelfTest(){const results=[];const check=(name,fn)=>{try{results.push({name,pass:!!fn()});}catch(error){results.push({name,pass:false,error:String(error?.message||error)});}};
 const route=RouteContract.define({startPosition:{x:0,y:0},targetPosition:{x:4,y:0},waypoints:[{x:1,y:0},{x:2,y:0},{x:3,y:0},{x:4,y:0}],state:'ACTIVE'});
 const recovered=Object.freeze({kind:'controlled-recovery-result',status:'RECOVERED',carrierId:'unit:00000002',currentCell:Object.freeze({x:2,y:1}),releaseWaitDependency:true,returnToTrafficControl:true});
 const state=RouteContinuationStateContract.define({recoveryResult:recovered,previousRoute:route});
 check('selects-earliest-direct-rejoin-waypoint',()=>{const d=DeterministicRouteRejoinDecision.decide({continuationState:state});return d.status==='REJOIN_EXISTING_ROUTE'&&d.rejoinWaypointIndex===1&&d.rejoinCell.x===2&&d.rejoinCell.y===0;});
 check('rejoinability-filter-is-respected-deterministically',()=>{const d=DeterministicRouteRejoinDecision.decide({continuationState:state,isRejoinable:(cell,index)=>index!==1});return d.status==='REROUTE_REQUIRED'&&d.rejoinCell===null;});
 check('nonadjacent-rest-route-requires-reroute',()=>{const farRecovered={...recovered,currentCell:{x:0,y:3}};const far=RouteContinuationStateContract.define({recoveryResult:farRecovered,previousRoute:route});const d=DeterministicRouteRejoinDecision.decide({continuationState:far});return d.status==='REROUTE_REQUIRED'&&d.rejoinWaypointIndex===null;});
 check('decision-is-stable',()=>JSON.stringify(DeterministicRouteRejoinDecision.decide({continuationState:state}))===JSON.stringify(DeterministicRouteRejoinDecision.decide({continuationState:state})));
 check('cr18b-does-not-calculate-route-or-move-carrier',()=>{const text=DeterministicRouteRejoinDecision.toString().toLowerCase();return !text.includes('pathfind')&&!text.includes('new route')&&!text.includes('move(')&&!text.includes('carrierMovement'.toLowerCase());});
 const blockerCount=results.filter(r=>!r.pass).length;return Object.freeze({pass:blockerCount===0,blockerCount,results:Object.freeze(results.map(Object.freeze))});}
