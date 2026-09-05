import { runCr26aSelfTest } from './cr-26a-self-test.js';
const report = runCr26aSelfTest();
console.log(`CR-26A PERSON WORKFORCE PROFILE CONTRACT: ${report.pass ? 'PASS' : 'FAIL'} / ${report.blockerCount} BLOCKER`);
if (!report.pass) {
  for (const result of report.results.filter(result => !result.pass)) console.error(result);
  process.exitCode = 1;
}
