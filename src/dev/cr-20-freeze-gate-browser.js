import { runCr20FreezeGate } from './cr-20-freeze-gate.js?v=cr20-freeze-1';
const report=runCr20FreezeGate();const el=document.querySelector('#test-status');if(el)el.textContent=report.pass?'CR-20 RESERVATION LIFECYCLE FOUNDATION: FROZEN / PASS / 0 BLOCKER':`CR-20 RESERVATION LIFECYCLE FOUNDATION FREEZE GATE: FAIL / ${report.blockerCount} BLOCKER`;console.info('[CR-20 FREEZE]',report);
