import { runCr20aSelfTest } from './cr-20a-self-test.js?v=cr20a-1';

const report=runCr20aSelfTest();
const el=document.querySelector('#test-status');
if(el)el.textContent=report.pass?'CR-20A RESERVATION LIFECYCLE STATE CONTRACT: PASS / 0 BLOCKER':`CR-20A RESERVATION LIFECYCLE STATE CONTRACT: FAIL / ${report.blockerCount} BLOCKER`;
console.info('[CR-20A]',report);
