import { runCr22aSelfTest } from './cr-22a-self-test.js?v=cr22a-1';

const report = runCr22aSelfTest();
const el = document.querySelector('#test-status');

if (el) {
  el.textContent = report.pass
    ? 'CR-22A BUILDING IDENTITY & OWNERSHIP CONTRACT: PASS / 0 BLOCKER'
    : `CR-22A BUILDING IDENTITY & OWNERSHIP CONTRACT: FAIL / ${report.blockerCount} BLOCKER`;
}

console.info('[CR-22A]', report);
