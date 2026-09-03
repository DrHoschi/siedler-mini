import { TraversabilityContract } from '../transport/traversability-contract.js';

export function runCr12aSelfTest() {
  const results=[];
  const check=(name,fn)=>{try{results.push({name,pass:!!fn()});}catch(error){results.push({name,pass:false,error:String(error?.message||error)});}};
  const rejects=fn=>{try{fn();return false;}catch{return true;}};

  check('states-are-exact-and-complete',()=>JSON.stringify(TraversabilityContract.states)===JSON.stringify(['TRAVERSABLE','BLOCKED']));
  check('default-is-traversable',()=>{const c=TraversabilityContract.define();return c.state==='TRAVERSABLE'&&c.traversable===true;});
  check('blocked-is-not-traversable',()=>{const c=TraversabilityContract.define({state:'BLOCKED'});return c.state==='BLOCKED'&&c.traversable===false;});
  check('state-normalization-is-deterministic',()=>TraversabilityContract.define({state:' blocked '}).state==='BLOCKED');
  check('unknown-state-is-rejected',()=>rejects(()=>TraversabilityContract.define({state:'SWAMP'})));
  check('contract-is-frozen',()=>Object.isFrozen(TraversabilityContract.define({state:'BLOCKED'})));
  check('repeat-definition-is-deterministic',()=>JSON.stringify(TraversabilityContract.define({state:'TRAVERSABLE'}))===JSON.stringify(TraversabilityContract.define({state:'TRAVERSABLE'})));
  check('cr12a-has-no-cell-source-pathfinder-or-reroute-policy',()=>{const text=TraversabilityContract.define.toString().toLowerCase();return !text.includes('cell')&&!text.includes('pathfinder')&&!text.includes('route')&&!text.includes('reroute')&&!text.includes('obstacle');});

  return Object.freeze({pass:results.every(r=>r.pass),results:Object.freeze(results.map(Object.freeze))});
}
