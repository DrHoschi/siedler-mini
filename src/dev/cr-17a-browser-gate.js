import { runCr17aSelfTest } from './cr-17a-self-test.js?v=cr17a-1';
const report=runCr17aSelfTest();
const testEl=document.querySelector('#test-status');
if(testEl) testEl.textContent=report.pass
  ? 'CR-17A YIELD / RECOVERY INTENT CONTRACT: PASS / 0 BLOCKER'
  : `CR-17A YIELD / RECOVERY INTENT CONTRACT: FAIL / ${report.blockerCount} BLOCKER`;
console.info('[CR-17A] Yield / Recovery Intent Contract',report);
