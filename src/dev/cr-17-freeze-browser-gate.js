import { runCr17FreezeGate } from './cr-17-freeze-gate.js?v=cr17-freeze-1';
const report=runCr17FreezeGate();
const el=document.querySelector('#test-status');
if(el)el.textContent=report.pass?'CR-17 DEADLOCK RECOVERY FOUNDATION FREEZE GATE: PASS / 0 BLOCKER':`CR-17 DEADLOCK RECOVERY FOUNDATION FREEZE GATE: FAIL / ${report.blockerCount} BLOCKER`;
console.info('[CR-17] Deadlock Recovery Foundation Freeze Gate',report);
