import { projectPlayerOperationalState, PlayerOperationalStateProjection } from '../ui/player-operational-state-projection.js';

export function runIM18GSelfTest() {
  const results=[]; const check=(name,fn)=>{try{results.push(Object.freeze({name,pass:!!fn()}));}catch(error){results.push(Object.freeze({name,pass:false,error:String(error?.message||error)}));}}; const rejects=fn=>{try{fn();return false;}catch{return true;}};
  const buildingId='building:00000001';
  const admission=Object.freeze({kind:'operational-building-admission',buildingId,status:'OPERATIONAL'});
  const assigned=Object.freeze({kind:'operational-building-workforce-assignment',buildingId,status:'ASSIGNED'});
  const rejected=Object.freeze({kind:'operational-building-workforce-assignment',buildingId,status:'REJECTED'});
  const blocked=Object.freeze({kind:'operational-production-execution',buildingId,status:'BLOCKED_INPUT'});
  const ready=Object.freeze({kind:'operational-production-execution',buildingId,status:'READY'});
  const settlement=Object.freeze({kind:'input-consumption-output-settlement',buildingId,settlementId:'production-settlement:00000001'});
  check('projects-no-worker-read-only',()=>projectPlayerOperationalState({operationalAdmission:admission,workforceAssignment:rejected}).status==='NO_WORKER');
  check('projects-waiting-for-input-read-only',()=>projectPlayerOperationalState({operationalAdmission:admission,workforceAssignment:assigned,execution:blocked}).status==='WAITING_FOR_INPUT');
  check('projects-ready-to-produce-read-only',()=>projectPlayerOperationalState({operationalAdmission:admission,workforceAssignment:assigned,execution:ready}).status==='READY_TO_PRODUCE');
  check('projects-production-settled-read-only',()=>{const p=projectPlayerOperationalState({operationalAdmission:admission,workforceAssignment:assigned,execution:ready,settlement});return p.status==='PRODUCTION_SETTLED'&&p.settlementId===settlement.settlementId;});
  check('rejects-inconsistent-authoritative-chain',()=>rejects(()=>projectPlayerOperationalState({operationalAdmission:admission,workforceAssignment:rejected,execution:ready}))&&rejects(()=>projectPlayerOperationalState({operationalAdmission:admission,workforceAssignment:assigned,execution:blocked,settlement})));
  check('projection-has-zero-mutation-authority',()=>Object.values(PlayerOperationalStateProjection.capabilities).every(value=>value===false)&&typeof PlayerOperationalStateProjection.assign==='undefined'&&typeof PlayerOperationalStateProjection.execute==='undefined'&&typeof PlayerOperationalStateProjection.settle==='undefined');
  const blockerCount=results.filter(r=>!r.pass).length; return Object.freeze({pass:blockerCount===0,blockerCount,results:Object.freeze(results)});
}
