import { runCr19cSelfTest } from './cr-19c-self-test.js?v=cr19c-1';
const report=runCr19cSelfTest();
const el=document.querySelector('#test-status');
if(el) el.textContent=report.pass?'CR-19C RESERVATION ↔ MOVEMENT INTEGRATION: PASS / 0 BLOCKER':`CR-19C RESERVATION ↔ MOVEMENT INTEGRATION: FAIL / ${report.blockerCount} BLOCKER`;
console.info('[CR-19C]',report);
