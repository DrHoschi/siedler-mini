import { RoadPreferenceCostPolicy } from '../transport/road-preference-cost-policy.js';
import { TraversalCostResolver } from '../transport/traversal-cost-resolver.js';

export function runCr11aSelfTest() {
  const results=[];
  const check=(name,fn)=>{try{results.push({name,pass:!!fn()});}catch(error){results.push({name,pass:false,error:String(error?.message||error)});}};
  const rejects=fn=>{try{fn();return false;}catch{return true;}};

  check('policy-defines-exact-road-preference-costs',()=>RoadPreferenceCostPolicy.resolve('NEUTRAL').traversalCost===1&&RoadPreferenceCostPolicy.resolve('PATH').traversalCost===0.75&&RoadPreferenceCostPolicy.resolve('ROAD').traversalCost===0.5);
  check('road-is-cheaper-than-path-and-path-cheaper-than-neutral',()=>RoadPreferenceCostPolicy.resolve('ROAD').traversalCost<RoadPreferenceCostPolicy.resolve('PATH').traversalCost&&RoadPreferenceCostPolicy.resolve('PATH').traversalCost<RoadPreferenceCostPolicy.resolve('NEUTRAL').traversalCost);
  check('policy-covers-exactly-cr10-traversal-types',()=>JSON.stringify(Object.keys(RoadPreferenceCostPolicy.profiles))===JSON.stringify(['NEUTRAL','PATH','ROAD']));
  check('policy-normalizes-traversal-type',()=>RoadPreferenceCostPolicy.resolve('road').traversalType==='ROAD');
  check('policy-rejects-unknown-traversal-type',()=>rejects(()=>RoadPreferenceCostPolicy.resolve('SWAMP')));
  check('policy-profiles-are-frozen',()=>Object.isFrozen(RoadPreferenceCostPolicy.profiles)&&Object.values(RoadPreferenceCostPolicy.profiles).every(Object.isFrozen));
  check('policy-resolution-is-deterministic',()=>RoadPreferenceCostPolicy.resolve('PATH')===RoadPreferenceCostPolicy.resolve('PATH'));
  check('policy-is-compatible-with-frozen-cr10c-resolver',()=>{const resolver=new TraversalCostResolver({profiles:RoadPreferenceCostPolicy.profiles});return ['NEUTRAL','PATH','ROAD'].every(type=>resolver.resolve({traversalType:type}).traversalCost===RoadPreferenceCostPolicy.resolve(type).traversalCost);});
  check('cr10c-default-remains-neutral-without-explicit-policy',()=>{const resolver=new TraversalCostResolver();return ['NEUTRAL','PATH','ROAD'].every(type=>resolver.resolve({traversalType:type}).traversalCost===1);});
  check('cr11a-adds-no-classification-source-or-routing-behavior',()=>typeof RoadPreferenceCostPolicy.profiles==='object'&&typeof RoadPreferenceCostPolicy.resolve==='function'&&!('typeAt' in RoadPreferenceCostPolicy)&&!('costAt' in RoadPreferenceCostPolicy));

  return Object.freeze({pass:results.every(r=>r.pass),results:Object.freeze(results.map(Object.freeze))});
}
