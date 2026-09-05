import { runCr22bFreezeGate } from './cr-22b-freeze-gate.js?v=cr22b-freeze-1';
const report = runCr22bFreezeGate();
const el = document.querySelector('#test-status');
if (el) el.textContent = report.pass
  ? 'CR-22B BUILDING LIFECYCLE STATE CONTRACT FREEZE GATE: PASS / 0 BLOCKER'
  : `CR-22B BUILDING LIFECYCLE STATE CONTRACT FREEZE GATE: FAIL / ${report.blockerCount} BLOCKER`;
console.info('[CR-22B FREEZE]', report);
