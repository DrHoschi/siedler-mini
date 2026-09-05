import { runCr22aFreezeGate } from './cr-22a-freeze-gate.js?v=cr22a-freeze-1';
const report = runCr22aFreezeGate();
const el = document.querySelector('#test-status');
if (el) el.textContent = report.pass
  ? 'CR-22A BUILDING IDENTITY & OWNERSHIP CONTRACT FREEZE GATE: PASS / 0 BLOCKER'
  : `CR-22A BUILDING IDENTITY & OWNERSHIP CONTRACT FREEZE GATE: FAIL / ${report.blockerCount} BLOCKER`;
console.info('[CR-22A FREEZE]', report);
