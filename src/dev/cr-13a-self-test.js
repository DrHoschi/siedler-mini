import { RouteValidityContract } from '../transport/route-validity-contract.js';

export function runCr13aSelfTest() {
  const results=[];
  const check=(name,fn)=>{try{results.push({name,pass:!!fn()});}catch(error){results.push({name,pass:false,error:String(error?.message||error)});}};

  check('states-are-exact-and-ordered',()=>JSON.stringify(RouteValidityContract.states)===JSON.stringify(['VALID','STALE','INVALID']));
  check('default-is-valid',()=>RouteValidityContract.define().state==='VALID');
  check('valid-is-usable',()=>{const v=RouteValidityContract.define({state:'VALID'});return v.usable===true&&v.requiresEvaluation===false&&v.invalid===false;});
  check('stale-requires-evaluation',()=>{const v=RouteValidityContract.define({state:' stale '});return v.state==='STALE'&&v.usable===false&&v.requiresEvaluation===true&&v.invalid===false;});
  check('invalid-is-not-usable',()=>{const v=RouteValidityContract.define({state:'invalid'});return v.state==='INVALID'&&v.usable===false&&v.requiresEvaluation===false&&v.invalid===true;});
  check('unknown-state-is-rejected',()=>{try{RouteValidityContract.define({state:'BLOCKED'});return false;}catch(error){return error instanceof TypeError;}});
  check('contract-output-is-immutable',()=>Object.isFrozen(RouteValidityContract.define({state:'VALID'}))&&Object.isFrozen(RouteValidityContract.states));
  check('contract-is-deterministic',()=>JSON.stringify(RouteValidityContract.define({state:'STALE'}))===JSON.stringify(RouteValidityContract.define({state:'STALE'})));
  check('cr13a-adds-no-evaluation-or-rerouting',()=>{
    const text=RouteValidityContract.toString().toLowerCase();
    return !text.includes('blockedcell')&&!text.includes('pathfinder')&&!text.includes('reroute')&&!text.includes('movement');
  });

  const blockerCount=results.filter(r=>!r.pass).length;
  return Object.freeze({pass:blockerCount===0,blockerCount,results:Object.freeze(results.map(Object.freeze))});
}
