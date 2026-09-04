import { runCr21FreezeGate } from './cr-21-freeze-gate.js?v=cr21-freeze-1';
const report=runCr21FreezeGate();
const el=document.querySelector('#test-status');
if(el)el.textContent=report.pass?'CR-21 RESERVATION-CONTROLLED TRAFFIC EXECUTION FOUNDATION FREEZE GATE: PASS / 0 BLOCKER':`CR-21 RESERVATION-CONTROLLED TRAFFIC EXECUTION FOUNDATION FREEZE GATE: FAIL / ${report.blockerCount} BLOCKER`;
console.info('[CR-21 FREEZE]',report);
