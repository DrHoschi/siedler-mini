import { runCr21cSelfTest } from './cr-21c-self-test.js?v=cr21c-1';
const report=runCr21cSelfTest();
const el=document.querySelector('#test-status');
if(el)el.textContent=report.pass?'CR-21C RESERVATION-CONTROLLED STEP MOVEMENT INTEGRATION: PASS / 0 BLOCKER':`CR-21C RESERVATION-CONTROLLED STEP MOVEMENT INTEGRATION: FAIL / ${report.blockerCount} BLOCKER`;
console.info('[CR-21C]',report);
