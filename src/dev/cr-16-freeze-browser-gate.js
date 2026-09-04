import { runCr16FreezeGate } from './cr-16-freeze-gate.js?v=cr16-freeze-2';

const report=runCr16FreezeGate();
const testEl=document.querySelector('#test-status');
if(testEl) testEl.textContent=report.pass
  ? 'CR-16 TRAFFIC DEADLOCK FOUNDATION FREEZE GATE: PASS / 0 BLOCKER'
  : `CR-16 TRAFFIC DEADLOCK FOUNDATION FREEZE GATE: FAIL / ${report.blockerCount} BLOCKER`;
console.info('[CR-16] Traffic Deadlock Foundation Freeze Gate',report);
