import { runCr23bSelfTest } from './cr-23b-self-test.js';
const report = runCr23bSelfTest();
console.log(`CR-23B RESIDENT ↔ HOME ASSIGNMENT CONTRACT: ${report.pass ? 'PASS' : 'FAIL'} / ${report.blockerCount} BLOCKER`);
if (!report.pass) {
  for (const result of report.results.filter(result => !result.pass)) console.error(result);
  process.exitCode = 1;
}
