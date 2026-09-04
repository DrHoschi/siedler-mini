import { runCr17bSelfTest } from './cr-17b-self-test.js?v=cr17b-1';
const report=runCr17bSelfTest();
const testEl=document.querySelector('#test-status');
if(testEl) testEl.textContent=report.pass
  ? 'CR-17B DETERMINISTIC RECOVERY TARGET SELECTION: PASS / 0 BLOCKER'
  : `CR-17B DETERMINISTIC RECOVERY TARGET SELECTION: FAIL / ${report.blockerCount} BLOCKER`;
console.info('[CR-17B] Deterministic Recovery Target Selection',report);
