import { TraversalCostContract } from '../transport/traversal-cost-contract.js';

export function runCr10aSelfTest() {
  const results=[];
  const check=(name,fn)=>{try{results.push({name,pass:!!fn()});}catch(error){results.push({name,pass:false,error:String(error?.message||error)});}};
  const rejects=fn=>{try{fn();return false;}catch{return true;}};

  check('default-contract-is-neutral-cost-one',()=>{const c=TraversalCostContract.define();return c.traversalType==='NEUTRAL'&&c.baseCost===1&&c.costMultiplier===1&&c.traversalCost===1;});
  check('derived-cost-is-base-times-multiplier',()=>TraversalCostContract.define({baseCost:2,costMultiplier:1.5}).traversalCost===3);
  check('type-normalization-is-deterministic',()=>TraversalCostContract.define({traversalType:'road'}).traversalType==='ROAD');
  check('known-traversal-types-only',()=>TraversalCostContract.types.join('|')==='NEUTRAL|PATH|ROAD'&&rejects(()=>TraversalCostContract.define({traversalType:'SWAMP'})));
  check('base-cost-must-be-positive-finite',()=>rejects(()=>TraversalCostContract.define({baseCost:0}))&&rejects(()=>TraversalCostContract.define({baseCost:Infinity})));
  check('multiplier-must-be-positive-finite',()=>rejects(()=>TraversalCostContract.define({costMultiplier:0}))&&rejects(()=>TraversalCostContract.define({costMultiplier:NaN})));
  check('contract-is-deep-frozen',()=>{const c=TraversalCostContract.define({traversalType:'PATH'});return Object.isFrozen(c);});
  check('input-is-not-mutated',()=>{const input={baseCost:2,traversalType:'path',costMultiplier:0.75};const before=JSON.stringify(input);TraversalCostContract.define(input);return JSON.stringify(input)===before;});
  check('cr10a-has-no-position-or-pathfinding-fields',()=>{const s=JSON.stringify(TraversalCostContract.define({traversalType:'ROAD'})).toLowerCase();return !s.includes('position')&&!s.includes('waypoint')&&!s.includes('route')&&!s.includes('algorithm')&&!s.includes('obstacle');});
  check('cr10a-does-not-encode-road-preference-policy',()=>{const neutral=TraversalCostContract.define({traversalType:'NEUTRAL'});const road=TraversalCostContract.define({traversalType:'ROAD'});return neutral.traversalCost===road.traversalCost;});

  return Object.freeze({pass:results.every(r=>r.pass),results:Object.freeze(results.map(Object.freeze))});
}
