import { DeterministicDeadlockResolutionPolicy } from '../transport/deterministic-deadlock-resolution-policy.js';
import { YieldRecoveryIntentContract } from '../transport/yield-recovery-intent-contract.js';

export function runCr17aSelfTest() {
  const results=[];
  const check=(name,fn)=>{try{results.push({name,pass:!!fn()});}catch(error){results.push({name,pass:false,error:String(error?.message||error)});}};
  const rejects=fn=>{try{fn();return false;}catch{return true;}};
  const deadlock=Object.freeze({kind:'deadlock',carrierIds:Object.freeze(['unit:00000001','unit:00000002']),dependencyCount:2});
  const decision=DeterministicDeadlockResolutionPolicy.decide(deadlock);

  check('cr16c-yielder-can-be-expressed-as-pending-recovery-intent',()=>{
    const intent=YieldRecoveryIntentContract.define({carrierId:decision.yieldingCarrierId,triggeringDeadlock:deadlock,resolutionDecision:decision});
    return intent.kind==='yield-recovery-intent'&&intent.carrierId==='unit:00000002'&&intent.status==='PENDING'&&intent.resolutionStrategy==='HIGHEST_STABLE_ID_YIELDS';
  });
  check('triggering-deadlock-is-canonical-and-immutable',()=>{
    const reversed=Object.freeze({kind:'deadlock',carrierIds:Object.freeze(['unit:00000002','unit:00000001']),dependencyCount:2});
    const reversedDecision=DeterministicDeadlockResolutionPolicy.decide(reversed);
    const intent=YieldRecoveryIntentContract.define({carrierId:reversedDecision.yieldingCarrierId,triggeringDeadlock:reversed,resolutionDecision:reversedDecision});
    return intent.triggeringDeadlock.carrierIds.join('|')==='unit:00000001|unit:00000002'&&Object.isFrozen(intent)&&Object.isFrozen(intent.triggeringDeadlock)&&Object.isFrozen(intent.triggeringDeadlock.carrierIds);
  });
  check('non-yielding-carrier-cannot-receive-intent',()=>rejects(()=>YieldRecoveryIntentContract.define({carrierId:'unit:00000001',triggeringDeadlock:deadlock,resolutionDecision:decision})));
  check('invalid-deadlock-or-resolution-is-rejected',()=>rejects(()=>YieldRecoveryIntentContract.define({carrierId:decision.yieldingCarrierId,triggeringDeadlock:null,resolutionDecision:decision}))&&rejects(()=>YieldRecoveryIntentContract.define({carrierId:decision.yieldingCarrierId,triggeringDeadlock:deadlock,resolutionDecision:null})));
  check('cr17a-only-defines-pending-intent',()=>rejects(()=>YieldRecoveryIntentContract.define({carrierId:decision.yieldingCarrierId,triggeringDeadlock:deadlock,resolutionDecision:decision,status:'ACTIVE'})));
  check('cr17a-adds-no-target-movement-or-rerouting-semantics',()=>{
    const text=YieldRecoveryIntentContract.toString().toLowerCase();
    return !text.includes('targetcell')&&!text.includes('move(')&&!text.includes('reroute')&&!text.includes('waypoint')&&!text.includes('retreat')&&!text.includes('reverse');
  });

  const blockerCount=results.filter(r=>!r.pass).length;
  return Object.freeze({pass:blockerCount===0,blockerCount,results:Object.freeze(results.map(Object.freeze))});
}
