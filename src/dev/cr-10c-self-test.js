import { TraversalCostResolver } from '../transport/traversal-cost-resolver.js';
import { DeterministicCostAwarePathfinder } from '../transport/deterministic-cost-aware-pathfinder.js';

export function runCr10cSelfTest() {
  const results=[];
  const check=(name,fn)=>{try{results.push({name,pass:!!fn()});}catch(error){results.push({name,pass:false,error:String(error?.message||error)});}};
  const rejects=fn=>{try{fn();return false;}catch{return true;}};
  const map={contains:(x,y)=>Number.isInteger(x)&&Number.isInteger(y)&&x>=0&&y>=0&&x<4&&y<3};

  check('default-profiles-resolve-neutral-costs',()=>{const r=new TraversalCostResolver();return ['NEUTRAL','PATH','ROAD'].every(t=>r.resolve({traversalType:t}).traversalCost===1);});
  check('resolver-normalizes-type',()=>new TraversalCostResolver().resolve({traversalType:'road'}).traversalType==='ROAD');
  check('resolver-rejects-unknown-type',()=>rejects(()=>new TraversalCostResolver().resolve({traversalType:'SWAMP'})));
  check('explicit-profile-is-resolved-through-cr10a-contract',()=>{const r=new TraversalCostResolver({profiles:{PATH:{baseCost:2,costMultiplier:0.5}}});const c=r.resolve({traversalType:'PATH'});return c.baseCost===2&&c.costMultiplier===0.5&&c.traversalCost===1;});
  check('profile-type-cannot-be-remapped',()=>{const r=new TraversalCostResolver({profiles:{ROAD:{traversalType:'PATH',baseCost:3}}});return r.resolve({traversalType:'ROAD'}).traversalType==='ROAD';});
  check('cost-at-resolves-grid-cell-type',()=>{const r=new TraversalCostResolver({profiles:{PATH:{baseCost:0.5}}});const costAt=r.costAt({typeAt:({x,y})=>x===1&&y===0?'PATH':'NEUTRAL'});return costAt({x:1,y:0}).traversalCost===0.5&&costAt({x:0,y:0}).traversalCost===1;});
  check('cost-at-requires-type-provider',()=>rejects(()=>new TraversalCostResolver().costAt({})));
  check('resolved-contracts-are-frozen',()=>Object.isFrozen(new TraversalCostResolver().resolve({traversalType:'ROAD'})));
  check('no-automatic-road-preference',()=>{const r=new TraversalCostResolver();return r.resolve({traversalType:'ROAD'}).traversalCost===r.resolve({traversalType:'NEUTRAL'}).traversalCost;});
  check('resolver-can-feed-cr10b-pathfinder',()=>{const r=new TraversalCostResolver({profiles:{PATH:{baseCost:0.25}}});const typeAt=({x,y})=>y===1?'PATH':'NEUTRAL';const route=DeterministicCostAwarePathfinder.find({map,startPosition:{x:0,y:0},targetPosition:{x:3,y:0},costAt:r.costAt({typeAt})});return route.waypoints.some(p=>p.y===1);});
  check('resolver-input-policy-is-not-mutated',()=>{const profiles={PATH:{baseCost:0.5}};const before=JSON.stringify(profiles);new TraversalCostResolver({profiles});return JSON.stringify(profiles)===before;});
  check('cr10c-adds-no-obstacle-blocking-reroute-or-movement-policy',()=>{const text=JSON.stringify(new TraversalCostResolver().resolve({traversalType:'PATH'})).toLowerCase();return !text.includes('obstacle')&&!text.includes('blocked')&&!text.includes('reroute')&&!text.includes('movement');});

  return Object.freeze({pass:results.every(r=>r.pass),results:Object.freeze(results.map(Object.freeze))});
}
