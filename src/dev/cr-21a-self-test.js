import { NextCellReservationIntentContract } from '../transport/next-cell-reservation-intent-contract.js';

export function runCr21aSelfTest(){
 const results=[];
 const check=(name,fn)=>{try{results.push({name,pass:!!fn()});}catch(error){results.push({name,pass:false,error:String(error?.message||error)});}};
 const rejects=fn=>{try{fn();return false;}catch{return true;}};
 const route=(state='ACTIVE')=>({startPosition:{x:0,y:0},targetPosition:{x:3,y:0},waypoints:[{x:1,y:0},{x:2,y:0}],state});
 const define=(overrides={})=>NextCellReservationIntentContract.define({carrierId:'unit:00000002',route:route(),currentPosition:{x:1,y:0},nextCell:{x:2,y:0},...overrides});

 check('declares-exactly-one-immediate-next-route-cell',()=>{const intent=define();return intent.kind==='next-cell-reservation-intent'&&intent.status==='DECLARED'&&intent.carrierId==='unit:00000002'&&intent.currentPosition.x===1&&intent.currentPosition.y===0&&intent.nextCell.x===2&&intent.nextCell.y===0&&!Array.isArray(intent.nextCell);});
 check('route-start-can-declare-first-route-cell',()=>{const intent=define({currentPosition:{x:0,y:0},nextCell:{x:1,y:0}});return intent.nextCell.x===1&&intent.nextCell.y===0;});
 check('last-waypoint-can-declare-final-target-cell',()=>{const intent=define({currentPosition:{x:2,y:0},nextCell:{x:3,y:0}});return intent.nextCell.x===3&&intent.nextCell.y===0;});
 check('direct-route-declares-target-as-next-cell',()=>{const intent=define({route:{startPosition:{x:0,y:0},targetPosition:{x:1,y:0},waypoints:[],state:'DEFINED'},currentPosition:{x:0,y:0},nextCell:{x:1,y:0}});return intent.nextCell.x===1&&intent.nextCell.y===0;});
 check('cannot-skip-a-route-cell',()=>rejects(()=>define({currentPosition:{x:0,y:0},nextCell:{x:2,y:0}})));
 check('current-position-must-be-reached-route-point',()=>rejects(()=>define({currentPosition:{x:1,y:1},nextCell:{x:2,y:0}})));
 check('route-target-cannot-declare-another-cell',()=>rejects(()=>define({currentPosition:{x:3,y:0},nextCell:{x:4,y:0}})));
 check('completed-route-cannot-declare-intent',()=>rejects(()=>define({route:route('COMPLETED')})));
 check('carrier-and-cell-identifiers-are-strict',()=>rejects(()=>define({carrierId:'carrier-2'}))&&rejects(()=>define({nextCell:{x:2.5,y:0}})));
 check('intent-and-nested-data-are-immutable',()=>{const intent=define();return Object.isFrozen(intent)&&Object.isFrozen(intent.route)&&Object.isFrozen(intent.route.waypoints)&&Object.isFrozen(intent.currentPosition)&&Object.isFrozen(intent.nextCell);});
 check('cr21a-creates-no-reservation-arbitration-movement-or-lookahead-behavior',()=>{const intent=define();const text=NextCellReservationIntentContract.toString().toLowerCase();return !('reservation' in intent)&&!('reservations' in intent)&&!('winner' in intent)&&!('movement' in intent)&&!('lookahead' in intent)&&!text.includes('arbitrat')&&!text.includes('winner')&&!text.includes('cellreservationcontract')&&!text.includes('move(')&&!text.includes('advance(')&&!text.includes('pathfind')&&!text.includes('rerout');});

 const blockerCount=results.filter(r=>!r.pass).length;
 return Object.freeze({pass:blockerCount===0,blockerCount,results:Object.freeze(results.map(Object.freeze))});
}
