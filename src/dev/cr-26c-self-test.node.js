import { runCr26cSelfTest } from './cr-26c-self-test.js';
const report = runCr26cSelfTest();
console.log(`CR-26C DETERMINISTIC JOB ELIGIBILITY & ASSIGNMENT SELECTION: ${report.pass ? 'PASS' : 'FAIL'} / ${report.blockerCount} BLOCKER`);
if (!report.pass) {
  for (const result of report.results.filter(result => !result.pass)) console.error(result);
  process.exitCode = 1;
}
