import { runCr17cSelfTest } from './cr-17c-self-test.js?v=cr17c-1';
const report=runCr17cSelfTest();const el=document.querySelector('#test-status');if(el)el.textContent=report.pass?'CR-17C CONTROLLED RECOVERY MOVEMENT INTEGRATION: PASS / 0 BLOCKER':`CR-17C CONTROLLED RECOVERY MOVEMENT INTEGRATION: FAIL / ${report.blockerCount} BLOCKER`;console.info('[CR-17C]',report);
