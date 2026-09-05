import { runCr22cFreezeGate } from './cr-22c-freeze-gate.js?v=cr22c-freeze-1';
const report = runCr22cFreezeGate();
const el = document.querySelector('#test-status');
if (el) el.textContent = report.pass
  ? 'CR-22C BUILDING REGISTRATION & WORLD OWNERSHIP INTEGRATION FREEZE GATE: PASS / 0 BLOCKER'
  : `CR-22C BUILDING REGISTRATION & WORLD OWNERSHIP INTEGRATION FREEZE GATE: FAIL / ${report.blockerCount} BLOCKER`;
console.info('[CR-22C FREEZE]', report);
