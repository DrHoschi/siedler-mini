import { runCr22cSelfTest } from './cr-22c-self-test.js?v=cr22c-1';
const report = runCr22cSelfTest();
const el = document.querySelector('#test-status');
if (el) el.textContent = report.pass
  ? 'CR-22C BUILDING REGISTRATION & WORLD OWNERSHIP INTEGRATION: PASS / 0 BLOCKER'
  : `CR-22C BUILDING REGISTRATION & WORLD OWNERSHIP INTEGRATION: FAIL / ${report.blockerCount} BLOCKER`;
console.info('[CR-22C]', report);
