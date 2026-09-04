import { runCr21FreezeGate } from './cr-21-freeze-gate.js?v=precr22-cleanup-1';
const report=runCr21FreezeGate();
const el=document.querySelector('#test-status');
if(el){
 el.textContent=report.pass
  ? 'PRE-CR22 CLEANUP: FILE / ARCHITECTURE PASS · BRANCH CLEANUP PENDING'
  : `PRE-CR22 CLEANUP: CR-21 REGRESSION FAIL / ${report.blockerCount} BLOCKER`;
}
console.info('[PRE-CR22 CLEANUP]',{cr21:report,branchCleanup:'PENDING'});
