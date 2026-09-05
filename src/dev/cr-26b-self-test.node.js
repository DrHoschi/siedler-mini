import { runCr26bSelfTest } from './cr-26b-self-test.js';
const report = runCr26bSelfTest();
console.log(`CR-26B WORKFORCE AVAILABILITY ASSIGNMENT STATE: ${report.pass ? 'PASS' : 'FAIL'} / ${report.blockerCount} BLOCKER`);
if (!report.pass) {
  for (const result of report.results.filter(result => !result.pass)) console.error(result);
  process.exitCode = 1;
}
