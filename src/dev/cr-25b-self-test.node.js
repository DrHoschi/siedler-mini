import { runCr25bSelfTest } from './cr-25b-self-test.js';
const report = runCr25bSelfTest();
console.log(`CR-25B DETERMINISTIC BUILDINGSTOCK MUTATION: ${report.pass ? 'PASS' : 'FAIL'} / ${report.blockerCount} BLOCKER`);
if (!report.pass) {
  for (const result of report.results.filter(result => !result.pass)) console.error(result);
  process.exitCode = 1;
}
