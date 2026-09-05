import { runCr22bSelfTest } from './cr-22b-self-test.js?v=cr22b-1';

const report = runCr22bSelfTest();
const el = document.querySelector('#test-status');
if (el) {
  el.textContent = report.pass
    ? 'CR-22B BUILDING LIFECYCLE STATE CONTRACT: PASS / 0 BLOCKER'
    : `CR-22B BUILDING LIFECYCLE STATE CONTRACT: FAIL / ${report.blockerCount} BLOCKER`;
}
console.info('[CR-22B]', report);
